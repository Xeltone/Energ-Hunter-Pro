const STORAGE_KEY = 'energy_drinks_v5';
const DB_NAME = 'EnergyHunterDB';
const STORE_NAME = 'appData';

const EnergyDB = {
    _dbPromise: null,
    init() {
        // Соединение кешируем: раньше оно открывалось на каждую операцию и никогда не закрывалось
        if (!this._dbPromise) {
            this._dbPromise = new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
                };
                req.onsuccess = () => {
                    const db = req.result;
                    db.onversionchange = () => db.close();
                    resolve(db);
                };
                req.onerror = () => {
                    this._dbPromise = null;
                    reject(req.error);
                };
            });
        }
        return this._dbPromise;
    },
    async get(key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    async set(key, value) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            // Ждём именно завершения транзакции: переполнение квоты может отменить tx уже после успешного put
            tx.oncomplete = () => resolve();
            tx.onabort = tx.onerror = () => reject(tx.error || new Error('Транзакция IndexedDB отменена'));
            tx.objectStore(STORE_NAME).put(value, key);
        });
    }
};

let drinks = [];
let migrated = false;
let currentFilter = 'all';
let searchQuery = '';
let sortBy = 'date_desc';
let selectedRatings = { taste: 0, effect: 0, design: 0, value: 0 };
function getOverallRating(r) { 
    if (typeof r === 'number') return Math.min(5, Math.max(0, r));
    if (!r || typeof r !== 'object') return 0;
    const vals = Object.values(r).filter(v => v > 0);
    return vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)) : 0;
}
let currentImageBase64 = null;
let charts = {};

