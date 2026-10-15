import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Drink } from "./types";
import { drinkSchema } from "./data";

type DrinkRow = {
  id: string;
  name: string;
  flavor: string;
  status: string;
  date: string | null;
  taste: number;
  effect: number;
  design: number;
  value: number;
  notes: string;
  volume: number;
  caffeine: number;
  sugar: number | null;
  price: number;
  store: string;
  image_url: string | null;
};

function mapRow(r: DrinkRow): Drink {
  return {
    id: r.id,
    name: r.name,
    flavor: r.flavor || "",
    status: r.status === "collection" ? "collection" : "drank",
    date: r.date || "",
    rating: {
      taste: Number(r.taste) || 0,
      effect: Number(r.effect) || 0,
      design: Number(r.design) || 0,
      value: Number(r.value) || 0,
    },
    notes: r.notes || "",
    volume: Number(r.volume) || 0,
    caffeine: Number(r.caffeine) || 0,
    sugar: r.sugar === null || r.sugar === undefined ? null : Number(r.sugar),
    price: Number(r.price) || 0,
    store: r.store || "",
    image: r.image_url || "",
  };
}

export const listMyDrinks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<DrinkRow>`
      select id, name, flavor, status, date, taste, effect, design, value,
             notes, volume, caffeine, sugar, price, store, image_url
      from drinks
      where user_id = ${context.userId}
      order by date desc nulls last, created_at desc
    `;
    return rows.map(mapRow);
  });

export const upsertDrink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(drinkSchema)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into drinks (
        id, user_id, name, flavor, status, date, taste, effect, design, value,
        notes, volume, caffeine, sugar, price, store, image_url
      ) values (
        ${data.id}, ${context.userId}, ${data.name}, ${data.flavor}, ${data.status},
        ${data.date || null}, ${data.rating.taste}, ${data.rating.effect},
        ${data.rating.design}, ${data.rating.value}, ${data.notes},
        ${data.volume}, ${data.caffeine}, ${data.sugar}, ${data.price}, ${data.store}, ${data.image}
      )
      on conflict (id) do update set
        name = excluded.name,
        flavor = excluded.flavor,
        status = excluded.status,
        date = excluded.date,
        taste = excluded.taste,
        effect = excluded.effect,
        design = excluded.design,
        value = excluded.value,
        notes = excluded.notes,
        volume = excluded.volume,
        caffeine = excluded.caffeine,
        sugar = excluded.sugar,
        price = excluded.price,
        store = excluded.store,
        image_url = excluded.image_url
      where drinks.user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const removeDrink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from drinks where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const replaceMyDrinks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ drinks: z.array(drinkSchema).max(2000) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from drinks where user_id = ${context.userId}`;
    for (const d of data.drinks) {
      await sql`
        insert into drinks (
          id, user_id, name, flavor, status, date, taste, effect, design, value,
          notes, volume, caffeine, sugar, price, store, image_url
        ) values (
          ${d.id}, ${context.userId}, ${d.name}, ${d.flavor}, ${d.status},
          ${d.date || null}, ${d.rating.taste}, ${d.rating.effect},
          ${d.rating.design}, ${d.rating.value}, ${d.notes},
          ${d.volume}, ${d.caffeine}, ${d.sugar}, ${d.price}, ${d.store}, ${d.image}
        )
      `;
    }
    return { count: data.drinks.length };
  });

export const fetchLeaderboard = createServerFn({ method: "GET" }).handler(
  async () => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      drink_count: number;
    }>`
      select u.id, u.name, count(d.id)::int as drink_count
      from "user" u
      left join drinks d on d.user_id = u.id and d.status = 'drank'
      group by u.id, u.name
      order by drink_count desc, u.name asc
      limit 50
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      drinkCount: Number(r.drink_count) || 0,
    }));
  },
);
