const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Лимит тела запроса и настройки лимитов
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 20 * 1024 * 1024; // 20 МБ (коллекция со сжатыми фото)
const MAX_DRINKS_PER_SYNC = 5000;
const MAX_IMAGE_LENGTH = 10 * 1024 * 1024; // 10 МБ на одну base64-картинку

const PORT = Number(process.env.PORT) || 3000;
const TOKEN_TTL = process.env.JWT_TTL || '30d';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'energy_hunter.db');
const SECRET_FILE = path.join(__dirname, '.jwt_secret');
const SALT_ROUNDS = 10;
const RATING_CRITERIA = ['taste', 'effect', 'design', 'value'];

app.use(express.json({ limit: MAX_BODY_BYTES })); // Optimized limit for base64 images

// --- Секрет для JWT ---
// Если JWT_SECRET не задан, генерируем случайный и сохраняем в файл рядом с БД:
// раньше использовалось публичное значение по умолчанию, из-за которого токены подделывались.
function resolveSecretKey() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

    try {
        const stored = fs.readFileSync(SECRET_FILE, 'utf8').trim();
        if (stored.length >= 32) {
            console.warn('[warn] JWT_SECRET не задан — используется сохранённый ключ из .jwt_secret.');
            return stored;
        }
    } catch (err) { /* файла ещё нет — создадим ниже */ }

    const generated = crypto.randomBytes(48).toString('hex');
    try {
        fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
        console.warn('[warn] JWT_SECRET не задан — сгенерирован новый ключ и сохранён в .jwt_secret.');
    } catch (err) {
        console.warn('[warn] JWT_SECRET не задан и .jwt_secret недоступен — ключ будет меняться при каждом запуске.');
    }
    return generated;
}
const SECRET_KEY = resolveSecretKey();

// --- CORS ---
// По умолчанию (список не задан) разрешаем все origin, чтобы фронтенд можно было открыть
// с другого адреса. В продакшене задайте ALLOWED_ORIGINS=https://site.ru,https://www.site.ru
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

if (!ALLOWED_ORIGINS.length) {
    console.warn('[warn] ALLOWED_ORIGINS не задан — API принимает запросы с любого origin.');
    console.warn('       Для продакшена укажите ALLOWED_ORIGINS, чтобы ограничить список сайтов.');
}

app.use(cors({
    origin(origin, callback) {
        // Запросы без Origin (curl, мобильные приложения, SSR) не ограничиваем
        if (!origin) return callback(null, true);
        if (!ALLOWED_ORIGINS.length) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) return callback(null, true);
        return callback(null, false);
    }
}));

// --- Базовые заголовки безопасности (без внешних зависимостей) ---
app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

// --- Примитивный rate-limit по IP (защита от перебора паролей) ---
function createRateLimiter({ windowMs, max, message }) {
    const hits = new Map();

    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs);
    if (typeof cleanup.unref === 'function') cleanup.unref();

    return (req, res, next) => {
        const key = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
        const now = Date.now();
        const entry = hits.get(key);

        if (!entry || entry.resetAt <= now) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        entry.count += 1;
        if (entry.count > max) {
            const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ error: message || `Слишком много попыток. Повторите через ${retryAfter} с.` });
        }
        return next();
    };
}

const authRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });
const syncRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Слишком много синхронизаций. Подождите минуту.' });


// Database Setup
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error(err.message);
    else console.log(`Connected to SQLite database: ${DB_PATH}`);
});

db.on('error', (err) => console.error('[sqlite]', err.message));

// --- Promises-обёртки над sqlite3, чтобы не плодить вложенные колбэки ---
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});

// Транзакции выполняем строго по одной: у sqlite3 одно общее соединение, поэтому
// параллельные BEGIN IMMEDIATE падали с "cannot start a transaction within a transaction",
// а ROLLBACK из catch мог откатить чужую незавершённую транзакцию.
let transactionChain = Promise.resolve();

async function withTransaction(work) {
    const execute = async () => {
        await run('BEGIN IMMEDIATE');
        try {
            const result = await work();
            await run('COMMIT');
            return result;
        } catch (err) {
            try { await run('ROLLBACK'); } catch (rollbackErr) { console.error('[sqlite] rollback failed:', rollbackErr.message); }
            throw err;
        }
    };

    const result = transactionChain.then(execute);
    transactionChain = result.catch(() => { /* ошибка уже обработана вызывающим кодом */ });
    return result;
}

// --- Нормализация входных данных (защита от мусора из облака/импорта) ---
const cleanString = (value, maxLength = 120) =>
    typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const cleanNumber = (value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) => {
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
};

