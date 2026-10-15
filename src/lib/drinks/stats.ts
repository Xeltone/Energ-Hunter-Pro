import type { Drink } from "./types";
import { overallRating } from "./types";

export const RANKS = [
  { name: "Искра", min: 0, next: 3 },
  { name: "Искатель", min: 3, next: 8 },
  { name: "Драйвер", min: 8, next: 20 },
  { name: "Охотник", min: 20, next: 50 },
  { name: "Мастер", min: 50, next: 100 },
  { name: "Властелин", min: 100, next: null },
] as const;

export function getRank(drankCount: number) {
  let current: (typeof RANKS)[number] = RANKS[0];
  for (const r of RANKS) {
    if (drankCount >= r.min) current = r;
  }
  return current;
}

export const ACHIEVEMENTS = [
  { id: "first_spark", name: "Первая искра", desc: "Добавить первый энергетик" },
  { id: "pure_energy", name: "Чистая энергия", desc: "Банка без сахара" },
  { id: "brand_lover", name: "Ценитель бренда", desc: "Три вкуса одного бренда" },
  { id: "max_charge", name: "Максимальный заряд", desc: "Оценка 4.5 и выше" },
  { id: "caffeine_monster", name: "Кофеиновый монстр", desc: "Больше 1000 мг кофеина" },
  { id: "investor", name: "Инвестор бодрости", desc: "Потратить больше 1000 ₽" },
  { id: "collector", name: "Коллекционер", desc: "5+ банок в коллекции" },
  { id: "veteran", name: "Ветеран охоты", desc: "50+ записей" },
  { id: "critic", name: "Критик", desc: "Оценить напиток на 1" },
  { id: "sugar_rush", name: "Сахарный удар", desc: "Банка с сахаром выше 55 г" },
] as const;

export function unlockedAchievements(drinks: Drink[]) {
  const unlocked = new Set<string>();
  if (drinks.length > 0) unlocked.add("first_spark");
  if (drinks.some((d) => d.sugar === 0)) unlocked.add("pure_energy");
  const brands = new Map<string, Set<string>>();
  for (const d of drinks) {
    if (!brands.has(d.name)) brands.set(d.name, new Set());
    if (d.flavor) brands.get(d.name)!.add(d.flavor.toLowerCase());
  }
  if ([...brands.values()].some((s) => s.size >= 3)) unlocked.add("brand_lover");
  if (drinks.some((d) => overallRating(d.rating) >= 4.5)) unlocked.add("max_charge");
  const caffeine = drinks
    .filter((d) => d.status === "drank")
    .reduce((s, d) => s + (d.caffeine || 0), 0);
  if (caffeine > 1000) unlocked.add("caffeine_monster");
  const spent = drinks.reduce((s, d) => s + (d.price || 0), 0);
  if (spent > 1000) unlocked.add("investor");
  if (drinks.filter((d) => d.status === "collection").length >= 5) unlocked.add("collector");
  if (drinks.length >= 50) unlocked.add("veteran");
  if (drinks.some((d) => overallRating(d.rating) === 1)) unlocked.add("critic");
  if (drinks.some((d) => (d.sugar ?? 0) > 55)) unlocked.add("sugar_rush");
  return unlocked;
}

export function summarize(drinks: Drink[]) {
  const drank = drinks.filter((d) => d.status === "drank");
  const rated = drinks.filter((d) => overallRating(d.rating) > 0);
  const avg =
    rated.length === 0
      ? 0
      : rated.reduce((s, d) => s + overallRating(d.rating), 0) / rated.length;
  const caffeine = drank.reduce((s, d) => s + (d.caffeine || 0), 0);
  const sugar = drank.reduce((s, d) => s + (d.sugar || 0), 0);
  const spent = drinks.reduce((s, d) => s + (d.price || 0), 0);
  const daily: Record<string, number> = {};
  for (const d of drank) {
    if (!d.date || !d.caffeine) continue;
    daily[d.date] = (daily[d.date] || 0) + d.caffeine;
  }
  const overdoseDays = Object.values(daily).filter((v) => v > 400).length;
  return {
    total: drinks.length,
    drank: drank.length,
    collection: drinks.filter((d) => d.status === "collection").length,
    avg: Math.round(avg * 10) / 10,
    caffeine: Math.round(caffeine),
    sugar: Math.round(sugar),
    spent: Math.round(spent),
    overdoseDays,
  };
}
