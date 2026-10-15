import { z } from "zod";
import type { Drink } from "./types";

const ratingSchema = z.object({
  taste: z.number().min(0).max(5),
  effect: z.number().min(0).max(5),
  design: z.number().min(0).max(5),
  value: z.number().min(0).max(5),
});

export const drinkSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  flavor: z.string().trim().max(120).default(""),
  status: z.enum(["drank", "collection"]),
  date: z.string().max(10).default(""),
  rating: ratingSchema,
  notes: z.string().max(2000).default(""),
  volume: z.number().min(0).max(100),
  caffeine: z.number().min(0).max(100000),
  sugar: z.number().min(0).max(100000).nullable(),
  price: z.number().min(0).max(100000000),
  store: z.string().trim().max(120).default(""),
  image: z
    .string()
    .max(500)
    .refine((value) => value === "" || /^https:\/\//i.test(value), "image must be https")
    .default(""),
});

export const MAX_DRINKS = 2000;

export function parseDrinks(value: unknown): Drink[] {
  if (!Array.isArray(value)) throw new Error("Ожидался массив банок");
  if (value.length > MAX_DRINKS) throw new Error(`Максимум ${MAX_DRINKS} банок`);

  const parsed: Drink[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const result = drinkSchema.safeParse(item);
    if (!result.success || seen.has(result.data.id)) continue;
    seen.add(result.data.id);
    parsed.push(result.data);
  }
  return parsed;
}

export function mergeDrinks(local: Drink[], cloud: Drink[]): Drink[] {
  const byId = new Map<string, Drink>();
  for (const drink of cloud) byId.set(drink.id, drink);
  for (const drink of local) {
    if (!byId.has(drink.id)) byId.set(drink.id, drink);
  }
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
}