// Сахар: пустая строка / null / undefined → NULL («не указано»), 0 → 0 г.
// Раньше cleanNumber('') давал 0 и стирал различие после синхронизации.
const cleanSugar = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return null;
    return Math.min(100000, Math.max(0, num));
};

const cleanDate = (value) => {
    const str = cleanString(value, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : new Date().toISOString().slice(0, 10);
};

// Картинку нельзя обрезать: обрезанный base64 превращался в битое изображение.
// Слишком большие значения просто отбрасываем (фронтенд потом сообщит об этом пользователю).
const cleanImage = (value) => {
    if (typeof value !== 'string') return null;
    const image = value.trim();
    if (!image) return null;
    if (image.length > MAX_IMAGE_LENGTH) return null;
    return image;
};

// Логин: буквы (латиница/кириллица), цифры, _ - . ; 3–32 символа
const USERNAME_RE = /^[a-zA-Zа-яА-ЯёЁ0-9_\-.]{3,32}$/;

const safeJsonParse = (raw, fallback) => {
    if (raw === null || raw === undefined || raw === '') return fallback;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (err) { return fallback; }
};

const cleanRating = (raw) => {
    if (raw === null || raw === undefined || raw === '') return 0;
    if (typeof raw === 'object') {
        const rating = {};
        RATING_CRITERIA.forEach(key => { rating[key] = cleanNumber(raw[key], { min: 0, max: 5, fallback: 0 }); });
        return rating;
    }
    return cleanNumber(raw, { min: 0, max: 5, fallback: 0 });
};

// --- Схема БД ---
const DRINKS_COLUMNS = ['id', 'user_id', 'name', 'flavor', 'status', 'date', 'rating', 'notes', 'image', 'volume', 'caffeine', 'sugar', 'price', 'store'];

const createDrinksTableSql = (tableName = 'drinks') => `CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        flavor TEXT,
        status TEXT,
        date TEXT,
        rating TEXT,
        notes TEXT,
        image TEXT,
        volume REAL,
        caffeine REAL,
        sugar REAL,
        price REAL,
        store TEXT,
        PRIMARY KEY (user_id, id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`;

// В старой схеме id был глобальным PRIMARY KEY, поэтому запись с уже существующим id
// перезаписывала чужую строку (INSERT OR REPLACE менял user_id) — данные исчезали.
// Миграция привязывает ключ к пользователю.
async function migrateDrinksSchema() {
    const columns = await all('PRAGMA table_info(drinks)');
    if (!columns.length) return; // таблицы ещё нет — создастся сразу с новой схемой

    const pkColumns = columns
        .filter(c => c.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map(c => c.name);

    if (pkColumns.length === 2 && pkColumns[0] === 'user_id' && pkColumns[1] === 'id') return; // схема уже актуальна

    console.log(`[migrate] Перестраиваю таблицу drinks: PRIMARY KEY (${pkColumns.join(', ')}) -> (user_id, id)`);

    await withTransaction(async () => {
        await run(createDrinksTableSql('drinks_migrated'));
        const columnsList = DRINKS_COLUMNS.join(', ');
        const copied = await run(`INSERT OR IGNORE INTO drinks_migrated (${columnsList}) SELECT ${columnsList} FROM drinks`);
        await run('DROP TABLE drinks');
        await run('ALTER TABLE drinks_migrated RENAME TO drinks');
        console.log(`[migrate] Перенесено записей: ${copied.changes}`);
    });

    console.log('[migrate] Готово');
}

async function initDatabase() {
    await run('PRAGMA foreign_keys = ON');

    await run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await migrateDrinksSchema();
    await run(createDrinksTableSql());
    await run('CREATE INDEX IF NOT EXISTS idx_drinks_user ON drinks(user_id)');

    // Staging-таблица для безопасной многочастной синхронизации:
    // чанки пишутся сюда, в основную таблицу данные попадают только при isFinal.
    await run(createDrinksTableSql('drinks_staging'));
    await run('CREATE INDEX IF NOT EXISTS idx_drinks_staging_user ON drinks_staging(user_id)');
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Токен недействителен или истёк' });
        req.user = user;
        next();
    });
};

const signToken = (user) => jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: TOKEN_TTL });

// Routes
// 0. Health-check (используется фронтендом для проверки доступности облака)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

