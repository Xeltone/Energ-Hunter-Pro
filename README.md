# Energy Hunter Pro

Приложение для отслеживания энергетиков: коллекция напитков, замер кофеина, статистика и звёздные рейтинги. Full-stack на TanStack Start с SSR, PostgreSQL и PWA-поддержкой.

---

## ✨ Возможности

- 🥤 **Коллекция напитков** — добавляй энергетики с фото, брендом, объёмом и содержанием кофеина
- ☕ **Caffeine Meter** — визуальный замер кофеина в крови
- ⭐ **Рейтинги** — оценивай напитки звёздами
- 📊 **Статистика** — графики по потреблению (Recharts)
- 🖼️ **Image Picker** — загрузка и предпросмотр фото
- 🔐 **Аутентификация** — вход по email/паролю, серверные сессии
- 🌐 **P2P Multiplayer** — синхронизация между устройствами
- 📱 **PWA** — установка на телефон, офлайн-режим
- 🎨 **UI** — TailwindCSS + shadcn/ui, тёмная тема

---

## 🛠️ Стек

| Слой | Технологии |
|---|---|
| Фреймворк | [TanStack Start](https://tanstack.com/start) (React SSR) |
| Роутинг | TanStack Router |
| Сервер | [Nitro](https://nitro.build/) + [h3](https://h3.dev/) |
| БД | PostgreSQL / [PGlite](https://pglite.dev/) (встроенная) |
| Драйвер | `pg`, `pglite` |
| Валидация | [Zod](https://zod.dev/) |
| Состояние | [Zustand](https://zustand-demo.pmnd.rs/) |
| Стили | TailwindCSS v4 + shadcn/ui |
| Графики | Recharts |
| Формы | React Hook Form |
| Уведомления | Sonner |
| Иконки | lucide-react |
| Тесты | Playwright (e2e) |
| Деплой | Vercel |

---

## 📦 Установка

```bash
git clone https://github.com/Xeltone/Energ-Hunter-Pro.git
cd Energ-Hunter-Pro
npm install
