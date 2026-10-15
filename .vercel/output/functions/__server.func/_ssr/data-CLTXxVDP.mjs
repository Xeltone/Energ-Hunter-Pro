import { n as createMiddleware } from "./ssr.mjs";
import { D as _enum, F as object, P as number, R as string } from "../_libs/@better-auth/core+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/data-CLTXxVDP.js
/**
* Auth middleware for server functions — the standard way to get the caller's
* verified user id. When deployed the session cookie is same-origin and rides
* along automatically. In the live preview the client also forwards the bearer
* token (partitioned cookies) via the `.client` hook below — call sites do not
* thread it themselves.
*
*   import { createServerFn } from "@tanstack/react-start";
*   import { getSql } from "@/lib/db";
*   import { authMiddleware } from "@/lib/auth/middleware";
*
*   export const listTodos = createServerFn({ method: "GET" })
*     .middleware([authMiddleware])
*     .handler(async ({ context }) => {
*       const sql = await getSql();
*       return sql`select * from todos where user_id = ${context.userId}`;
*     });
*
* Signed out with auth on (live preview included) -> throws `UnauthorizedError`
* (see `verify.server.ts`). With auth disabled (`VITE_AUTH_ENABLED=false`, the
* shipped default) it resolves the shared dev user — but throws instead when a
* `DATABASE_URL` is also set, so an app without sign-in must not use this at
* all. On the auth-on path, use it on every server function that touches
* per-user data and scope every query by `context.userId`.
*/
var authMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) => {
	const { getBearerToken } = await import("./client-1vAx-gM_.mjs").then((n) => n.n);
	return next({ sendContext: { bearerToken: getBearerToken() ?? void 0 } });
}).server(async ({ next, context }) => {
	const { assertSameSiteRequest } = await import("./isolation.server-CGNg1r0B.mjs");
	const { requireUserId } = await import("./verify.server-BV_JzbgA.mjs");
	assertSameSiteRequest();
	return next({ context: { userId: await requireUserId(context.bearerToken) } });
});
var ratingSchema = object({
	taste: number().min(0).max(5),
	effect: number().min(0).max(5),
	design: number().min(0).max(5),
	value: number().min(0).max(5)
});
var drinkSchema = object({
	id: string().min(1).max(64),
	name: string().trim().min(1).max(120),
	flavor: string().trim().max(120).default(""),
	status: _enum(["drank", "collection"]),
	date: string().max(10).default(""),
	rating: ratingSchema,
	notes: string().max(2e3).default(""),
	volume: number().min(0).max(100),
	caffeine: number().min(0).max(1e5),
	sugar: number().min(0).max(1e5).nullable(),
	price: number().min(0).max(1e8),
	store: string().trim().max(120).default(""),
	image: string().max(500).refine((value) => value === "" || /^https:\/\//i.test(value), "image must be https").default("")
});
var MAX_DRINKS = 2e3;
function parseDrinks(value) {
	if (!Array.isArray(value)) throw new Error("Ожидался массив банок");
	if (value.length > 2e3) throw new Error(`Максимум ${MAX_DRINKS} банок`);
	const parsed = [];
	const seen = /* @__PURE__ */ new Set();
	for (const item of value) {
		const result = drinkSchema.safeParse(item);
		if (!result.success || seen.has(result.data.id)) continue;
		seen.add(result.data.id);
		parsed.push(result.data);
	}
	return parsed;
}
function mergeDrinks(local, cloud) {
	const byId = /* @__PURE__ */ new Map();
	for (const drink of cloud) byId.set(drink.id, drink);
	for (const drink of local) if (!byId.has(drink.id)) byId.set(drink.id, drink);
	return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
}
//#endregion
export { parseDrinks as i, drinkSchema as n, mergeDrinks as r, authMiddleware as t };