// 1. Register
app.post('/api/register', authRateLimiter, async (req, res) => {
    const username = cleanString(req.body && req.body.username, 32);
    const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';

    if (!username || !password) return res.status(400).json({ error: 'Укажите имя пользователя и пароль' });
    if (!USERNAME_RE.test(username)) {
        return res.status(400).json({
            error: 'Имя: 3–32 символа, только буквы (латиница/кириллица), цифры, _ - .'
        });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    if (password.length > 200) return res.status(400).json({ error: 'Пароль слишком длинный (максимум 200 символов)' });

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        const user = { id: result.lastID, username };
        // Сразу выдаём токен, чтобы фронтенд мог войти без повторного ввода пароля
        res.status(201).json({ message: 'User registered successfully', userId: user.id, username: user.username, token: signToken(user) });
    } catch (err) {
        if (String(err.message).includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Такое имя пользователя уже занято' });
        }
        console.error('[register]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 2. Login
app.post('/api/login', authRateLimiter, async (req, res) => {
    const username = cleanString(req.body && req.body.username, 32);
    const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';

    if (!username || !password) return res.status(400).json({ error: 'Укажите имя пользователя и пароль' });

    try {
        const user = await get('SELECT * FROM users WHERE username = ?', [username]);
        // Одинаковое сообщение при любом исходе — не даём перебирать логины
        const invalidMsg = 'Неверный логин или пароль';
        if (!user) return res.status(401).json({ error: invalidMsg });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: invalidMsg });

        res.json({ token: signToken(user), username: user.username });
    } catch (err) {
        console.error('[login]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 3. Profile Info
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const profile = await get('SELECT id, username, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!profile) return res.status(404).json({ error: 'Пользователь не найден' });

        const stats = await get(
            `SELECT COUNT(*) as count,
                    SUM(CASE WHEN status = 'drank' THEN caffeine ELSE 0 END) as totalCaffeine,
                    SUM(CASE WHEN status = 'drank' THEN sugar ELSE 0 END) as totalSugar,
                    SUM(price) as totalSpent
             FROM drinks WHERE user_id = ?`,
            [req.user.id]
        );

        res.json({
            profile,
            stats: {
                totalDrinks: (stats && stats.count) || 0,
                totalCaffeine: Math.round((stats && stats.totalCaffeine) || 0),
                totalSugar: Math.round((stats && stats.totalSugar) || 0),
                totalSpent: Math.round((stats && stats.totalSpent) || 0)
            }
        });
    } catch (err) {
        console.error('[profile]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 4. Sync Drinks
// Безопасная многочастная синхронизация через staging:
//   isFirst  — очищает staging пользователя и пишет первый чанк
//   (середина) — дописывает в staging
//   isFinal  — атомарно заменяет drinks содержимым staging
// Если любой чанк упадёт до isFinal, основная таблица drinks не трогается.
// Обратная совместимость: mode=replace/append без isFirst/isFinal работает как раньше (один запрос).
app.post('/api/sync', syncRateLimiter, authenticateToken, async (req, res) => {
    const incoming = req.body && req.body.drinks;

    if (!Array.isArray(incoming)) {
        return res.status(400).json({ error: 'Некорректный формат данных: ожидается массив drinks' });
    }
    if (incoming.length > MAX_DRINKS_PER_SYNC) {
        return res.status(413).json({ error: `Слишком много записей за один раз (максимум ${MAX_DRINKS_PER_SYNC})` });
    }

    const prepared = [];
    let droppedImages = 0;

    for (const raw of incoming) {
        if (!raw || typeof raw !== 'object') continue;
        const name = cleanString(raw.name, 120);
        if (!name) continue;

        const image = cleanImage(raw.image);
        if (!image && raw.image) droppedImages += 1;

        prepared.push([
            cleanString(raw.id, 64) || crypto.randomUUID(),
            req.user.id,
            name,
            cleanString(raw.flavor, 120),
            raw.status === 'collection' ? 'collection' : 'drank',
            cleanDate(raw.date),
            JSON.stringify(cleanRating(raw.rating)),
            cleanString(raw.notes, 2000),
            image,
            cleanNumber(raw.volume, { max: 100 }),
            cleanNumber(raw.caffeine, { max: 100000 }),
            cleanSugar(raw.sugar),
            cleanNumber(raw.price, { max: 100000000 }),
            cleanString(raw.store, 120)
        ]);
    }

    const body = req.body || {};
    // Новый протокол (чанковая синхронизация с staging)
    const useStaging = body.isFirst === true || body.isFinal === true || body.useStaging === true;
    // Старый протокол (один запрос / legacy append)
    const mode = body.mode === 'append' ? 'append' : 'replace';

    const insertSql = (table) =>
        `INSERT OR REPLACE INTO ${table}
         (id, user_id, name, flavor, status, date, rating, notes, image, volume, caffeine, sugar, price, store)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        if (useStaging) {
            await withTransaction(async () => {
                if (body.isFirst) {
                    await run('DELETE FROM drinks_staging WHERE user_id = ?', [req.user.id]);
                }
                for (const row of prepared) {
                    await run(insertSql('drinks_staging'), row);
                }
                if (body.isFinal) {
                    // Атомарная подмена: основная копия меняется только здесь
                    await run('DELETE FROM drinks WHERE user_id = ?', [req.user.id]);
                    await run(
                        `INSERT INTO drinks (${DRINKS_COLUMNS.join(', ')})
                         SELECT ${DRINKS_COLUMNS.join(', ')} FROM drinks_staging WHERE user_id = ?`,
                        [req.user.id]
                    );
                    await run('DELETE FROM drinks_staging WHERE user_id = ?', [req.user.id]);
                }
            });

            res.json({
                message: body.isFinal ? 'Data synced successfully' : 'Chunk accepted',
                mode: 'staging',
                isFirst: !!body.isFirst,
                isFinal: !!body.isFinal,
                count: prepared.length,
                skipped: incoming.length - prepared.length,
                droppedImages
            });
            return;
        }

        // Legacy: один запрос replace/append напрямую в drinks
        await withTransaction(async () => {
            if (mode === 'replace') {
                await run('DELETE FROM drinks WHERE user_id = ?', [req.user.id]);
            }
            for (const row of prepared) {
                await run(insertSql('drinks'), row);
            }
        });

        res.json({
            message: 'Data synced successfully',
            mode,
            count: prepared.length,
            skipped: incoming.length - prepared.length,
            droppedImages
        });
    } catch (err) {
        console.error('[sync]', err);
        res.status(500).json({ error: 'Не удалось сохранить данные в облаке' });
    }
});

// 5. Get Drinks (Pull from server)
app.get('/api/drinks', authenticateToken, async (req, res) => {
    try {
        const rows = await all('SELECT * FROM drinks WHERE user_id = ? ORDER BY date DESC', [req.user.id]);

        // Format them back to match frontend structure
        // sugar: NULL в БД → '' на клиенте («не указано»), 0 остаётся 0
        const formatted = rows.map(r => ({
            id: r.id,
            name: r.name,
            flavor: r.flavor,
            status: r.status,
            date: r.date,
            rating: safeJsonParse(r.rating, 0),
            notes: r.notes,
            image: r.image,
            volume: r.volume,
            caffeine: r.caffeine,
            sugar: r.sugar === null || r.sugar === undefined ? '' : r.sugar,
            price: r.price,
            store: r.store
        }));

        res.json({ drinks: formatted });
    } catch (err) {
        console.error('[drinks]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 6. Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    // Считаем только выпитое: коллекция — это не «охотничий» результат
    const query = `
        SELECT users.id, users.username, COUNT(drinks.id) as drink_count
        FROM users
        LEFT JOIN drinks ON users.id = drinks.user_id AND drinks.status = 'drank'
        GROUP BY users.id, users.username
        ORDER BY drink_count DESC, users.username ASC
        LIMIT 50
    `;

    try {
        const rows = await all(query);
        res.json({ leaderboard: rows });
    } catch (err) {
        console.error('[leaderboard]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 404 + единый обработчик ошибок (клиент всегда получает JSON, а не HTML-стек)
app.use((req, res) => {
    res.status(404).json({ error: 'Метод не найден' });
});

app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
        const limitMb = Math.round(MAX_BODY_BYTES / (1024 * 1024));
        return res.status(413).json({ error: `Слишком большой объём данных (максимум ${limitMb} МБ)` });
    }
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Некорректный JSON в запросе' });
    }
    console.error('[error]', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Сервер поднимаем только после инициализации схемы (включая миграцию)
let server = null;

async function start() {
    try {
        await initDatabase();
    } catch (err) {
        console.error('[startup] Не удалось подготовить базу данных:', err);
        process.exit(1);
    }

    server = app.listen(PORT, () => {
        console.log(`Backend running on http://localhost:${PORT}`);
    });
}

// Аккуратное завершение: закрываем сервер и БД
function shutdown(signal) {
    console.log(`\n${signal} получен — завершаем работу...`);
    if (!server) {
        db.close(() => process.exit(0));
        return;
    }
    server.close(() => {
        db.close((err) => {
            if (err) console.error('[sqlite] close error:', err.message);
            process.exit(0);
        });
    });
    setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