// --- Общие утилиты ---
function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        try { return window.crypto.randomUUID(); } catch (e) { /* fallback ниже */ }
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Локальная дата (YYYY-MM-DD). toISOString() давал UTC и «вчерашний» день ночью в UTC+ зонах.
function todayISO(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function pluralizeDrinks(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'банка';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'банки';
    return 'банок';
}

function formatBytes(bytes) {
    if (!bytes) return '0 Б';
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

// Ограничения те же, что и на сервере: мусор из импорта/облака не должен попадать в базу
const LIMITS = { volume: 100, caffeine: 100000, sugar: 100000, price: 100000000 };

const toNumberInRange = (value, max) => {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) return 0; // отрицательные значения больше не проходят
    return Math.min(max, num);
};

// Сахар может быть «не указан» (пустая строка) — это не то же самое, что 0 г
const sugarOrEmpty = (value) => {
    const num = parseFloat(value);
    if (value === null || value === undefined || value === '' || Number.isNaN(num)) return '';
    return Math.min(LIMITS.sugar, Math.max(0, num));
};

const isValidISODate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && todayISO(new Date(`${value}T00:00:00`)) === value;

// Дату не выдумываем: понимаем ISO (в т.ч. с временем) и «человеческие» форматы,
// непонятные строки оставляем пустыми. Общий разбор через new Date() не используем:
// V8 молча «перекатывает» некорректные даты (2026-02-30 -> 02.03.2026).
function normalizeDate(value) {
    const rawValue = typeof value === 'string' ? value.trim() : '';
    if (!rawValue) return '';

    if (isValidISODate(rawValue)) return rawValue;

    const isoWithTime = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/);
    if (isoWithTime) {
        const candidate = `${isoWithTime[1]}-${isoWithTime[2]}-${isoWithTime[3]}`;
        if (isValidISODate(candidate)) return candidate;
    }

    // 2026/1/5
    const ymd = rawValue.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
    if (ymd) {
        const candidate = `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
        if (isValidISODate(candidate)) return candidate;
    }

    // 15.01.2026, 15/01/2026, 15-01-2026
    const dmy = rawValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmy) {
        const candidate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        if (isValidISODate(candidate)) return candidate;
    }

    return '';
}

// Приводим любую запись (импорт, облако, старые данные) к единому формату
function normalizeDrink(raw) {
    const d = raw && typeof raw === 'object' ? raw : {};
    const name = typeof d.name === 'string' ? d.name.trim() : '';

    return {
        id: d.id !== undefined && d.id !== null && String(d.id).trim() ? String(d.id).trim() : generateId(),
        name,
        flavor: typeof d.flavor === 'string' ? d.flavor.trim() : '',
        status: d.status === 'collection' ? 'collection' : 'drank',
        date: normalizeDate(d.date),
        rating: (d.rating && typeof d.rating === 'object')
            ? {
                taste: parseFloat(d.rating.taste) || 0,
                effect: parseFloat(d.rating.effect) || 0,
                design: parseFloat(d.rating.design) || 0,
                value: parseFloat(d.rating.value) || 0
            }
            : (parseFloat(d.rating) || 0),
        notes: typeof d.notes === 'string' ? d.notes : '',
        image: typeof d.image === 'string' && d.image.trim() ? d.image.trim() : null,
        volume: toNumberInRange(d.volume, LIMITS.volume),
        caffeine: toNumberInRange(d.caffeine, LIMITS.caffeine),
        sugar: sugarOrEmpty(d.sugar),
        price: toNumberInRange(d.price, LIMITS.price),
        store: typeof d.store === 'string' ? d.store.trim() : ''
    };
}

function starsHtml(rating, mutedSize = '0.8rem') {
    const value = getOverallRating(rating);
    // Раньше значение округлялось до целого: 4.5/5 рисовало 5 полных звёзд.
    const full = Math.floor(value);
    const hasHalf = value - full >= 0.5;
    const empty = Math.max(0, 5 - full - (hasHalf ? 1 : 0));
    const halfStar = '<span style="background: linear-gradient(90deg, currentColor 50%, transparent 50%); -webkit-background-clip: text; background-clip: text; color: transparent;">★</span>';
    return `${'★'.repeat(full)}${hasHalf ? halfStar : ''}${'☆'.repeat(empty)} <span style="color:var(--text-muted); font-size:${mutedSize};">(${value.toFixed(1)}/5)</span>`;
}

const PRESET_DRINKS = [
    { name: 'Adrenaline Rush', flavor: 'Original', caffeine: 132, sugar: 54, volume: 0.449 },
    { name: 'Adrenaline Rush', flavor: 'Cyber Orange (Mango & Orange)', caffeine: 132, sugar: 50, volume: 0.449 },
    { name: 'Adrenaline Rush', flavor: 'Ginseng & Lime', caffeine: 132, sugar: 52, volume: 0.449 },
    { name: 'Adrenaline Rush', flavor: 'Zero Sugar', caffeine: 132, sugar: 0, volume: 0.449 },
    { name: 'Adrenaline Rush', flavor: 'Guarana Berries', caffeine: 132, sugar: 51, volume: 0.449 },
    { name: 'Adrenaline Rush', flavor: 'Orange & Mandarin', caffeine: 132, sugar: 53, volume: 0.449 },
    { name: 'Red Bull', flavor: 'Original', caffeine: 80, sugar: 27, volume: 0.25 },
    { name: 'Red Bull', flavor: 'Sugarfree', caffeine: 80, sugar: 0, volume: 0.25 },
    { name: 'Red Bull', flavor: 'Yellow Edition (Tropical)', caffeine: 80, sugar: 27, volume: 0.25 },
    { name: 'Red Bull', flavor: 'Red Edition (Watermelon)', caffeine: 80, sugar: 27, volume: 0.25 },
    { name: 'Red Bull', flavor: 'Summer Edition (Apricot & Strawberry)', caffeine: 80, sugar: 27, volume: 0.25 },
    { name: 'Red Bull', flavor: 'Blue Edition (Blueberry)', caffeine: 80, sugar: 27, volume: 0.25 },
    { name: 'Red Bull', flavor: 'Green Edition (Kiwi & Apple)', caffeine: 80, sugar: 27, volume: 0.25 },
    { name: 'Red Bull', flavor: 'White Edition (Coconut & Blueberry)', caffeine: 80, sugar: 27, volume: 0.25 },
    { name: 'Monster Energy', flavor: 'Original (Green)', caffeine: 150, sugar: 55, volume: 0.5 },
    { name: 'Monster Energy', flavor: 'Ultra White (Sugarfree)', caffeine: 150, sugar: 0, volume: 0.5 },
    { name: 'Monster Energy', flavor: 'Mango Loco', caffeine: 150, sugar: 60, volume: 0.5 },
    { name: 'Monster Energy', flavor: 'Pipeline Punch', caffeine: 150, sugar: 45, volume: 0.5 },
    { name: 'Monster Energy', flavor: 'Monarch (Peach & Nectarine)', caffeine: 150, sugar: 45, volume: 0.5 },
    { name: 'Monster Energy', flavor: 'Pacific Punch', caffeine: 150, sugar: 46, volume: 0.5 },
    { name: 'Monster Energy', flavor: 'Ultra Paradise (Kiwi & Lime Sugarfree)', caffeine: 150, sugar: 0, volume: 0.5 },
    { name: 'Monster Energy', flavor: 'Ultra Watermelon (Sugarfree)', caffeine: 150, sugar: 0, volume: 0.5 },
    { name: 'Monster Energy', flavor: 'Ultra Fiesta Mango (Sugarfree)', caffeine: 150, sugar: 0, volume: 0.5 },
    { name: 'Flash Up', flavor: 'Original', caffeine: 135, sugar: 50, volume: 0.45 },
    { name: 'Flash Up', flavor: 'Berry Mix', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'Flash Up', flavor: 'Mint & Lime', caffeine: 135, sugar: 46, volume: 0.45 },
    { name: 'Flash Up', flavor: 'Kiwi & Carambola', caffeine: 135, sugar: 47, volume: 0.45 },
    { name: 'Tornado Energy', flavor: 'Active Original', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'Tornado Energy', flavor: 'Storm (Sweet Berries)', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'Tornado Energy', flavor: 'Ice Berry', caffeine: 135, sugar: 45, volume: 0.45 },
    { name: 'Tornado Energy', flavor: 'Coconut & Mango', caffeine: 135, sugar: 45, volume: 0.45 },
    { name: 'Tornado Energy', flavor: 'Skill (Apple & Ginseng)', caffeine: 135, sugar: 47, volume: 0.45 },
    { name: 'Tornado Energy', flavor: 'Battle Cola', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'Tornado Energy', flavor: 'Bubble Gum', caffeine: 135, sugar: 49, volume: 0.45 },
    { name: 'Tornado Energy', flavor: 'Top Dog (Grapefruit)', caffeine: 135, sugar: 46, volume: 0.45 },
    { name: 'Burn', flavor: 'Original', caffeine: 150, sugar: 58, volume: 0.449 },
    { name: 'Burn', flavor: 'Apple & Kiwi', caffeine: 150, sugar: 58, volume: 0.449 },
    { name: 'Burn', flavor: 'Juicy Peach', caffeine: 150, sugar: 55, volume: 0.449 },
    { name: 'Burn', flavor: 'Dark Charge (Blueberry)', caffeine: 150, sugar: 56, volume: 0.449 },
    { name: 'Gorilla', flavor: 'Original', caffeine: 135, sugar: 55, volume: 0.45 },
    { name: 'Gorilla', flavor: 'Mango Coconut', caffeine: 135, sugar: 52, volume: 0.45 },
    { name: 'Gorilla', flavor: 'Peach Apricot', caffeine: 135, sugar: 52, volume: 0.45 },
    { name: 'Gorilla', flavor: 'Sugar Free', caffeine: 135, sugar: 0, volume: 0.45 },
    { name: 'Gorilla', flavor: 'Lychee', caffeine: 135, sugar: 53, volume: 0.45 },
    { name: 'Gorilla', flavor: 'Cherry', caffeine: 135, sugar: 54, volume: 0.45 },
    { name: 'Gorilla', flavor: 'Orange', caffeine: 135, sugar: 52, volume: 0.45 },
    { name: 'E-ON', flavor: 'Citrus Punch (Lime & Lemon)', caffeine: 135, sugar: 52, volume: 0.45 },
    { name: 'E-ON', flavor: 'Ginger Grapefruit', caffeine: 135, sugar: 50, volume: 0.45 },
    { name: 'E-ON', flavor: 'Black Power (Sour Pomegranate)', caffeine: 135, sugar: 50, volume: 0.45 },
    { name: 'Genesis', flavor: 'Purple Star (Grape)', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'Genesis', flavor: 'Yellow Star (Pineapple & Lime)', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'Genesis', flavor: 'Ruby Star (Strawberry & Guava)', caffeine: 135, sugar: 47, volume: 0.45 },
    { name: 'Volt Energy', flavor: 'Blue (Blueberry & Pomegranate)', caffeine: 135, sugar: 49, volume: 0.45 },
    { name: 'Volt Energy', flavor: 'Orange (Mango & Lime)', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'Volt Energy', flavor: 'Green (Kiwi & Apple)', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'Volt Energy', flavor: 'Yellow (Coconut & Mango)', caffeine: 135, sugar: 47, volume: 0.45 },
    { name: 'Volt Energy', flavor: 'Black Original', caffeine: 135, sugar: 50, volume: 0.45 },
    { name: 'Volt Energy', flavor: 'Zero Sugar', caffeine: 135, sugar: 0, volume: 0.45 },
    { name: 'Lit Energy', flavor: 'Original', caffeine: 150, sugar: 52, volume: 0.45 },
    { name: 'Lit Energy', flavor: 'Mango-Coconut', caffeine: 150, sugar: 49, volume: 0.45 },
    { name: 'Lit Energy', flavor: 'Blueberry', caffeine: 150, sugar: 50, volume: 0.45 },
    { name: 'Lit Energy', flavor: 'Cherry', caffeine: 150, sugar: 51, volume: 0.45 },
    { name: 'HotCat', flavor: 'Multi-Fruit', caffeine: 135, sugar: 48, volume: 0.45 },
    { name: 'HotCat', flavor: 'Barberry', caffeine: 135, sugar: 49, volume: 0.45 },
    { name: 'HotCat', flavor: 'Grapefruit', caffeine: 135, sugar: 47, volume: 0.45 }
];

const THEME_CLASSES = ['theme-cyan', 'theme-green', 'theme-purple', 'theme-orange'];
const THEME_NAMES = ['cyan', 'green', 'purple', 'orange'];

// Единственный источник истины по цветам — CSS-классы .theme-* (см. energypro.css).
// JS только переключает класс и запоминает выбор.
function applyTheme(name) {
    const theme = THEME_NAMES.includes(name) ? name : 'cyan';
    document.body.classList.remove(...THEME_CLASSES);
    document.body.classList.add(`theme-${theme}`);
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.theme === theme);
    });
    try { localStorage.setItem('energy_theme_v5', theme); } catch (e) { /* приватный режим */ }
    if (typeof refreshChartsTheme === 'function') refreshChartsTheme();
}

// Текущий цвет темы из CSS (для графиков и canvas-экспорта)
function themeColor(varName, fallback) {
    try {
        const value = getComputedStyle(document.body).getPropertyValue(varName).trim();
        return value || fallback;
    } catch (e) {
        return fallback;
    }
}

function refreshChartsTheme() {
    if (typeof Chart !== 'undefined' && Object.keys(charts).length) renderStats();
}

const ACHIEVEMENTS = [
    { id: 'first_spark', icon: '🔌', name: 'Первая искра', desc: 'Добавить 1-й энергетик' },
    { id: 'pure_energy', icon: '🧪', name: 'Чистая энергия', desc: 'Энергетик без сахара (0г сахара)' },
    { id: 'brand_lover', icon: '👑', name: 'Ценитель бренда', desc: 'Добавить 3+ вкуса одного бренда' },
    { id: 'max_charge', icon: '⭐', name: 'Максимальный заряд', desc: 'Средняя оценка напитка 4.5★ и выше' },
    { id: 'caffeine_monster', icon: '☕', name: 'Кофеиновый Монстр', desc: 'Выпито суммарно >1000 мг кофеина' },
    { id: 'investor', icon: '💰', name: 'Инвестор бодрости', desc: 'Суммарно потрачено >1000 ₽' },
    { id: 'collector', icon: '🎒', name: 'Коллекционер', desc: 'Собрать 5+ банок в коллекции' },
    { id: 'veteran', icon: '🏅', name: 'Ветеран Охоты', desc: 'Добавить 50+ энергетиков' },
    { id: 'critic', icon: '🧐', name: 'Критик', desc: 'Оценить напиток на 1★' },
    { id: 'sugar_rush', icon: '🍬', name: 'Сахарный передоз', desc: 'Напиток с >55г сахара' },
    { id: 'rich_taste', icon: '💎', name: 'Магнат бодрости', desc: 'Потратить суммарно >5000 ₽' },
    { id: 'expert_collector', icon: '🏛️', name: 'Элитный Коллекционер', desc: 'Собрать 20+ банок в коллекции' }
];

function checkAchievements() {
    const unlocked = new Set();
    if (drinks.length > 0) unlocked.add('first_spark');

    if (drinks.some(d => d.sugar === 0 && d.sugar !== '' && d.sugar !== undefined && d.sugar !== null)) {
        unlocked.add('pure_energy');
    }

    const brands = {};
    drinks.forEach(d => {
        if (!brands[d.name]) brands[d.name] = new Set();
        if (d.flavor) brands[d.name].add(d.flavor.toLowerCase());
    });
    if (Object.values(brands).some(flavors => flavors.size >= 3)) {
        unlocked.add('brand_lover');
    }

    if (drinks.some(d => getOverallRating(d.rating) >= 4.5)) {
        unlocked.add('max_charge');
    }

    let totalCaffeine = drinks.filter(d => d.status === 'drank').reduce((sum, d) => sum + (parseFloat(d.caffeine) || 0), 0);
    if (totalCaffeine > 1000) {
        unlocked.add('caffeine_monster');
    }

    let totalMoney = drinks.reduce((sum, d) => sum + (parseFloat(d.price) || 0), 0);
    if (totalMoney > 1000) {
        unlocked.add('investor');
    }
    if (totalMoney > 5000) {
        unlocked.add('rich_taste');
    }

    let collCount = drinks.filter(d => d.status === 'collection').length;
    if (collCount >= 5) {
        unlocked.add('collector');
    }
    if (collCount >= 20) {
        unlocked.add('expert_collector');
    }

    if (drinks.length >= 50) {
        unlocked.add('veteran');
    }

    if (drinks.some(d => getOverallRating(d.rating) > 0 && getOverallRating(d.rating) <= 1.5)) {
        unlocked.add('critic');
    }

    if (drinks.some(d => parseFloat(d.sugar) > 55)) {
        unlocked.add('sugar_rush');
    }

    return unlocked;
}

function getRank(count) {
    if (count >= 15) return { name: 'Властелин Молний (Lightning Overlord) ⛈️', icon: '⛈️', min: 15, max: 999 };
    if (count >= 8) return { name: 'Кофеиновый Драйвер (Caffeine Driver) 🔋', icon: '🔋', min: 8, max: 15 };
    if (count >= 3) return { name: 'Бодряк (Volt Seeker) ⚡', icon: '⚡', min: 3, max: 8 };
    return { name: 'Новичок (Energy Spark) 🔌', icon: '🔌', min: 0, max: 3 };
}

let toastTimer = null;
const showToast = (msg, type = 'info') => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.borderLeftColor = type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--accent)';
    t.classList.add('show');
    // Сбрасываем прошлый таймер, иначе новое сообщение исчезало раньше времени
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
};

async function updateStorageSize() {
    const el = document.getElementById('storageSize');
    if (!el) return;

    const bytes = new Blob([JSON.stringify(drinks)]).size;
    const localText = formatBytes(bytes);

    try {
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
            const { usage, quota } = await navigator.storage.estimate();
            if (usage && quota) {
                el.textContent = `${localText} данных (IndexedDB: ${formatBytes(usage)} из ${formatBytes(quota)})`;
                return;
            }
        }
    } catch (e) { /* оценка хранилища недоступна — показываем размер данных */ }

    el.textContent = `${localText} данных (IndexedDB)`;
}

document.getElementById('date').value = todayISO();

// Состояние авто-поиска фото в форме добавления. Объявлено до вызова initImageUpload(),
// иначе внутри обработчиков была бы мёртвая зона (TDZ) и сброс кнопки не работал.
let addFormImages = [];
let addFormImgIndex = 0;
let addFormNextBtn = null;

// Сначала инициализируем все функции, которые могут использовать DOM
initTabs();
initRating();
initImageUpload();
initControls();
initSettings();
initModalClose();
initAutocompleteAdd();
initPresetsIndex();
registerServiceWorker();

const themeKey = 'energy_theme_v5';
let savedTheme = 'cyan';
try { savedTheme = localStorage.getItem(themeKey) || 'cyan'; } catch (e) { /* приватный режим */ }
applyTheme(savedTheme);

async function initApp() {
    let rawDrinks = [];
    try {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) {
            const parsedLegacy = JSON.parse(legacy);
            if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
                rawDrinks = parsedLegacy;
                await EnergyDB.set(STORAGE_KEY, parsedLegacy);
                localStorage.removeItem(STORAGE_KEY);
                console.log('Migrated to IndexedDB');
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        if (!rawDrinks.length) {
            const stored = await EnergyDB.get(STORAGE_KEY);
            rawDrinks = Array.isArray(stored) ? stored : [];
        }
    } catch (err) {
        console.error('IDB Init error:', err);
        showToast('⚠️ Не удалось прочитать локальную базу', 'error');
        rawDrinks = [];
    }

    // Нормализуем и убираем дубликаты id — старые/битые записи больше не ломают рендер и сортировку
    const seenIds = new Set();
    drinks = rawDrinks.map(raw => {
        const normalized = normalizeDrink(raw);
        if (seenIds.has(normalized.id)) {
            normalized.id = generateId();
            migrated = true;
        }
        seenIds.add(normalized.id);
        if (!raw || !raw.id || typeof raw.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || ''))) {
            migrated = true;
        }
        return normalized;
    });

    if (migrated) {
        saveData();
    }

    render();
    updateStorageSize();
}
initApp();

const volumeSelect = document.getElementById('volume');
const volumeCustomInput = document.getElementById('volumeCustom');
volumeSelect.addEventListener('change', () => {
    volumeCustomInput.style.display = volumeSelect.value === '0' ? 'block' : 'none';
});

// Единственный обработчик вкладок: раньше их было три (переключение, профиль/рейтинг, закрытие меню)
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

            const name = tab.dataset.tab;
            const target = document.getElementById(`tab-${name}`);
            if (!target) return;
            target.classList.add('active');

            if (name === 'stats') renderStats();
            if (name === 'presets') renderPresetsIndex();
            if (name === 'settings') updateStorageSize();
            if (name === 'profile') checkAuth();
            if (name === 'leaderboard') renderLeaderboard();

            closeSidebar();
        });
    });
}

function setupAutocomplete(inputEl, listEl, onSelectCallback) {
    let highlightedIndex = -1;
    let filteredList = [];

    inputEl.addEventListener('input', () => {
        const val = inputEl.value.trim().toLowerCase();
        highlightedIndex = -1;

        if (!val) {
            listEl.style.display = 'none';
            return;
        }

        filteredList = PRESET_DRINKS.filter(d =>
            d.name.toLowerCase().includes(val) ||
            d.flavor.toLowerCase().includes(val)
        ).slice(0, 8); 

        if (filteredList.length === 0) {
            listEl.style.display = 'none';
            return;
        }

        renderSuggestions();
    });

    function renderSuggestions() {
        listEl.innerHTML = '';
        filteredList.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            if (index === highlightedIndex) {
                div.classList.add('highlighted');
            }
            div.innerHTML = `
                <strong>${escapeHtml(item.name)}</strong>
                <span class="suggestion-flavor">${escapeHtml(item.flavor)}</span>
            `;
            div.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                selectItem(item);
            });
            listEl.appendChild(div);
        });
        listEl.style.display = 'block';
    }

    function selectItem(item) {
        inputEl.value = item.name;
        listEl.style.display = 'none';
        onSelectCallback(item);
        showToast(`✨ Загружен пресет для ${item.name}!`, 'success');
    }

    inputEl.addEventListener('keydown', e => {
        if (listEl.style.display === 'none') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex + 1) % filteredList.length;
            renderSuggestions();
            scrollIntoView();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex - 1 + filteredList.length) % filteredList.length;
            renderSuggestions();
            scrollIntoView();
        } else if (e.key === 'Enter') {
            if (highlightedIndex > -1 && highlightedIndex < filteredList.length) {
                e.preventDefault();
                selectItem(filteredList[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            listEl.style.display = 'none';
        }
    });

    function scrollIntoView() {
        const activeItem = listEl.children[highlightedIndex];
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }

    inputEl.addEventListener('blur', () => {

        setTimeout(() => {
            listEl.style.display = 'none';
        }, 150);
    });
}

function initAutocompleteAdd() {
    setupAutocomplete(
        document.getElementById('name'),
        document.getElementById('autocompleteList'),
        (item) => {
            document.getElementById('flavor').value = item.flavor;
            document.getElementById('caffeine').value = item.caffeine;
            document.getElementById('sugar').value = item.sugar;

            const volSelect = document.getElementById('volume');
            const volCustom = document.getElementById('volumeCustom');
            const standardVols = [0.5, 0.44, 0.33, 0.25];

            if (standardVols.includes(item.volume)) {
                volSelect.value = item.volume;
                volCustom.style.display = 'none';
            } else {
                volSelect.value = '0';
                volCustom.style.display = 'block';
                volCustom.value = item.volume;
            }
        }
    );
}

function initRating() {
    const container = document.getElementById('starsContainer');
    container.addEventListener('click', e => {
        if (e.target.tagName !== 'SPAN') return;
        const type = e.target.parentElement.dataset.type;
        const value = parseInt(e.target.dataset.val, 10);
        // Повторный клик по той же звезде снимает оценку (раньше вернуть «без оценки» было нельзя)
        selectedRatings[type] = selectedRatings[type] === value ? 0 : value;
        updateStarsUI();
    });
    function updateStarsUI() {
        document.querySelectorAll('#starsContainer .criteria-stars').forEach(c => {
            const type = c.dataset.type;
            const val = selectedRatings[type];
            const stars = c.children;
            for (let i = 0; i < 5; i++) stars[i].classList.toggle('active', i < val);
        });
        document.getElementById('ratingVal').textContent = `${getOverallRating(selectedRatings)}/5`;
    }
}

// Сброс состояния авто-поиска (иначе после добавления остаётся кнопка и URL прошлого поиска)
function resetAddFormImages() {
    addFormImages = [];
    addFormImgIndex = 0;
    if (addFormNextBtn) {
        addFormNextBtn.textContent = '🔁 Другой вариант';
        addFormNextBtn.disabled = false;
        addFormNextBtn.style.display = 'none';
    }
}

function initImageUpload() {
    const fileInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');
    const removeBtn = document.getElementById('removeImg');
    fileInput.addEventListener('change', async e => {
        const file = e.target.files[0]; if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('❌ Выберите файл изображения', 'error');
            fileInput.value = '';
            return;
        }
        try {
            currentImageBase64 = await compressImage(file, 250, 0.65);
            preview.src = currentImageBase64;
            preview.classList.add('show');
            removeBtn.style.display = 'inline-block';
        } catch (err) {
            console.error(err);
            showToast('❌ Ошибка фото', 'error');
        }
    });
    removeBtn.addEventListener('click', () => {
        currentImageBase64 = null;
        preview.src = '';
        preview.classList.remove('show');
        removeBtn.style.display = 'none';
        fileInput.value = '';
    });

    const addAutoSearchBtn = document.getElementById('addAutoSearchBtn');
    const addNextImgBtn = document.getElementById('addNextImageBtn');
    addFormNextBtn = addNextImgBtn; // чтобы resetAddFormImages() умел её скрывать

    if (addAutoSearchBtn) {
        addAutoSearchBtn.addEventListener('click', async () => {
            const name = document.getElementById('name').value.trim();
            const flavor = document.getElementById('flavor').value.trim();
            if (!name) {
                showToast('⚠️ Сначала введите название энергетика!', 'error');
                return;
            }
            addAutoSearchBtn.textContent = '⏳ Поиск...';
            addAutoSearchBtn.disabled = true;
            if (addNextImgBtn) addNextImgBtn.style.display = 'none';

            try {
                addFormImages = await autoSearchProductImage(name, flavor);
                addFormImgIndex = 0;

                const firstUrl = addFormImages[0];
                preview.src = firstUrl;
                preview.classList.add('show');
                removeBtn.style.display = 'inline-block';

                addAutoSearchBtn.textContent = '🪄 Авто-поиск фото';
                addAutoSearchBtn.disabled = false;

                if (addFormImages.length > 1 && addNextImgBtn) {
                    addNextImgBtn.style.display = 'inline-flex';
                    showToast(`✨ Найдено вариантов: ${addFormImages.length}. Можно переключать!`, 'success');
                } else {
                    showToast('✨ Изображение найдено!', 'success');
                }

                await downloadAndProcessImage(firstUrl, false, 
                    (base64) => {
                        preview.src = base64;
                    },
                    (err) => { console.warn('Фото будет сохранено ссылкой:', err && err.message); }
                );

            } catch (err) {
                addAutoSearchBtn.textContent = '🪄 Авто-поиск фото';
                addAutoSearchBtn.disabled = false;
                showToast(`❌ ${err.message || err}`, 'error');
            }
        });
    }

    if (addNextImgBtn) {
        addNextImgBtn.addEventListener('click', async () => {
            if (addFormImages.length <= 1) return;
            addFormImgIndex = (addFormImgIndex + 1) % addFormImages.length;

            const currentUrl = addFormImages[addFormImgIndex];
            preview.src = currentUrl;
            addNextImgBtn.textContent = '⏳ Загрузка...';
            addNextImgBtn.disabled = true;

            await downloadAndProcessImage(currentUrl, false,
                (base64) => {
                    preview.src = base64;
                    addNextImgBtn.textContent = '🔁 Другой вариант';
                    addNextImgBtn.disabled = false;
                    showToast(`Вариант ${addFormImgIndex + 1}/${addFormImages.length}`, 'info');
                },
                (err) => {
                    addNextImgBtn.textContent = '🔁 Другой вариант';
                    addNextImgBtn.disabled = false;
                }
            );
        });
    }
}

// Кодируем и сжимаем выбранное фото (jpg, максимум 250px по ширине)
function compressImage(file, maxWidth = 250, quality = 0.65) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (!w || !h) return reject(new Error('Пустое изображение'));
                    if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
                    canvas.width = Math.max(1, Math.round(w));
                    canvas.height = Math.max(1, Math.round(h));
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Canvas недоступен'));
                    // Заливаем фон: иначе прозрачный PNG при переводе в JPEG становился чёрным
                    ctx.fillStyle = '#0d1117';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
        reader.readAsDataURL(file);
    });
}

// fetch с таймаутом: без него «зависший» запрос оставлял кнопки заблокированными навсегда
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        if (err && (err.name === 'AbortError' || err.code === 20)) {
            const timeoutErr = new Error('Превышено время ожидания ответа сервера');
            timeoutErr.name = 'TimeoutError';
            throw timeoutErr;
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
];

// Пробуем несколько CORS-прокси: раньше использовался один и всё ломалось, когда он недоступен
async function fetchViaProxy(url, timeoutMs = 15000) {
    let lastError = null;
    for (const build of CORS_PROXIES) {
        try {
            const res = await fetchWithTimeout(build(url), {}, timeoutMs);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            if (!text) throw new Error('Пустой ответ прокси');
            return text;
        } catch (err) {
            lastError = err;
            console.warn('CORS-прокси недоступен:', err.message);
        }
    }
    throw lastError || new Error('Все CORS-прокси недоступны');
}

// Прямой запрос, а при ошибке — через прокси
async function fetchTextWithFallback(url) {
    try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } catch (err) {
        console.warn('Прямой запрос не удался, пробуем прокси:', err.message);
        return await fetchViaProxy(url);
    }
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Не удалось преобразовать изображение'));
        reader.readAsDataURL(blob);
    });
}

async function fetchImageBlob(url) {
    let res;
    try {
        res = await fetchWithTimeout(url);
    } catch (directErr) {
        console.warn('Прямая загрузка фото не удалась, пробуем прокси...', directErr.message);
        res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/')) throw new Error('Ответ не является изображением');

    const blob = await res.blob();
    if (!blob.size) throw new Error('Пустой файл изображения');
    if (blob.size > 8 * 1024 * 1024) throw new Error('Изображение слишком большое (максимум 8 МБ)');
    return blob;
}

async function downloadAndProcessImage(url, isEditForm, onComplete, onError) {
    try {
        const blob = await fetchImageBlob(url);
        const dataUrl = await blobToDataURL(blob);
        if (isEditForm) currentEditImageBase64 = dataUrl;
        else currentImageBase64 = dataUrl;
        onComplete(dataUrl);
    } catch (err) {
        console.warn('Base64 conversion failed, using raw URL instead', err);
        // Фолбэк: сохраняем прямую ссылку, чтобы фото всё равно отображалось
        if (isEditForm) currentEditImageBase64 = url;
        else currentImageBase64 = url;
        if (typeof onError === 'function') onError(err);
        onComplete(url);
    }
}

async function autoSearchProductImage(name, flavor) {
    const cleanFlavor = (flavor || '').replace(/\([а-яА-ЯёЁ\s\-/,]+\)/g, '').trim();

    const searchOpenFoodFacts = async (query) => {
        const url = 'https://world.openfoodfacts.org/cgi/search.pl'
            + `?search_terms=${encodeURIComponent(query)}`
            + '&search_simple=1&action=process&json=1&page_size=20'
            + '&fields=code,product_name,image_front_url,image_url';

        const text = await fetchTextWithFallback(url);
        const data = JSON.parse(text);
        return Array.isArray(data.products) ? data.products : [];
    };

    const imageUrls = [];
    const collect = (products) => {
        products.forEach(p => {
            const img = p.image_front_url || p.image_url;
            if (img && !imageUrls.includes(img)) imageUrls.push(img);
        });
    };

    try {
        const query = `${name} ${cleanFlavor}`.replace(/\s+/g, ' ').trim();
        collect(await searchOpenFoodFacts(query));

        // Если с вкусом ничего не нашли — ищем только по бренду
        if (imageUrls.length === 0 && cleanFlavor) {
            collect(await searchOpenFoodFacts(name.trim()));
        }

        if (imageUrls.length === 0) {
            throw new Error('Изображения не найдены в базе данных');
        }

        return imageUrls;
    } catch (err) {
        throw new Error(err.message || 'Ошибка сети при поиске');
    }
}

function initControls() {
    document.getElementById('searchInput').addEventListener('input', e => { searchQuery = e.target.value; render(); });
    document.getElementById('sortSelect').addEventListener('change', e => { sortBy = e.target.value; render(); });

    document.querySelectorAll('.chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            render();
        });
    });
}

function getFilteredDrinks() {
    let result = [...drinks];
    if (currentFilter === 'drank') result = result.filter(d => d.status === 'drank');
    else if (currentFilter === 'collection') result = result.filter(d => d.status === 'collection');
    else if (currentFilter === 'rated') result = result.filter(d => getOverallRating(d.rating) > 0);

    const q = searchQuery.toLowerCase().trim();
    if (q) result = result.filter(d => d.name.toLowerCase().includes(q) || (d.flavor && d.flavor.toLowerCase().includes(q)) || (d.notes && d.notes.toLowerCase().includes(q)));

    result.sort((a, b) => {
        // Приводим к строке: старые/импортированные записи могли не иметь date или name
        switch (sortBy) {
            case 'date_asc': return String(a.date || '').localeCompare(String(b.date || ''));
            case 'date_desc': return String(b.date || '').localeCompare(String(a.date || ''));
            case 'rating_desc': return getOverallRating(b.rating) - getOverallRating(a.rating);
            case 'rating_asc': return getOverallRating(a.rating) - getOverallRating(b.rating);
            case 'name_asc': return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
            default: return 0;
        }
    });
    return result;
}

document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const flavor = document.getElementById('flavor').value.trim();
    const status = document.getElementById('status').value === 'collection' ? 'collection' : 'drank';

    if (!name) {
        showToast('⚠️ Укажите название энергетика', 'error');
        return;
    }

    // Дубликат — та же пара «название + вкус» в том же статусе
    if (drinks.some(d => d.name.toLowerCase() === name.toLowerCase() && (d.flavor || '').toLowerCase() === flavor.toLowerCase() && d.status === status)) {
        showToast('⚠️ Уже добавлено!', 'error'); return;
    }

    let vol = parseFloat(volumeSelect.value);
    if (volumeSelect.value === '0') {
        vol = parseFloat(volumeCustomInput.value) || 0;
    }

    drinks.unshift(normalizeDrink({
        id: generateId(),
        name, flavor,
        status,
        date: document.getElementById('date').value || todayISO(),
        rating: { ...selectedRatings },
        store: document.getElementById('store').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        image: currentImageBase64,
        volume: vol || 0,
        caffeine: parseFloat(document.getElementById('caffeine').value) || 0,
        sugar: document.getElementById('sugar').value !== '' ? parseFloat(document.getElementById('sugar').value) : '',
        price: parseFloat(document.getElementById('price').value) || 0
    }));

    saveData();
    render();
    showToast('✅ Добавлено!', 'success');

    e.target.reset();
    document.getElementById('date').value = todayISO();
    selectedRatings = { taste: 0, effect: 0, design: 0, value: 0 };
    currentImageBase64 = null;
    resetAddFormImages();
    document.getElementById('preview').src = '';
    document.getElementById('preview').classList.remove('show');
    document.getElementById('removeImg').style.display = 'none';
    document.querySelectorAll('#starsContainer .criteria-stars span').forEach(s => s.classList.remove('active'));
    document.getElementById('ratingVal').textContent = '0.0/5';
    volumeCustomInput.style.display = 'none';
});

function initSettings() {
    document.getElementById('exportBtn').addEventListener('click', () => {
        if (!drinks.length) return showToast('⚠️ Нечего экспортировать', 'error');
        const blob = new Blob([JSON.stringify(drinks, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `energy_${todayISO()}.json`;
        a.click(); URL.revokeObjectURL(a.href);
        showToast('📥 Файл скачан', 'success');
    });

    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const imp = JSON.parse(ev.target.result);
                if (!Array.isArray(imp)) throw new Error('Неверный формат файла: ожидается массив записей');

                const processedImp = imp.filter(d => d && typeof d === 'object' && d.name).map(normalizeDrink);
                if (!processedImp.length) throw new Error('В файле нет ни одной записи с названием');

                const skipped = imp.length - processedImp.length;
                const skippedNote = skipped > 0 ? ` (пропущено некорректных: ${skipped})` : '';

                if (confirm(`Загрузить ${processedImp.length} записей${skippedNote}? Текущая коллекция будет заменена.`)) {
                    drinks = processedImp;
                    saveData(); render(); renderStats();
                    showToast(`📤 Импорт завершён: ${processedImp.length}`, 'success');
                }
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
            e.target.value = '';
        };
        reader.onerror = () => { showToast('❌ Не удалось прочитать файл', 'error'); e.target.value = ''; };
        reader.readAsText(file);
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (!drinks.length) return showToast('⚠️ Коллекция уже пуста', 'error');
        if (confirm('Удалить ВСЕ записи? Это действие нельзя отменить.')) {
            drinks = []; saveData(); render(); renderStats(); showToast('🧹 Очищено', 'info');
        }
    });

    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => applyTheme(dot.dataset.theme));
    });
}

// Очередь записи: параллельные вызовы раньше могли завершиться в произвольном порядке
let saveQueue = Promise.resolve();

function saveData() {
    // Глубокая копия: раньше сохранялась ссылка на массив, и параллельные
    // unshift/splice меняли данные ещё до завершения записи в IndexedDB.
    let snapshot;
    try {
        snapshot = typeof structuredClone === 'function'
            ? structuredClone(drinks)
            : JSON.parse(JSON.stringify(drinks));
    } catch (e) {
        snapshot = drinks.slice();
    }
    saveQueue = saveQueue
        .catch(() => { /* предыдущая ошибка уже обработана */ })
        .then(() => EnergyDB.set(STORAGE_KEY, snapshot))
        .then(() => {
            const warn = document.getElementById('storageWarn');
            if (warn) warn.style.display = 'none';
            updateStorageSize();
        })
        .catch(err => {
            console.error(err);
            const warn = document.getElementById('storageWarn');
            if (warn) warn.style.display = 'block';
            showToast('⚠️ Ошибка записи в локальную базу', 'error');
        });
    return true;
}

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }

// Экранирование для значений атрибутов: escapeHtml НЕ экранирует кавычки,
// из-за чего значение с " ломало разметку (и позволяло внедрить HTML через импорт JSON).
function escapeAttr(t) {
    return String(t === undefined || t === null ? '' : t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Пропускаем только безопасные источники изображений (data-URL или http(s))
function safeImageSrc(src) {
    if (typeof src !== 'string') return '';
    const value = src.trim();
    return /^(data:image\/|https?:\/\/)/i.test(value) ? value : '';
}

function deleteDrink(id, askConfirm = true) {
    if (!id) return;
    const targetId = String(id).trim();
    const idx = drinks.findIndex(d => String(d.id).trim() === targetId);
    if (idx === -1) {
        showToast('❌ Ошибка: Запись не найдена', 'error');
        return;
    }

    if (askConfirm) {
        const title = drinks[idx].name || 'запись';
        if (!confirm(`Удалить «${title}»? Действие нельзя отменить.`)) return;
    }

    drinks.splice(idx, 1);
    saveData();
    render();

    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.dataset.tab === 'stats') {
        renderStats();
    }

    showToast('🗑️ Успешно удалено', 'info');
    closeDetailModal();
}

let currentEditId = null;
let currentEditImageBase64 = null;

function openDetailModal(id) {
    const drink = drinks.find(d => String(d.id) === String(id));
    if (!drink) return;
    currentEditId = id;
    currentEditImageBase64 = drink.image;

    const modal = document.getElementById('detailModal');
    const viewContent = document.getElementById('modalViewContent');
    const editContent = document.getElementById('modalEditContent');

    viewContent.style.display = 'block';
    editContent.style.display = 'none';

    const imageSrc = safeImageSrc(drink.image);
    const imgHtml = imageSrc
        ? `<img src="${escapeAttr(imageSrc)}" class="modal-img" alt="can">`
        : '<div class="modal-img" style="height:100px; display:flex; align-items:center; justify-content:center; background:#0d1117; border-radius:10px; color:var(--text-muted);">Без фото</div>';
    const ratingHtml = getOverallRating(drink.rating) > 0 ? starsHtml(drink.rating, '0.85rem') : 'Без оценки';

    viewContent.innerHTML = `
        ${imgHtml}
        <div class="modal-title-row">
            <div class="modal-title">${escapeHtml(drink.name)}</div>
            <span class="modal-badge badge-${drink.status}">${drink.status === 'drank' ? '✅ Пил' : '📦 Коллекция'}</span>
        </div>
        <div class="modal-flavor">${escapeHtml(drink.flavor) || 'Без вкуса'}</div>
        <div class="modal-rating">${ratingHtml}</div>

        <div class="modal-specs-grid">
            <div class="modal-spec-card">
                <div class="modal-spec-val">${drink.volume ? drink.volume + ' л' : '—'}</div>
                <div class="modal-spec-lbl">Объем</div>
            </div>
            <div class="modal-spec-card">
                <div class="modal-spec-val">${drink.caffeine ? drink.caffeine + ' мг' : '—'}</div>
                <div class="modal-spec-lbl">Кофеин</div>
            </div>
            <div class="modal-spec-card">
                <div class="modal-spec-val">${drink.sugar !== undefined && drink.sugar !== '' ? drink.sugar + ' г' : '—'}</div>
                <div class="modal-spec-lbl">Сахар</div>
            </div>
            <div class="modal-spec-card">
                <div class="modal-spec-val">${drink.price ? drink.price + ' ₽' : '—'}</div>
                <div class="modal-spec-lbl">Цена</div>
            </div>
        </div>
        ${drink.store ? `<div style="color:var(--text-muted); font-size: 0.85rem; margin-bottom: 10px;">📍 Куплено в: <span style="color:var(--text);">${escapeHtml(drink.store)}</span></div>` : ''}

        ${drink.notes ? `<div class="modal-notes-box">💬 ${escapeHtml(drink.notes)}</div>` : ''}
        <div class="drink-date" style="margin-bottom:20px;">📅 Дата: ${drink.date ? escapeHtml(drink.date) : 'не указана'}</div>

        <div class="modal-footer">
            <button class="action-btn" id="editModalBtn">✏️ Изменить</button>
            <button class="action-btn danger" id="deleteModalBtn">🗑️ Удалить</button>
        </div>
    `;

    document.getElementById('editModalBtn').addEventListener('click', () => startEditMode(drink));
    document.getElementById('deleteModalBtn').addEventListener('click', () => {
        // Запись выбрана осознанно — подтверждение не требуется
        deleteDrink(drink.id, false);
    });

    modal.style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
    currentEditId = null;
    currentEditImageBase64 = null;
}

function initModalClose() {
    document.getElementById('closeModalBtn').addEventListener('click', closeDetailModal);
    document.getElementById('detailModal').addEventListener('click', e => {
        if (e.target.id === 'detailModal') closeDetailModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDetailModal();
    });
}

function startEditMode(drink) {
    const viewContent = document.getElementById('modalViewContent');
    const editContent = document.getElementById('modalEditContent');

    viewContent.style.display = 'none';
    editContent.style.display = 'block';

    editContent.innerHTML = `
        <h3 style="margin-bottom:15px; background:linear-gradient(135deg, var(--accent), var(--warning)); -webkit-background-clip:text; background-clip:text; color:transparent;">✏️ Редактирование</h3>
        <form id="editForm">
            <div class="form-grid">
                <div class="autocomplete-wrap">
                    <input type="text" id="editName" placeholder="Бренд / Название" value="${escapeAttr(drink.name)}" required autocomplete="off">
                    <div id="editAutocompleteList" class="autocomplete-suggestions" style="display:none;"></div>
                </div>
                <input type="text" id="editFlavor" placeholder="Вкус / Линейка" value="${escapeAttr(drink.flavor || '')}">
                <select id="editStatus">
                    <option value="drank" ${drink.status === 'drank' ? 'selected' : ''}>✅ Уже пил</option>
                    <option value="collection" ${drink.status === 'collection' ? 'selected' : ''}>📦 В коллекции</option>
                </select>
                <input type="date" id="editDate" value="${escapeAttr(drink.date)}">

                <select id="editVolume">
                    <option value="0.5" ${drink.volume == 0.5 ? 'selected' : ''}>🥤 0.5 л</option>
                    <option value="0.44" ${drink.volume == 0.44 ? 'selected' : ''}>🥤 0.44 л</option>
                    <option value="0.33" ${drink.volume == 0.33 ? 'selected' : ''}>🥤 0.33 л</option>
                    <option value="0.25" ${drink.volume == 0.25 ? 'selected' : ''}>🥤 0.25 л</option>
                    <option value="0" ${[0.5, 0.44, 0.33, 0.25].indexOf(parseFloat(drink.volume)) === -1 && drink.volume ? 'selected' : ''}>Другой объем</option>
                </select>
                <input type="number" id="editVolumeCustom" placeholder="Свой объем (л)" step="0.01" value="${drink.volume || ''}" style="${[0.5, 0.44, 0.33, 0.25].indexOf(parseFloat(drink.volume)) === -1 && drink.volume ? 'display:block;' : 'display:none;'}">

                <input type="number" id="editCaffeine" placeholder="☕ Кофеин (мг всего)" min="0" value="${drink.caffeine || ''}">
                <input type="number" id="editSugar" placeholder="🍭 Сахар (г всего)" min="0" value="${drink.sugar !== undefined ? drink.sugar : ''}">
                <input type="number" id="editPrice" placeholder="💰 Цена (₽)" min="0" value="${drink.price || ''}">
                <input type="text" id="editStore" placeholder="📍 Где куплено" value="${escapeAttr(drink.store || '')}" class="full">

                <div class="full">
                    <div class="file-wrap">
                        <input type="file" id="editImageInput" accept="image/*">
                        <img id="editPreview" class="img-preview ${safeImageSrc(drink.image) ? 'show' : ''}" src="${escapeAttr(safeImageSrc(drink.image))}">
                        <button type="button" id="editRemoveImg" class="remove-img" style="${safeImageSrc(drink.image) ? 'display:inline-block;' : 'display:none;'}">✕</button>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" id="editAutoSearchBtn" class="auto-search-btn" style="flex: 2;">🪄 Авто-поиск фото</button>
                        <button type="button" id="editNextImageBtn" class="auto-search-btn" style="flex: 1.2; display: none;">🔁 Другой вариант</button>
                    </div>
                </div>

                <div class="full" style="background: #0e121d; padding: 16px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.04);">
                    <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:10px; font-weight: 700;">Оценки по критериям <span style="font-weight:500;">— повторный клик сбрасывает</span></label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" id="editStarsContainer">
                        ${['taste', 'effect', 'design', 'value'].map(crit => `
                            <div class="rating-box" style="justify-content: space-between;">
                                <span style="font-size:0.8rem; color:var(--text-muted);">${crit==='taste'?'👅 Вкус':crit==='effect'?'⚡ Эффект':crit==='design'?'🎨 Дизайн':'💰 Цена/Кач.'}</span>
                                <div class="stars criteria-stars" data-type="${crit}">
                                    ${[1,2,3,4,5].map(v => `<span data-val="${v}" class="${typeof drink.rating === 'object' && drink.rating[crit] >= v ? 'active' : typeof drink.rating === 'number' && drink.rating >= v ? 'active' : ''}">★</span>`).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 12px; text-align: center; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
                        <span style="font-size:0.85rem; color:var(--text-muted);">Общий рейтинг:</span>
                        <span class="rating-val" id="editRatingVal" style="font-size: 1.2rem; color: var(--accent); margin-left: 8px;">${typeof drink.rating === 'object' ? getOverallRating(drink.rating) : drink.rating}/5</span>
                    </div>
                </div>

                <textarea id="editNotes" class="full" placeholder="Заметки: крепость, сахар, впечатления...">${escapeHtml(drink.notes || '')}</textarea>

                <div class="full modal-footer" style="margin-top:10px;">
                    <button type="submit" class="action-btn success" style="flex:1;">💾 Сохранить</button>
                    <button type="button" class="action-btn" id="editCancelBtn">Отмена</button>
                </div>
            </div>
        </form>
    `;

    document.getElementById('editCancelBtn').addEventListener('click', () => {
        viewContent.style.display = 'block';
        editContent.style.display = 'none';
    });

    setupAutocomplete(
        document.getElementById('editName'),
        document.getElementById('editAutocompleteList'),
        (item) => {
            document.getElementById('editFlavor').value = item.flavor;
            document.getElementById('editCaffeine').value = item.caffeine;
            document.getElementById('editSugar').value = item.sugar;

            const volSelect = document.getElementById('editVolume');
            const volCustom = document.getElementById('editVolumeCustom');
            const standardVols = [0.5, 0.44, 0.33, 0.25];

            if (standardVols.includes(item.volume)) {
                volSelect.value = item.volume;
                volCustom.style.display = 'none';
            } else {
                volSelect.value = '0';
                volCustom.style.display = 'block';
                volCustom.value = item.volume;
            }
        }
    );

    const editVolume = document.getElementById('editVolume');
    const editVolumeCustom = document.getElementById('editVolumeCustom');
    editVolume.addEventListener('change', () => {
        editVolumeCustom.style.display = editVolume.value === '0' ? 'block' : 'none';
    });

                let editSelectedRatings = typeof drink.rating === 'object' ? { ...drink.rating } : { taste: drink.rating||0, effect: drink.rating||0, design: drink.rating||0, value: drink.rating||0 };
    const editStars = document.getElementById('editStarsContainer');
    editStars.addEventListener('click', e => {
        if (e.target.tagName !== 'SPAN') return;
        const type = e.target.parentElement.dataset.type;
        const value = parseInt(e.target.dataset.val, 10);
        // Повторный клик по той же звезде снимает оценку
        editSelectedRatings[type] = editSelectedRatings[type] === value ? 0 : value;
        updateEditCriteriaUI();
    });
    function updateEditCriteriaUI() {
        document.querySelectorAll('#editStarsContainer .criteria-stars').forEach(container => {
            const type = container.dataset.type;
            const val = editSelectedRatings[type];
            const stars = container.children;
            for (let i = 0; i < 5; i++) stars[i].classList.toggle('active', i < val);
        });
        document.getElementById('editRatingVal').textContent = `${getOverallRating(editSelectedRatings)}/5`;
    }

    const editFileInput = document.getElementById('editImageInput');
    const editPreview = document.getElementById('editPreview');
    const editRemoveBtn = document.getElementById('editRemoveImg');
    editFileInput.addEventListener('change', async e => {
        const file = e.target.files[0]; if (!file) return;
        try {
            currentEditImageBase64 = await compressImage(file, 250, 0.65);
            editPreview.src = currentEditImageBase64;
            editPreview.classList.add('show');
            editRemoveBtn.style.display = 'inline-block';
        } catch { showToast('❌ Ошибка фото', 'error'); }
    });
    editRemoveBtn.addEventListener('click', () => {
        currentEditImageBase64 = null;
        editPreview.src = '';
        editPreview.classList.remove('show');
        editRemoveBtn.style.display = 'none';
        editFileInput.value = '';
    });

    let editFormImages = [];
    let editFormImgIndex = 0;
    const editAutoSearchBtn = document.getElementById('editAutoSearchBtn');
    const editNextImgBtn = document.getElementById('editNextImageBtn');

    if (editAutoSearchBtn) {
        editAutoSearchBtn.addEventListener('click', async () => {
            const name = document.getElementById('editName').value.trim();
            const flavor = document.getElementById('editFlavor').value.trim();
            if (!name) {
                showToast('⚠️ Сначала введите название энергетика!', 'error');
                return;
            }
            editAutoSearchBtn.textContent = '⏳ Поиск...';
            editAutoSearchBtn.disabled = true;
            if (editNextImgBtn) editNextImgBtn.style.display = 'none';

            try {
                editFormImages = await autoSearchProductImage(name, flavor);
                editFormImgIndex = 0;

                const firstUrl = editFormImages[0];
                editPreview.src = firstUrl;
                editPreview.classList.add('show');
                editRemoveBtn.style.display = 'inline-block';

                editAutoSearchBtn.textContent = '🪄 Авто-поиск фото';
                editAutoSearchBtn.disabled = false;

                if (editFormImages.length > 1 && editNextImgBtn) {
                    editNextImgBtn.style.display = 'inline-flex';
                    showToast(`✨ Найдено вариантов: ${editFormImages.length}. Можно переключать!`, 'success');
                } else {
                    showToast('✨ Изображение найдено!', 'success');
                }

                await downloadAndProcessImage(firstUrl, true, 
                    (base64) => {
                        editPreview.src = base64;
                    },
                    (err) => {}
                );

            } catch (err) {
                editAutoSearchBtn.textContent = '🪄 Авто-поиск фото';
                editAutoSearchBtn.disabled = false;
                showToast(`❌ ${err.message || err}`, 'error');
            }
        });
    }

    if (editNextImgBtn) {
        editNextImgBtn.addEventListener('click', async () => {
            if (editFormImages.length <= 1) return;
            editFormImgIndex = (editFormImgIndex + 1) % editFormImages.length;

            const currentUrl = editFormImages[editFormImgIndex];
            editPreview.src = currentUrl;
            editNextImgBtn.textContent = '⏳ Загрузка...';
            editNextImgBtn.disabled = true;

            await downloadAndProcessImage(currentUrl, true,
                (base64) => {
                    editPreview.src = base64;
                    editNextImgBtn.textContent = '🔁 Другой вариант';
                    editNextImgBtn.disabled = false;
                    showToast(`Вариант ${editFormImgIndex + 1}/${editFormImages.length}`, 'info');
                },
                (err) => {
                    editNextImgBtn.textContent = '🔁 Другой вариант';
                    editNextImgBtn.disabled = false;
                }
            );
        });
    }

    document.getElementById('editForm').addEventListener('submit', e => {
        e.preventDefault();
        const idx = drinks.findIndex(d => String(d.id) === String(drink.id));
        if (idx === -1) {
            showToast('❌ Запись не найдена — возможно, она удалена', 'error');
            closeDetailModal();
            return;
        }

        const name = document.getElementById('editName').value.trim();
        if (!name) {
            showToast('⚠️ Укажите название энергетика', 'error');
            return;
        }

        let vol = parseFloat(editVolume.value);
        if (editVolume.value === '0') {
            vol = parseFloat(editVolumeCustom.value) || 0;
        }

        drinks[idx] = normalizeDrink({
            ...drinks[idx],
            name,
            flavor: document.getElementById('editFlavor').value.trim(),
            status: document.getElementById('editStatus').value,
            date: document.getElementById('editDate').value,
            rating: { ...editSelectedRatings },
            store: document.getElementById('editStore').value.trim(),
            notes: document.getElementById('editNotes').value.trim(),
            image: currentEditImageBase64,
            volume: vol || 0,
            caffeine: parseFloat(document.getElementById('editCaffeine').value) || 0,
            sugar: document.getElementById('editSugar').value !== '' ? parseFloat(document.getElementById('editSugar').value) : '',
            price: parseFloat(document.getElementById('editPrice').value) || 0
        });

        saveData();
        render();
        renderStats();
        showToast('✅ Обновлено!', 'success');
        closeDetailModal();
    });
}

function renderCalendar() {
    const container = document.getElementById('calendarGrid');
    if (!container) return;
    container.innerHTML = '';

    const counts = {};
    drinks.forEach(d => {
        if (d.status === 'drank' && d.date) {
            counts[d.date] = (counts[d.date] || 0) + 1;
        }
    });

    // 24 недели = 24 столбца по 7 дней. Первый столбец начинается с понедельника,
    // поэтому будни всегда попадают в свою строку (раньше даты «съезжали» по неделям).
    const WEEKS = 24;
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const mondayOffset = (todayLocal.getDay() + 6) % 7; // 0 — понедельник
    const firstDay = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate() - mondayOffset - (WEEKS - 1) * 7);

    for (let i = 0; i < WEEKS * 7; i++) {
        const day = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + i);
        const dateStr = todayISO(day);
        const count = counts[dateStr] || 0;
        const isFuture = day > todayLocal;

        const div = document.createElement('div');
        div.className = 'calendar-day';
        let level = 0;
        if (count > 0) {
            level = count >= 4 ? 4 : count;
        }
        div.classList.add(`level-${level}`);
        if (isFuture) div.classList.add('future');

        const [, mm, dd] = dateStr.split('-');
        div.title = isFuture
            ? `${dd}.${mm} — впереди`
            : `${dd}.${mm}: ${count === 0 ? 'нет записей' : `${count} ${pluralizeDrinks(count)}`}`;

        container.appendChild(div);
    }
}

// Сбрасываем графики перед перерисовкой (иначе они «накапливаются» в памяти)
function destroyCharts() {
    Object.values(charts).forEach(chart => {
        try { chart.destroy(); } catch (e) { /* график уже уничтожен */ }
    });
    charts = {};
}

function renderStats() {
    if (!drinks.length) {
        destroyCharts();
        document.querySelectorAll('.chart-box canvas').forEach(c => c.style.display = 'none');
        document.querySelectorAll('.no-chart').forEach(n => { n.style.display = 'flex'; n.textContent = 'Нет данных'; });
        document.getElementById('statsSummary').innerHTML = '';
        document.getElementById('warnSection').innerHTML = '';
        document.getElementById('rankSection').innerHTML = '';
        document.getElementById('achievementsSection').innerHTML = '';
        document.getElementById('calendarGrid').innerHTML = '';
        return;
    }
    document.querySelectorAll('.chart-box canvas').forEach(c => c.style.display = 'block');
    document.querySelectorAll('.no-chart').forEach(n => n.style.display = 'none');

    const statusCount = { drank: 0, collection: 0 };
    const ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const brandCount = {};

    let totalCaffeine = 0;
    let totalSugar = 0;
    let totalMoney = 0;

    const dailyCaffeineMap = {};

    drinks.forEach(d => {
        // Неизвестный статус раньше превращал счётчик в NaN
        statusCount[d.status === 'collection' ? 'collection' : 'drank']++;

        const overall = getOverallRating(d.rating);
        // В гистограмме оценки сгруппированы по округлённому значению (4.5 -> «5★»),
        // точное значение всегда показано рядом со звёздами
        const rounded = Math.round(overall);
        if (rounded >= 1 && rounded <= 5) ratingCount[rounded]++;

        const key = d.name + (d.flavor ? ` | ${d.flavor}` : '');
        brandCount[key] = (brandCount[key] || 0) + 1;

        if (d.price) totalMoney += parseFloat(d.price) || 0;
        if (d.status === 'drank') {
            if (d.caffeine) {
                totalCaffeine += parseFloat(d.caffeine) || 0;
                if (d.date) {
                    dailyCaffeineMap[d.date] = (dailyCaffeineMap[d.date] || 0) + (parseFloat(d.caffeine) || 0);
                }
            }
            if (d.sugar !== undefined && d.sugar !== '') {
                totalSugar += parseFloat(d.sugar) || 0;
            }
        }
    });

    let overdoseDays = Object.values(dailyCaffeineMap).filter(v => v > 400).length;
    let warnHtml = overdoseDays > 0 ? `<div class="storage-warn" style="display:block; margin-bottom:15px; margin-top:0;">⚠️ Внимание: в течение ${overdoseDays} дн. превышен безопасный лимит кофеина (400 мг)! Берегите здоровье.</div>` : '';
    document.getElementById('warnSection').innerHTML = warnHtml;

    const drankCount = drinks.filter(d => d.status === 'drank').length;
    const rank = getRank(drankCount);
    const progressPercent = rank.max === 999 ? 100 : Math.min(100, ((drankCount - rank.min) / (rank.max - rank.min)) * 100);
    const progressText = rank.max === 999 ? 'Максимальный ранг достигнут! 🎉' : `До следующего ранга осталось выпить: ${rank.max - drankCount} шт.`;

    const rankCardHtml = `
        <div class="rank-card">
            <div class="rank-badge-img">${rank.icon}</div>
            <div class="rank-info">
                <div class="rank-name">${rank.name}</div>
                <div style="font-size:0.82rem; color:var(--text-muted)">Ваш статус Охотника за Энергией (Выпито: ${drankCount})</div>
                <div class="rank-bar-bg">
                    <div class="rank-bar-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="rank-progress-text">${progressText}</span>
            </div>
        </div>
    `;
    document.getElementById('rankSection').innerHTML = rankCardHtml;

    const unlockedAchs = checkAchievements();
    const achievementsHtml = `
        <div class="achievements-section">
            <div class="achievements-title">
                <span>🏆 Достижения (${unlockedAchs.size} / ${ACHIEVEMENTS.length})</span>
            </div>
            <div class="achievements-grid">
                ${ACHIEVEMENTS.map(ach => {
        const isUnlocked = unlockedAchs.has(ach.id);
        return `
                        <div class="ach-card ${isUnlocked ? 'unlocked' : ''}" title="${ach.desc}">
                            <div class="ach-icon">${ach.icon}</div>
                            <div class="ach-name">${ach.name}</div>
                            <div class="ach-desc">${ach.desc}</div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
    document.getElementById('achievementsSection').innerHTML = achievementsHtml;

    renderCalendar();

    const avgRating = drinks.filter(d => getOverallRating(d.rating) > 0).reduce((s, d) => s + getOverallRating(d.rating), 0) / (drinks.filter(d => getOverallRating(d.rating) > 0).length || 1);
    document.getElementById('statsSummary').innerHTML = `
        <div class="stat-card"><div class="stat-value">${drinks.length}</div><div class="stat-label">Всего записей</div></div>
        <div class="stat-card"><div class="stat-value">${avgRating.toFixed(1)}★</div><div class="stat-label">Средний рейтинг</div></div>
        <div class="stat-card"><div class="stat-value">${new Set(drinks.map(d => d.name)).size}</div><div class="stat-label">Уникальных брендов</div></div>
        <div class="stat-card"><div class="stat-value">${totalMoney.toLocaleString()} ₽</div><div class="stat-label">Потрачено денег</div></div>
        <div class="stat-card"><div class="stat-value">${totalCaffeine} мг</div><div class="stat-label">Всего кофеина</div></div>
        <div class="stat-card"><div class="stat-value">${totalSugar} г</div><div class="stat-label">Всего сахара</div></div>
    `;

    if (typeof Chart === 'undefined') {
        document.querySelectorAll('.no-chart').forEach(n => { n.style.display = 'flex'; n.textContent = 'Chart.js недоступен'; });
        return;
    }

    const accentColor = themeColor('--accent', '#38bdf8');
    const successColor = themeColor('--success', '#34d399');
    const warningColor = themeColor('--warning', '#fbbf24');

    const opts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#e6e9ef', font: { family: 'system-ui', size: 12 } } } },
        scales: { x: { ticks: { color: '#6b7280' }, grid: { color: '#1e232d' } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#1e232d' }, beginAtZero: true } }
    };

    destroyCharts();

    charts.status = new Chart(document.getElementById('chartStatus'), {
        type: 'doughnut',
        data: { labels: ['✅ Пил', '📦 Коллекция'], datasets: [{ data: [statusCount.drank, statusCount.collection], backgroundColor: [successColor, warningColor], borderWidth: 0, hoverOffset: 8 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#e6e9ef', padding: 15 } } }, cutout: '65%' }
    });

    charts.rating = new Chart(document.getElementById('chartRating'), {
        type: 'bar',
        data: { labels: ['1★', '2★', '3★', '4★', '5★'], datasets: [{ data: [ratingCount[1], ratingCount[2], ratingCount[3], ratingCount[4], ratingCount[5]], backgroundColor: accentColor, borderRadius: 6, maxBarThickness: 40 }] },
        options: opts
    });

    const top = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    charts.top = new Chart(document.getElementById('chartTop'), {
        type: 'bar',
        data: { labels: top.map(b => b[0]), datasets: [{ label: 'Кол-во', data: top.map(b => b[1]), backgroundColor: warningColor, borderRadius: 6, maxBarThickness: 30 }] },
        options: { ...opts, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
}

const shareStatsBtn = document.getElementById('shareStatsBtn');
if (shareStatsBtn) {
    // Раньше обработчик был продублирован — картинка генерировалась и скачивалась дважды
    shareStatsBtn.addEventListener('click', () => {
        if (typeof html2canvas !== 'function') {
            showToast('❌ Библиотека html2canvas не загрузилась (проверьте интернет)', 'error');
            return;
        }

        const btn = shareStatsBtn;
        const originalLabel = '📸 Поделиться статистикой';
        btn.textContent = '⏳ Генерация...';
        btn.disabled = true;

        const statsTab = document.getElementById('tab-stats');
        html2canvas(statsTab, {
            backgroundColor: '#090b11',
            scale: 2,
            ignoreElements: (el) => el.id === 'shareStatsBtn'
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `energy_hunter_stats_${todayISO()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            btn.textContent = originalLabel;
            btn.disabled = false;
            showToast('✅ Картинка со статистикой сохранена!', 'success');
        }).catch(err => {
            console.error(err);
            btn.textContent = originalLabel;
            btn.disabled = false;
            showToast('❌ Ошибка генерации картинки', 'error');
        });
    });
}

function render() {
    const list = document.getElementById('drinkList');
    const empty = document.getElementById('emptyMsg');
    if (!list || !empty) return;

    list.innerHTML = '';
    const filtered = getFilteredDrinks();

    if (!filtered.length) {
        // Разделяем «коллекция пуста» и «ничего не найдено по фильтру»
        const hasAnyDrinks = drinks.length > 0;
        const emptyIcon = document.getElementById('emptyIcon');
        const emptyTitle = document.getElementById('emptyTitle');
        const emptyText = document.getElementById('emptyText');
        if (emptyIcon) emptyIcon.textContent = hasAnyDrinks ? '🔍' : '🔋';
        if (emptyTitle) emptyTitle.textContent = hasAnyDrinks ? 'Ничего не найдено' : 'Пока пусто';
        if (emptyText) {
            emptyText.textContent = hasAnyDrinks
                ? 'Попробуйте изменить поиск или фильтры'
                : 'Добавь свой первый энергетик во вкладке «Добавить»';
        }
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    filtered.forEach((d, i) => {
        const li = document.createElement('li');
        li.className = `drink-card status-${d.status}`;
        li.style.animationDelay = `${i * 0.05}s`;
        li.dataset.id = d.id;
        const imageSrc = safeImageSrc(d.image);
        const imgHtml = imageSrc ? `<img src="${escapeAttr(imageSrc)}" class="card-img" alt="can">` : '';
        const ratingHtml = getOverallRating(d.rating) > 0 ? `<div class="drink-rating">${starsHtml(d.rating)}</div>` : '';
        const notesHtml = d.notes ? `<div class="drink-notes">💬 ${escapeHtml(d.notes)}</div>` : '';

        const specs = [];
        if (d.volume) specs.push(`🥤 ${d.volume}л`);
        if (d.caffeine) specs.push(`☕ ${d.caffeine}мг`);
        if (d.sugar !== undefined && d.sugar !== '') specs.push(`🍭 ${d.sugar}г`);
        if (d.price) specs.push(`💰 ${d.price}₽`);
        if (d.store) specs.push(`📍 ${escapeHtml(d.store)}`);

        const specsHtml = specs.length > 0 ? `<div class="drink-flavor" style="margin-top: 4px; font-size: 0.8rem; display: flex; gap: 8px; flex-wrap: wrap; font-weight: 500; color: var(--accent);">${specs.join(' | ')}</div>` : '';

        li.innerHTML = `
            ${imgHtml}
            <div class="drink-info">
                <div class="drink-header">
                    <div class="drink-name">${escapeHtml(d.name)}</div>
                    <span class="badge badge-${d.status}">${d.status === 'drank' ? 'Пил' : 'Коллекция'}</span>
                </div>
                <div class="drink-flavor" style="color: var(--text-muted);">${escapeHtml(d.flavor) || 'Без вкуса'}</div>
                ${specsHtml}
                ${ratingHtml}
                ${notesHtml}
                <div class="drink-date">📅 ${d.date ? escapeHtml(d.date) : 'дата не указана'}</div>
            </div>
            <button class="delete-btn" title="Удалить" aria-label="Удалить запись">🗑️</button>
        `;

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            deleteDrink(d.id); // подтверждение запрашиваем — удаление с карточки легко нажать случайно
        });

        li.addEventListener('click', e => {
            if (!e.target.closest('.delete-btn')) {
                openDetailModal(d.id);
            }
        });

        list.appendChild(li);
    });
}

let presetSearchQuery = '';

function initPresetsIndex() {
    const input = document.getElementById('presetSearchInput');
    if (input) {
        input.addEventListener('input', e => {
            presetSearchQuery = e.target.value;
            renderPresetsIndex();
        });
    }
}

function renderPresetsIndex() {
    const list = document.getElementById('presetList');
    if (!list) return;
    list.innerHTML = '';

    const q = presetSearchQuery.toLowerCase().trim();
    const filtered = PRESET_DRINKS.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.flavor.toLowerCase().includes(q)
    );

    filtered.sort((a, b) => {
        const cmpName = a.name.localeCompare(b.name, 'ru');
        if (cmpName !== 0) return cmpName;
        return a.flavor.localeCompare(b.flavor, 'ru');
    });

    filtered.forEach((p, i) => {
        const loggedMatches = drinks.filter(d => 
            d.name.toLowerCase() === p.name.toLowerCase() && 
            (d.flavor || '').toLowerCase() === p.flavor.toLowerCase()
        );
        const isUnlocked = loggedMatches.length > 0;
        const hasDrank = loggedMatches.some(d => d.status === 'drank');
        const hasCollection = loggedMatches.some(d => d.status === 'collection');

        const li = document.createElement('li');
        li.className = 'drink-card';
        li.style.animationDelay = `${i * 0.02}s`;
        li.style.paddingRight = '16px'; 

        if (isUnlocked) {
            li.style.borderColor = 'rgba(var(--accent-rgb), 0.35)';
            li.style.background = 'rgba(var(--accent-rgb), 0.04)';
            li.style.boxShadow = '0 0 10px rgba(var(--accent-rgb), 0.08)';
        } else {
            li.style.opacity = '0.5';
            li.style.filter = 'grayscale(35%)';
        }

        let badgeHtml = '';
        if (isUnlocked) {
            if (hasDrank && hasCollection) {
                badgeHtml = `<span class="badge badge-drank" style="font-size:0.65rem;">🔓 Пил & В колл.</span>`;
            } else if (hasDrank) {
                badgeHtml = `<span class="badge badge-drank" style="font-size:0.65rem;">🔓 Уже пил</span>`;
            } else {
                badgeHtml = `<span class="badge badge-collection" style="font-size:0.65rem;">🔓 В коллекции</span>`;
            }
        } else {
            badgeHtml = `<span class="badge" style="background: rgba(255, 255, 255, 0.04); color: var(--text-muted); border: 1px solid rgba(255, 255, 255, 0.08); font-size:0.65rem;">🔒 Не открыт</span>`;
        }

        const specs = [];
        if (p.volume) specs.push(`🥤 ${p.volume}л`);
        if (p.caffeine) specs.push(`☕ ${p.caffeine}мг`);
        if (p.sugar !== undefined && p.sugar !== '') specs.push(`🍭 ${p.sugar}г`);

        const specsHtml = specs.length > 0 
            ? `<div class="drink-flavor" style="margin-top: 4px; font-size: 0.8rem; display: flex; gap: 8px; flex-wrap: wrap; font-weight: 500; color: var(--accent);">${specs.join(' | ')}</div>` 
            : '';

        li.innerHTML = `
            <div class="drink-info">
                <div class="drink-header">
                    <div class="drink-name">${escapeHtml(p.name)}</div>
                    ${badgeHtml}
                </div>
                <div class="drink-flavor" style="color: var(--text-muted);">${escapeHtml(p.flavor) || 'Без вкуса'}</div>
                ${specsHtml}

                <div style="display: flex; gap: 8px; margin-top: 12px; z-index: 20;">
                    <button class="action-btn success add-drank-btn" style="flex: 1; padding: 7px; font-size: 0.8rem;">✅ Пил</button>
                    <button class="action-btn add-collection-btn" style="flex: 1; padding: 7px; font-size: 0.8rem;">📦 В коллекцию</button>
                </div>
            </div>
        `;

        li.querySelector('.add-drank-btn').addEventListener('click', e => {
            e.stopPropagation();
            addFromPreset(p, 'drank');
        });
        li.querySelector('.add-collection-btn').addEventListener('click', e => {
            e.stopPropagation();
            addFromPreset(p, 'collection');
        });

        list.appendChild(li);
    });
}

function addFromPreset(preset, status) {
    // Не создаём дубликаты: та же позиция в том же статусе уже есть
    const alreadyAdded = drinks.some(d =>
        d.name.toLowerCase() === preset.name.toLowerCase() &&
        (d.flavor || '').toLowerCase() === preset.flavor.toLowerCase() &&
        d.status === status
    );
    if (alreadyAdded) {
        showToast(`⚠️ «${preset.name}» уже отмечен как ${status === 'drank' ? 'выпитый' : 'в коллекции'}`, 'error');
        return;
    }

    drinks.unshift(normalizeDrink({
        id: generateId(),
        name: preset.name,
        flavor: preset.flavor,
        status: status,
        date: todayISO(),
        rating: 0,
        notes: 'Добавлено из каталога',
        image: null,
        volume: preset.volume || 0,
        caffeine: preset.caffeine || 0,
        sugar: preset.sugar !== undefined ? preset.sugar : '',
        price: 0
    }));
    saveData();
    render();

    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.dataset.tab === 'presets') {
        renderPresetsIndex();
    }

    showToast(`✅ "${preset.name}" добавлен в ${status === 'drank' ? 'выпитое' : 'коллекцию'}!`, 'success');
}

// --- BACKEND API & AUTH LOGIC ---
// По умолчанию: если страница открыта локально — обращаемся к localhost:3000,
// если сайт развёрнут на своём домене вместе с API — к тому же origin (/api).
// Можно переопределить: window.EH_API_URL = 'https://example.com/api'
const API_URL = (() => {
    if (window.EH_API_URL) return String(window.EH_API_URL).replace(/\/+$/, '');
    const isLocal = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);
    if (!isLocal && /^https?:$/.test(location.protocol)) return `${location.origin}/api`;
    return 'http://localhost:3000/api';
})();

const AUTH_TOKEN_KEY = 'eh_auth_token';
const AUTH_USERNAME_KEY = 'eh_username';

function readToken() {
    try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch (e) { return null; }
}
let authToken = readToken();

function authHeaders(extra = {}) {
    return authToken
        ? { ...extra, 'Authorization': `Bearer ${authToken}` }
        : { ...extra };
}

function clearAuthToken() {
    authToken = null;
    try {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USERNAME_KEY);
    } catch (e) { /* приватный режим */ }
}

async function checkAuth() {
    const authSection = document.getElementById('authSection');
    const profileSection = document.getElementById('profileSection');
    if (!authSection || !profileSection) return;

    if (!authToken) {
        authSection.style.display = 'block';
        profileSection.style.display = 'none';
        return;
    }
    
    try {
        const res = await fetchWithTimeout(`${API_URL}/profile`, { headers: authHeaders() }, 15000);

        // Токен реально протух/невалиден — только теперь сбрасываем сессию
        if (res.status === 401 || res.status === 403) {
            clearAuthToken();
            authSection.style.display = 'block';
            profileSection.style.display = 'none';
            showToast('Сессия истекла — войдите заново', 'error');
            return;
        }
        if (!res.ok) throw new Error(`Сервер вернул ${res.status}`);

        const data = await res.json();
        const profile = data.profile || {};
        const stats = data.stats || {};

        const username = profile.username || 'Пользователь';
        document.getElementById('profileUsernameName').textContent = username;
        document.getElementById('profileAvatar').textContent = username.charAt(0).toUpperCase();

        const createdAt = profile.created_at ? new Date(String(profile.created_at).replace(' ', 'T')) : null;
        document.getElementById('profileJoinDate').textContent = (createdAt && !isNaN(createdAt))
            ? createdAt.toLocaleDateString('ru-RU')
            : '—';

        document.getElementById('profileDrinkCountTotal').textContent = stats.totalDrinks || 0;
        document.getElementById('profileCaffeineCount').textContent = stats.totalCaffeine || 0;
        document.getElementById('profileSugarCount').textContent = stats.totalSugar || 0;

        let rank = 'Охотник-Новичок';
        const totalDrinks = stats.totalDrinks || 0;
        if (totalDrinks >= 100) rank = 'Мастер Энергии';
        else if (totalDrinks >= 50) rank = 'Элитный Дегустатор';
        else if (totalDrinks >= 20) rank = 'Опытный Охотник';
        else if (totalDrinks >= 5) rank = 'Любитель';

        document.getElementById('profileRank').textContent = rank;

        authSection.style.display = 'none';
        profileSection.style.display = 'block';
    } catch (err) {
        // Сервер недоступен/сеть упала — НЕ разлогиниваем: токен мог остаться валидным
        console.error(err);
        const online = navigator.onLine === false;
        showToast(
            online
                ? '📡 Нет подключения к интернету — облако недоступно'
                : `☁️ Облако недоступно (${API_URL}). Профиль не обновлён.`,
            'error'
        );
    }
}

function setAuthToken(token, username) {
    authToken = token;
    try {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        if (username) localStorage.setItem(AUTH_USERNAME_KEY, username);
    } catch (e) { /* приватный режим */ }
    checkAuth();
}

function logout() {
    clearAuthToken();
    checkAuth();
    showToast('Вы вышли из профиля', 'info');
}

async function authRequest(endpoint) {
    const userInput = document.getElementById('authUsername');
    const passInput = document.getElementById('authPassword');
    const user = userInput.value.trim();
    const pass = passInput.value;

    if (!user || !pass) return showToast('Введите логин и пароль', 'error');

    const isRegister = endpoint === 'register';
    if (isRegister) {
        const USERNAME_RE = /^[a-zA-Zа-яА-ЯёЁ0-9_\-.]{3,32}$/;
        if (!USERNAME_RE.test(user)) {
            return showToast('Имя: 3–32 символа, буквы, цифры, _ - .', 'error');
        }
        if (pass.length < 6) {
            return showToast('Пароль должен содержать минимум 6 символов', 'error');
        }
    }

    const submitBtns = [document.getElementById('loginBtn'), document.getElementById('registerBtn')].filter(Boolean);
    submitBtns.forEach(b => { b.disabled = true; });

    try {
        const res = await fetchWithTimeout(`${API_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        }, 15000);

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Ошибка авторизации');

        const name = data.username || user;
        if (data.token) {
            // Регистрация тоже возвращает токен — входим сразу, без повторного ввода пароля
            setAuthToken(data.token, name);
            passInput.value = '';
            showToast(isRegister ? `Добро пожаловать, ${name}!` : `С возвращением, ${name}!`, 'success');
        } else {
            showToast('Регистрация успешна! Теперь войдите.', 'success');
        }
    } catch (err) {
        showToast(err.message || 'Ошибка сети', 'error');
    } finally {
        submitBtns.forEach(b => { b.disabled = false; });
    }
}

document.getElementById('loginBtn')?.addEventListener('click', () => authRequest('login'));
document.getElementById('registerBtn')?.addEventListener('click', () => authRequest('register'));
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// Вход по Enter в полях авторизации
['authUsername', 'authPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); authRequest('login'); }
    });
});

// Разбиваем коллекцию на части: один запрос не должен упираться в лимит тела (20 МБ).
// Первая часть заменяет облачную копию, остальные дописываются.
function chunkDrinksForSync(items, maxBytes = 12 * 1024 * 1024, maxItems = 500) {
    const chunks = [];
    let current = [];
    let currentBytes = 0;

    items.forEach(item => {
        const size = JSON.stringify(item).length;
        if (current.length && (currentBytes + size > maxBytes || current.length >= maxItems)) {
            chunks.push(current);
            current = [];
            currentBytes = 0;
        }
        current.push(item);
        currentBytes += size;
    });

    if (current.length) chunks.push(current);
    return chunks;
}

document.getElementById('syncUpBtn')?.addEventListener('click', async () => {
    if (!authToken) return showToast('Необходима авторизация', 'error');
    if (!drinks.length) return showToast('⚠️ Локальная коллекция пуста — отправлять нечего', 'error');

    const btn = document.getElementById('syncUpBtn');
    const originalLabel = 'В облако';
    btn.disabled = true;

    const chunks = chunkDrinksForSync(drinks);
    let saved = 0;
    let skipped = 0;
    let droppedImages = 0;

    try {
        // Staging-протокол: чанки пишутся во временную таблицу,
        // основная облачная копия меняется только на isFinal.
        // Если середина упадёт — старые данные в облаке сохраняются.
        for (let i = 0; i < chunks.length; i++) {
            const isFirst = i === 0;
            const isFinal = i === chunks.length - 1;
            btn.textContent = chunks.length > 1 ? `⏳ ${i + 1}/${chunks.length}` : '⏳ ...';

            const res = await fetchWithTimeout(`${API_URL}/sync`, {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    drinks: chunks[i],
                    useStaging: true,
                    isFirst,
                    isFinal
                })
            }, 60000);

            if (res.status === 401 || res.status === 403) {
                clearAuthToken();
                checkAuth();
                throw new Error('Сессия истекла — войдите заново');
            }

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Ошибка синхронизации');

            saved += data.count !== undefined ? data.count : chunks[i].length;
            skipped += data.skipped || 0;
            droppedImages += data.droppedImages || 0;
        }

        const notes = [];
        if (skipped) notes.push(`пропущено: ${skipped}`);
        if (droppedImages) notes.push(`без фото (слишком большое): ${droppedImages}`);
        const suffix = notes.length ? ` (${notes.join(', ')})` : '';
        showToast(`✅ В облаке сохранено записей: ${saved}${suffix}`, 'success');
        checkAuth();
    } catch (err) {
        console.error(err);
        showToast(`❌ ${err.message || 'Ошибка синхронизации'}`, 'error');
    } finally {
        btn.textContent = originalLabel;
        btn.disabled = false;
    }
});

document.getElementById('syncDownBtn')?.addEventListener('click', async () => {
    if (!authToken) return showToast('Необходима авторизация', 'error');
    if (!confirm('Внимание! Текущие локальные данные будут перезаписаны данными из облака. Продолжить?')) return;

    const btn = document.getElementById('syncDownBtn');
    const originalLabel = 'Из облака';
    btn.textContent = '⏳ ...';
    btn.disabled = true;

    try {
        const res = await fetchWithTimeout(`${API_URL}/drinks`, { headers: authHeaders() }, 60000);

        if (res.status === 401 || res.status === 403) {
            clearAuthToken();
            checkAuth();
            throw new Error('Сессия истекла — войдите заново');
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Ошибка скачивания');

        const remote = Array.isArray(data.drinks) ? data.drinks : [];
        const seen = new Set();
        drinks = remote.map(raw => {
            const normalized = normalizeDrink(raw);
            if (seen.has(normalized.id)) normalized.id = generateId();
            seen.add(normalized.id);
            return normalized;
        });

        saveData();
        render();
        renderStats();
        showToast(`✅ Загружено ${drinks.length} записей из облака!`, 'success');
    } catch (err) {
        console.error(err);
        showToast(`❌ ${err.message || 'Ошибка скачивания'}`, 'error');
    } finally {
        btn.textContent = originalLabel;
        btn.disabled = false;
    }
});

// Рейтинг охотников (вкладка «Рейтинг») — раньше вкладка всегда показывала «Загрузка...»
async function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;

    list.innerHTML = '<div class="setting-card"><div class="setting-info"><p>⏳ Загрузка рейтинга...</p></div></div>';

    try {
        const res = await fetchWithTimeout(`${API_URL}/leaderboard`, {}, 15000);
        if (!res.ok) throw new Error(`Сервер вернул ${res.status}`);

        const data = await res.json();
        const rows = Array.isArray(data.leaderboard) ? data.leaderboard : [];

        if (!rows.length) {
            list.innerHTML = '<div class="setting-card"><div class="setting-info"><h3>Пока пусто 🏆</h3><p>Ещё никто не отправил коллекцию в облако. Станьте первым!</p></div></div>';
            return;
        }

        let myUsername = null;
        try { myUsername = localStorage.getItem(AUTH_USERNAME_KEY); } catch (e) { /* приватный режим */ }

        const medals = ['🥇', '🥈', '🥉'];
        list.innerHTML = rows.map((user, index) => {
            const count = Number(user.drink_count) || 0;
            const isMe = myUsername && user.username === myUsername;
            const place = medals[index] || `#${index + 1}`;
            const highlight = isMe ? ' border-color: rgba(var(--accent-rgb), 0.45); background: rgba(var(--accent-rgb), 0.06);' : '';

            return `
                <div class="setting-card" style="${highlight}">
                    <div class="setting-info" style="display: flex; align-items: center; gap: 14px;">
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 1.15rem; min-width: 42px; text-align: center; color: var(--accent);">${place}</span>
                        <div>
                            <h3 style="margin: 0;">${escapeHtml(user.username)}${isMe ? ' <span style="font-size: 0.7rem; color: var(--accent);">(вы)</span>' : ''}</h3>
                            <p style="margin: 0;">${count} ${pluralizeDrinks(count)} выпито в облаке</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        list.innerHTML = `<div class="setting-card"><div class="setting-info"><h3>Рейтинг недоступен</h3><p>Проверьте, запущен ли сервер: <span style="font-family: 'JetBrains Mono', monospace;">${escapeHtml(API_URL)}</span></p></div></div>`;
    }
}

document.getElementById('refreshLeaderboardBtn')?.addEventListener('click', renderLeaderboard);

// Обработчик вкладок один — см. initTabs()

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');

function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('open');
}

function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('open');
}

menuToggleBtn?.addEventListener('click', openSidebar);
closeSidebarBtn?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// Регистрация service worker: без неё sw.js лежал мёртвым грузом и офлайн-режим не включался
function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return; // file:// не поддерживает SW

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.warn('Service worker не зарегистрирован:', err && err.message);
        });
    });
}
