import { o as __toESM } from "../_runtime.mjs";
import { S as require_jsx_runtime, Y as require_react, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { F as object, R as string, k as array } from "../_libs/@better-auth/core+[...].mjs";
import { i as signOut, t as authClient } from "./client-1vAx-gM_.mjs";
import { a as hasGateSessionMarker } from "./server-B1U4EPLL.mjs";
import { a as Textarea, c as todayISO, i as Select, n as Input, o as cn, r as Label, s as pluralizeDrinks, t as Button } from "./field-NIjlA6MR.mjs";
import { c as Search, d as ImageOff, f as ChartColumn, i as Trophy, l as Plus, n as X, o as Trash2, p as BookOpen, r as UserRound, s as Star, t as Zap, u as LayoutGrid } from "../_libs/lucide-react.mjs";
import { i as parseDrinks, n as drinkSchema, r as mergeDrinks, t as authMiddleware } from "./data-CLTXxVDP.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { a as Bar, i as CartesianGrid, n as YAxis, o as ResponsiveContainer, r as XAxis, s as Tooltip, t as BarChart } from "../_libs/recharts+[...].mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DlWVNxDJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/** Render children only when a user is present (real session, or the disabled-auth dev user). */
function SignedIn({ children }) {
	const { user } = useCurrentUserState();
	return user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children }) : null;
}
/**
* Render children only once we KNOW the visitor is signed out (`isPending` has
* cleared and there is no user). Hidden while the session is still loading.
*/
function SignedOut({ children }) {
	const { user, isPending } = useCurrentUserState();
	if (isPending || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
function emptyRating() {
	return {
		taste: 0,
		effect: 0,
		design: 0,
		value: 0
	};
}
function overallRating(r) {
	const vals = [
		r.taste,
		r.effect,
		r.design,
		r.value
	].filter((v) => v > 0);
	if (!vals.length) return 0;
	return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
}
var PRESETS = [
	{
		name: "Adrenaline Rush",
		flavor: "Original",
		caffeine: 132,
		sugar: 54,
		volume: .45
	},
	{
		name: "Adrenaline Rush",
		flavor: "Cyber Orange",
		caffeine: 132,
		sugar: 50,
		volume: .45
	},
	{
		name: "Adrenaline Rush",
		flavor: "Ginseng & Lime",
		caffeine: 132,
		sugar: 52,
		volume: .45
	},
	{
		name: "Adrenaline Rush",
		flavor: "Zero Sugar",
		caffeine: 132,
		sugar: 0,
		volume: .45
	},
	{
		name: "Adrenaline Rush",
		flavor: "Guarana Berries",
		caffeine: 132,
		sugar: 51,
		volume: .45
	},
	{
		name: "Red Bull",
		flavor: "Original",
		caffeine: 80,
		sugar: 27,
		volume: .25
	},
	{
		name: "Red Bull",
		flavor: "Sugarfree",
		caffeine: 80,
		sugar: 0,
		volume: .25
	},
	{
		name: "Red Bull",
		flavor: "Yellow Edition",
		caffeine: 80,
		sugar: 27,
		volume: .25
	},
	{
		name: "Red Bull",
		flavor: "Red Edition",
		caffeine: 80,
		sugar: 27,
		volume: .25
	},
	{
		name: "Red Bull",
		flavor: "Blue Edition",
		caffeine: 80,
		sugar: 27,
		volume: .25
	},
	{
		name: "Monster Energy",
		flavor: "Original",
		caffeine: 150,
		sugar: 55,
		volume: .5
	},
	{
		name: "Monster Energy",
		flavor: "Ultra White",
		caffeine: 150,
		sugar: 0,
		volume: .5
	},
	{
		name: "Monster Energy",
		flavor: "Mango Loco",
		caffeine: 150,
		sugar: 60,
		volume: .5
	},
	{
		name: "Monster Energy",
		flavor: "Pipeline Punch",
		caffeine: 150,
		sugar: 45,
		volume: .5
	},
	{
		name: "Monster Energy",
		flavor: "Ultra Paradise",
		caffeine: 150,
		sugar: 0,
		volume: .5
	},
	{
		name: "Flash Up",
		flavor: "Original",
		caffeine: 135,
		sugar: 50,
		volume: .45
	},
	{
		name: "Flash Up",
		flavor: "Berry Mix",
		caffeine: 135,
		sugar: 48,
		volume: .45
	},
	{
		name: "Flash Up",
		flavor: "Mint & Lime",
		caffeine: 135,
		sugar: 46,
		volume: .45
	},
	{
		name: "Tornado Energy",
		flavor: "Active Original",
		caffeine: 135,
		sugar: 48,
		volume: .45
	},
	{
		name: "Tornado Energy",
		flavor: "Storm",
		caffeine: 135,
		sugar: 48,
		volume: .45
	},
	{
		name: "Tornado Energy",
		flavor: "Ice Berry",
		caffeine: 135,
		sugar: 45,
		volume: .45
	},
	{
		name: "Tornado Energy",
		flavor: "Coconut & Mango",
		caffeine: 135,
		sugar: 45,
		volume: .45
	},
	{
		name: "Burn",
		flavor: "Original",
		caffeine: 150,
		sugar: 58,
		volume: .449
	},
	{
		name: "Burn",
		flavor: "Apple & Kiwi",
		caffeine: 150,
		sugar: 58,
		volume: .449
	},
	{
		name: "Gorilla",
		flavor: "Original",
		caffeine: 135,
		sugar: 55,
		volume: .45
	},
	{
		name: "Gorilla",
		flavor: "Mango Coconut",
		caffeine: 135,
		sugar: 52,
		volume: .45
	},
	{
		name: "Gorilla",
		flavor: "Sugar Free",
		caffeine: 135,
		sugar: 0,
		volume: .45
	},
	{
		name: "E-ON",
		flavor: "Citrus Punch",
		caffeine: 135,
		sugar: 52,
		volume: .45
	},
	{
		name: "Genesis",
		flavor: "Purple Star",
		caffeine: 135,
		sugar: 48,
		volume: .45
	},
	{
		name: "Volt Energy",
		flavor: "Blue",
		caffeine: 135,
		sugar: 49,
		volume: .45
	},
	{
		name: "Volt Energy",
		flavor: "Zero Sugar",
		caffeine: 135,
		sugar: 0,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Classic (Классический): клюква и барбарис",
		caffeine: 150,
		sugar: 52,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Original Zero (Оригинал без сахара)",
		caffeine: 150,
		sugar: 0,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Blueberry (Черника)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Granat (Гранат)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Peach (Персик)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Peach Mango (Персик-манго)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Mango Coconut (Манго-кокос)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Cola (Кола)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Strawberry Bubblegum (Клубничная жвачка)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Malina Crush (Малина)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Strawberry Blueberry (Клубника-черника)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Berry Coconut (Ягоды и кокос)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Citrus Punch (Цитрусовый пунш)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Yuzu-Lime (Юдзу-лайм)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Kiwi-Apple (Киви-яблоко)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Apple Raspberry (Яблоко-малина)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Banana Strawberry (Банан-клубника)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Sour Energy (Кислый энергетик)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Sprite Skittles (Спрайт Скиттлс)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Sour Gummy Worms (Кислые мармеладные червячки)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "Lit Energy",
		flavor: "Mango Passionfruit (Манго-маракуйя)",
		caffeine: 150,
		sugar: 49,
		volume: .45
	},
	{
		name: "HotCat",
		flavor: "Multi-Fruit",
		caffeine: 135,
		sugar: 48,
		volume: .45
	},
	{
		name: "Coca-Cola Energy",
		flavor: "Original",
		caffeine: 140,
		sugar: 14,
		volume: .25
	},
	{
		name: "Coca-Cola Energy",
		flavor: "Zero Sugar",
		caffeine: 140,
		sugar: 0,
		volume: .25
	},
	{
		name: "Java Monster",
		flavor: "Original",
		caffeine: 100,
		sugar: 7,
		volume: .25
	},
	{
		name: "Java Monster",
		flavor: "Pineapple Smash",
		caffeine: 100,
		sugar: 7,
		volume: .25
	},
	{
		name: "Java Monster",
		flavor: "Black Cherry",
		caffeine: 100,
		sugar: 7,
		volume: .25
	},
	{
		name: "Cellucor",
		flavor: "Original",
		caffeine: 120,
		sugar: 0,
		volume: .25
	},
	{
		name: "Cellucor",
		flavor: "Peach",
		caffeine: 120,
		sugar: 0,
		volume: .25
	},
	{
		name: "Reign",
		flavor: "Original",
		caffeine: 200,
		sugar: 0,
		volume: .25
	},
	{
		name: "Reign",
		flavor: "Lime",
		caffeine: 200,
		sugar: 0,
		volume: .25
	},
	{
		name: "U-Boost",
		flavor: "Original",
		caffeine: 120,
		sugar: 8,
		volume: .25
	},
	{
		name: "U-Boost",
		flavor: "Citrus",
		caffeine: 120,
		sugar: 8,
		volume: .25
	},
	{
		name: "Bang Energy",
		flavor: "Original",
		caffeine: 150,
		sugar: 0,
		volume: .25
	},
	{
		name: "Bang Energy",
		flavor: "Lime",
		caffeine: 150,
		sugar: 0,
		volume: .25
	},
	{
		name: "Velocity",
		flavor: "Original",
		caffeine: 150,
		sugar: 5,
		volume: .25
	},
	{
		name: "Velocity",
		flavor: "Citrus",
		caffeine: 150,
		sugar: 5,
		volume: .25
	},
	{
		name: "Stinger",
		flavor: "Original",
		caffeine: 150,
		sugar: 18,
		volume: .25
	},
	{
		name: "Stinger",
		flavor: "Lime",
		caffeine: 150,
		sugar: 18,
		volume: .25
	},
	{
		name: "Baikal Energy",
		flavor: "Original",
		caffeine: 120,
		sugar: 20,
		volume: .25
	},
	{
		name: "Baikal Energy",
		flavor: "Lime",
		caffeine: 120,
		sugar: 20,
		volume: .25
	},
	{
		name: "Velo",
		flavor: "Original",
		caffeine: 150,
		sugar: 0,
		volume: .25
	},
	{
		name: "Velo",
		flavor: "Berry",
		caffeine: 150,
		sugar: 0,
		volume: .25
	},
	{
		name: "Fever Energy",
		flavor: "Original",
		caffeine: 140,
		sugar: 7,
		volume: .25
	},
	{
		name: "Fever Energy",
		flavor: "Orange",
		caffeine: 140,
		sugar: 7,
		volume: .25
	},
	{
		name: "Rockstar",
		flavor: "Original",
		caffeine: 160,
		sugar: 15,
		volume: .25
	},
	{
		name: "Rockstar",
		flavor: "Zero Sugar",
		caffeine: 160,
		sugar: 0,
		volume: .25
	},
	{
		name: "Rockstar",
		flavor: "Pomegranate",
		caffeine: 160,
		sugar: 15,
		volume: .25
	},
	{
		name: "Pitbull",
		flavor: "Original",
		caffeine: 150,
		sugar: 10,
		volume: .25
	},
	{
		name: "Pitbull",
		flavor: "Zero Sugar",
		caffeine: 150,
		sugar: 0,
		volume: .25
	},
	{
		name: "Pitbull",
		flavor: "Mango",
		caffeine: 150,
		sugar: 10,
		volume: .25
	},
	{
		name: "GU Energy",
		flavor: "Original",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "GU Energy",
		flavor: "Citrus",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "GU Energy",
		flavor: "Tropical",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "Nooc",
		flavor: "Original",
		caffeine: 160,
		sugar: 0,
		volume: .25
	},
	{
		name: "Nooc",
		flavor: "Cucumber",
		caffeine: 160,
		sugar: 0,
		volume: .25
	},
	{
		name: "Nooc",
		flavor: "Berry",
		caffeine: 160,
		sugar: 0,
		volume: .25
	},
	{
		name: "C4 Energy",
		flavor: "Original",
		caffeine: 140,
		sugar: 4,
		volume: .25
	},
	{
		name: "C4 Energy",
		flavor: "Mango",
		caffeine: 140,
		sugar: 4,
		volume: .25
	},
	{
		name: "C4 Energy",
		flavor: "Tropical",
		caffeine: 140,
		sugar: 4,
		volume: .25
	},
	{
		name: "Fuze",
		flavor: "Original",
		caffeine: 150,
		sugar: 8,
		volume: .25
	},
	{
		name: "Fuze",
		flavor: "Tropical",
		caffeine: 150,
		sugar: 8,
		volume: .25
	},
	{
		name: "Fuze",
		flavor: "Berry",
		caffeine: 150,
		sugar: 8,
		volume: .25
	},
	{
		name: "Full Throttle",
		flavor: "Original",
		caffeine: 180,
		sugar: 14,
		volume: .25
	},
	{
		name: "Full Throttle",
		flavor: "Citrus",
		caffeine: 180,
		sugar: 14,
		volume: .25
	},
	{
		name: "Spike",
		flavor: "Original",
		caffeine: 180,
		sugar: 14,
		volume: .25
	},
	{
		name: "Spike",
		flavor: "Citrus",
		caffeine: 180,
		sugar: 14,
		volume: .25
	},
	{
		name: "Spike",
		flavor: "Tropical",
		caffeine: 180,
		sugar: 14,
		volume: .25
	},
	{
		name: "Anarchy",
		flavor: "Original",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "Anarchy",
		flavor: "Lime",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "Anarchy",
		flavor: "Tropical",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "Xtreme Energy",
		flavor: "Original",
		caffeine: 170,
		sugar: 6,
		volume: .25
	},
	{
		name: "Xtreme Energy",
		flavor: "Citrus",
		caffeine: 170,
		sugar: 6,
		volume: .25
	},
	{
		name: "Xtreme Energy",
		flavor: "Tropical",
		caffeine: 170,
		sugar: 6,
		volume: .25
	},
	{
		name: "Thunder Energy",
		flavor: "Original",
		caffeine: 160,
		sugar: 8,
		volume: .25
	},
	{
		name: "Thunder Energy",
		flavor: "Citrus",
		caffeine: 160,
		sugar: 8,
		volume: .25
	},
	{
		name: "Thunder Energy",
		flavor: "Tropical",
		caffeine: 160,
		sugar: 8,
		volume: .25
	},
	{
		name: "Rogue Energy",
		flavor: "Original",
		caffeine: 200,
		sugar: 0,
		volume: .25
	},
	{
		name: "Rogue Energy",
		flavor: "Citrus",
		caffeine: 200,
		sugar: 0,
		volume: .25
	},
	{
		name: "Rogue Energy",
		flavor: "Tropical",
		caffeine: 200,
		sugar: 0,
		volume: .25
	},
	{
		name: "Jolt",
		flavor: "Original",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "Jolt",
		flavor: "Lime",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "Jolt",
		flavor: "Tropical",
		caffeine: 180,
		sugar: 0,
		volume: .25
	},
	{
		name: "Raptor Energy",
		flavor: "Original",
		caffeine: 170,
		sugar: 8,
		volume: .25
	},
	{
		name: "Raptor Energy",
		flavor: "Citrus",
		caffeine: 170,
		sugar: 8,
		volume: .25
	},
	{
		name: "Raptor Energy",
		flavor: "Tropical",
		caffeine: 170,
		sugar: 8,
		volume: .25
	}
];
var LOCAL_KEY = "energy_hunter_local_v1";
function loadLocal() {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(LOCAL_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.map(normalize) : [];
	} catch {
		return [];
	}
}
function normalize(d) {
	return {
		...d,
		image: typeof d.image === "string" ? d.image : ""
	};
}
function saveLocal(drinks) {
	try {
		localStorage.setItem(LOCAL_KEY, JSON.stringify(drinks));
	} catch {}
}
var useDrinks = create((set, get) => ({
	drinks: [],
	tab: "collection",
	signedIn: false,
	hydrated: false,
	setTab: (tab) => set({ tab }),
	hydrateLocal: () => {
		if (get().hydrated) return;
		set({
			drinks: loadLocal(),
			hydrated: true
		});
	},
	setCloud: (drinks) => set({
		drinks,
		hydrated: true
	}),
	setSignedIn: (signedIn) => set({ signedIn }),
	addDrink: (input) => {
		const drink = {
			id: input.id || crypto.randomUUID(),
			name: input.name.trim(),
			flavor: input.flavor.trim(),
			status: input.status,
			date: input.date || todayISO(),
			rating: input.rating ?? emptyRating(),
			notes: input.notes || "",
			volume: input.volume || 0,
			caffeine: input.caffeine || 0,
			sugar: input.sugar,
			price: input.price || 0,
			store: input.store || "",
			image: input.image || ""
		};
		const next = [drink, ...get().drinks];
		if (!get().signedIn) saveLocal(next);
		set({ drinks: next });
		return drink;
	},
	updateDrink: (id, input) => {
		const next = get().drinks.map((d) => d.id === id ? {
			...d,
			...input,
			id,
			name: input.name.trim(),
			flavor: input.flavor.trim()
		} : d);
		if (!get().signedIn) saveLocal(next);
		set({ drinks: next });
	},
	deleteDrink: (id) => {
		const next = get().drinks.filter((d) => d.id !== id);
		if (!get().signedIn) saveLocal(next);
		set({ drinks: next });
	},
	replaceAll: (incoming) => {
		const drinks = incoming.map(normalize);
		if (!get().signedIn) saveLocal(drinks);
		set({ drinks });
	},
	seedDemo: () => {
		const next = [...[
			PRESETS[5],
			PRESETS[10],
			PRESETS[11],
			PRESETS[0]
		].map((p, i) => ({
			id: crypto.randomUUID(),
			name: p.name,
			flavor: p.flavor,
			status: i === 3 ? "collection" : "drank",
			date: todayISO(/* @__PURE__ */ new Date(Date.now() - i * 864e5)),
			rating: {
				taste: 4 - i % 2,
				effect: 4,
				design: 3 + i % 2,
				value: 4
			},
			notes: "",
			volume: p.volume,
			caffeine: p.caffeine,
			sugar: p.sugar,
			price: 120 + i * 15,
			store: "Пятёрочка"
		})), ...get().drinks];
		if (!get().signedIn) saveLocal(next);
		set({ drinks: next });
	}
}));
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var listMyDrinks = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("287b075444be5964fd836f3befbf246ea73dc0f9e1df5b08302c2cb9bbda8322"));
var upsertDrink = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(drinkSchema).handler(createSsrRpc("77781f3d5ebacbba903b67db92a2fdf86c5b45a76db62fa313f0cfe4ea2289a3"));
var removeDrink = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ id: string().min(1) })).handler(createSsrRpc("76ee50bc2f54c5a3ccc71cddc7b0af5d39fa4d5f464d099b76b05fc5ea531440"));
var replaceMyDrinks = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ drinks: array(drinkSchema).max(2e3) })).handler(createSsrRpc("34936bc4b8fad7153f14ebf2d01e4e1aeae7233a4f0a58d4fe034f7f3c354f57"));
var fetchLeaderboard = createServerFn({ method: "GET" }).handler(createSsrRpc("91fc35a52635399969128db1f4df5b6a4f85f107c16339e8428d00a63e930905"));
function Stars({ value, onChange, size = 18 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center gap-0.5",
		"aria-hidden": !onChange,
		children: [
			1,
			2,
			3,
			4,
			5
		].map((n) => {
			const filled = n <= value;
			const icon = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, {
				style: {
					width: size,
					height: size
				},
				fill: filled ? "currentColor" : "none",
				strokeWidth: 1.6
			});
			const cls = filled ? "text-accent" : "text-subtle";
			if (!onChange) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cls,
				children: icon
			}, n);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => onChange(n === value ? 0 : n),
				className: cn("p-0.5", cls),
				"aria-label": `${n}`,
				children: icon
			}, n);
		})
	});
}
/** Поиск фото банки в Open Food Facts + ручной выбор. Только https-ссылки. */
function ImagePicker({ query, value, onChange }) {
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [found, setFound] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	async function search() {
		const q = query.trim();
		if (!q) {
			setError("Сначала введите бренд");
			return;
		}
		setBusy(true);
		setError("");
		setFound(null);
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), 9e3);
		try {
			const url = `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,image_front_small_url,image_front_url&search_terms=${encodeURIComponent(`${q} energy drink`)}`;
			const res = await fetch(url, { signal: ctrl.signal });
			if (!res.ok) throw new Error("bad status");
			const json = await res.json();
			const list = [];
			for (const p of json.products ?? []) {
				const img = p.image_front_small_url || p.image_front_url;
				if (img && /^https:\/\//i.test(img)) list.push({
					url: img,
					title: [p.brands, p.product_name].filter(Boolean).join(" · ")
				});
				if (list.length >= 8) break;
			}
			setFound(list);
			if (!list.length) setError("Фото не найдены");
		} catch {
			setError("Не удалось загрузить фото. Проверьте соединение.");
		} finally {
			clearTimeout(timer);
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid size-16 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-elevated text-subtle",
					children: value ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: value,
						alt: "",
						className: "size-full object-contain",
						referrerPolicy: "no-referrer"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageOff, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "outline",
						size: "sm",
						onClick: search,
						disabled: busy,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4" }), busy ? "Ищем…" : "Найти фото"]
					}), value ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "ghost",
						size: "sm",
						onClick: () => onChange(""),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), "Убрать"]
					}) : null]
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-warn",
				children: error
			}) : null,
			found && found.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid grid-cols-4 gap-2",
				children: found.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					title: f.title,
					onClick: () => {
						onChange(f.url);
						setFound(null);
					},
					className: "grid aspect-square w-full place-items-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-elevated hover:border-accent",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: f.url,
						alt: f.title,
						loading: "lazy",
						className: "size-full object-contain",
						referrerPolicy: "no-referrer"
					})
				}) }, f.url))
			})
		]
	});
}
function DrinkForm({ initial, submitLabel, onSubmit }) {
	const [name, setName] = (0, import_react.useState)(initial?.name ?? "");
	const [flavor, setFlavor] = (0, import_react.useState)(initial?.flavor ?? "");
	const [status, setStatus] = (0, import_react.useState)(initial?.status ?? "drank");
	const [date, setDate] = (0, import_react.useState)(initial?.date || todayISO());
	const [volume, setVolume] = (0, import_react.useState)(String(initial?.volume || .5));
	const [caffeine, setCaffeine] = (0, import_react.useState)(String(initial?.caffeine || ""));
	const [sugar, setSugar] = (0, import_react.useState)(initial?.sugar === null || initial?.sugar === void 0 ? "" : String(initial.sugar));
	const [price, setPrice] = (0, import_react.useState)(String(initial?.price || ""));
	const [store, setStore] = (0, import_react.useState)(initial?.store ?? "");
	const [notes, setNotes] = (0, import_react.useState)(initial?.notes ?? "");
	const [rating, setRating] = (0, import_react.useState)(initial?.rating ?? emptyRating());
	const [image, setImage] = (0, import_react.useState)(initial?.image ?? "");
	const [openSug, setOpenSug] = (0, import_react.useState)(false);
	const suggestions = (0, import_react.useMemo)(() => {
		const q = name.trim().toLowerCase();
		if (q.length < 1) return [];
		return PRESETS.filter((p) => p.name.toLowerCase().includes(q) || p.flavor.toLowerCase().includes(q)).slice(0, 6);
	}, [name]);
	function applyPreset(p) {
		setName(p.name);
		setFlavor(p.flavor);
		setCaffeine(String(p.caffeine));
		setSugar(String(p.sugar));
		setVolume(String(p.volume));
		setOpenSug(false);
	}
	function submit(e) {
		e.preventDefault();
		if (!name.trim()) return;
		const sugarNum = sugar === "" ? null : Number(sugar);
		onSubmit({
			id: initial?.id,
			name,
			flavor,
			status,
			date,
			rating,
			notes,
			volume: Number(volume) || 0,
			caffeine: Number(caffeine) || 0,
			sugar: sugarNum !== null && Number.isFinite(sugarNum) ? sugarNum : null,
			price: Number(price) || 0,
			store,
			image
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "name",
						children: "Бренд"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "name",
						value: name,
						required: true,
						autoComplete: "off",
						placeholder: "Red Bull, Monster…",
						onChange: (e) => {
							setName(e.target.value);
							setOpenSug(true);
						},
						onFocus: () => setOpenSug(true),
						onBlur: () => setTimeout(() => setOpenSug(false), 120)
					}),
					openSug && suggestions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-lg",
						children: suggestions.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-elevated",
							onMouseDown: (e) => e.preventDefault(),
							onClick: () => applyPreset(p),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium",
								children: p.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate text-muted",
								children: p.flavor
							})]
						}) }, `${p.name}-${p.flavor}`))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Фото банки" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePicker, {
				query: `${name} ${flavor}`.trim(),
				value: image,
				onChange: setImage
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "flavor",
				children: "Вкус"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "flavor",
				value: flavor,
				onChange: (e) => setFlavor(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Статус" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: status,
					onChange: (e) => setStatus(e.target.value),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "drank",
						children: "Выпил"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "collection",
						children: "В коллекции"
					})]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "date",
					children: "Дата"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "date",
					type: "date",
					value: date,
					onChange: (e) => setDate(e.target.value)
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Объём, л" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: volume,
						onChange: (e) => setVolume(e.target.value),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "0.5",
								children: "0.5"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "0.45",
								children: "0.45"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "0.33",
								children: "0.33"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "0.25",
								children: "0.25"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "0.449",
								children: "0.449"
							})
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "caffeine",
						children: "Кофеин, мг"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "caffeine",
						type: "number",
						min: 0,
						value: caffeine,
						onChange: (e) => setCaffeine(e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "sugar",
						children: "Сахар, г"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "sugar",
						type: "number",
						min: 0,
						placeholder: "не указан",
						value: sugar,
						onChange: (e) => setSugar(e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "price",
						children: "Цена, ₽"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "price",
						type: "number",
						min: 0,
						value: price,
						onChange: (e) => setPrice(e.target.value)
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "store",
				children: "Магазин"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "store",
				value: store,
				onChange: (e) => setStore(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-[var(--radius-lg)] border border-border bg-elevated p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-3 text-xs font-medium uppercase tracking-wide text-muted",
						children: "Оценки"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [
							["taste", "Вкус"],
							["effect", "Эффект"],
							["design", "Дизайн"],
							["value", "Цена/кач."]
						].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm text-muted",
								children: label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stars, {
								value: rating[key],
								onChange: (n) => setRating({
									...rating,
									[key]: n
								})
							})]
						}, key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-center font-mono text-sm tabular-nums text-muted",
						children: [
							"Среднее ",
							overallRating(rating).toFixed(1),
							" / 5"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "notes",
				children: "Заметки"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				id: "notes",
				value: notes,
				onChange: (e) => setNotes(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				className: "w-full",
				children: submitLabel
			})
		]
	});
}
var LIMIT = 400;
var SEGMENTS = 20;
/** Кофеин за сегодня: 20 сегментов по 20 мг, предел — 400 мг. */
function CaffeineMeter({ drinks }) {
	const today = todayISO();
	const mg = Math.round(drinks.filter((d) => d.status === "drank" && d.date === today).reduce((s, d) => s + (d.caffeine || 0), 0));
	const lit = Math.min(SEGMENTS, Math.ceil(mg / (LIMIT / SEGMENTS)));
	const over = mg > LIMIT;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		"aria-label": "Кофеин за сегодня",
		className: "mb-5 rounded-[var(--radius-lg)] border border-border bg-surface p-4 md:p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-end justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Кофеин сегодня"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: `font-display text-5xl font-bold leading-none tabular-nums md:text-6xl ${over ? "text-warn" : "text-fg"}`,
				children: [mg, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ml-1.5 text-xl font-semibold text-muted",
					children: "мг"
				})]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-[11rem] text-right text-xs text-muted",
				children: over ? `Выше нормы на ${mg - LIMIT} мг. На сегодня хватит.` : mg === 0 ? "Ни одной банки. Предел — 400 мг в день." : `До предела ${LIMIT - mg} мг (400 мг в день).`
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 flex gap-[3px]",
			role: "img",
			"aria-label": `${mg} из ${LIMIT} мг`,
			children: Array.from({ length: SEGMENTS }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-3 flex-1 rounded-[3px] ${i < lit ? over ? "bg-warn" : "bg-accent" : "bg-elevated"}` }, i))
		})]
	});
}
function Collection({ drinks, onAdd, onUpdate, onDelete, onSeed }) {
	const [q, setQ] = (0, import_react.useState)("");
	const [filter, setFilter] = (0, import_react.useState)("all");
	const [sort, setSort] = (0, import_react.useState)("date_desc");
	const [open, setOpen] = (0, import_react.useState)(null);
	const [editing, setEditing] = (0, import_react.useState)(false);
	const list = (0, import_react.useMemo)(() => {
		let rows = drinks;
		const query = q.trim().toLowerCase();
		if (query) rows = rows.filter((d) => d.name.toLowerCase().includes(query) || d.flavor.toLowerCase().includes(query) || d.store.toLowerCase().includes(query));
		if (filter === "drank") rows = rows.filter((d) => d.status === "drank");
		if (filter === "collection") rows = rows.filter((d) => d.status === "collection");
		if (filter === "rated") rows = rows.filter((d) => overallRating(d.rating) > 0);
		const copy = [...rows];
		copy.sort((a, b) => {
			if (sort === "date_asc") return (a.date || "").localeCompare(b.date || "");
			if (sort === "date_desc") return (b.date || "").localeCompare(a.date || "");
			if (sort === "rating_desc") return overallRating(b.rating) - overallRating(a.rating);
			return a.name.localeCompare(b.name, "ru");
		});
		return copy;
	}, [
		drinks,
		q,
		filter,
		sort
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CaffeineMeter, { drinks }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex flex-col gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					className: "pl-9",
					placeholder: "Поиск по бренду, вкусу, магазину",
					value: q,
					onChange: (e) => setQ(e.target.value)
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [[
					["all", "Все"],
					["drank", "Выпил"],
					["collection", "Коллекция"],
					["rated", "С оценкой"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setFilter(id),
					className: cn("h-9 rounded-full px-3 text-sm", filter === id ? "bg-accent text-accent-fg" : "bg-elevated text-muted"),
					children: label
				}, id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					className: "ml-auto h-9 w-auto min-w-36",
					value: sort,
					onChange: (e) => setSort(e.target.value),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "date_desc",
							children: "Сначала новые"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "date_asc",
							children: "Сначала старые"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "rating_desc",
							children: "По рейтингу"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "name_asc",
							children: "А–Я"
						})
					]
				})]
			})]
		}),
		list.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-14 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-lg font-medium",
					children: drinks.length ? "Ничего не найдено" : "Коллекция пуста"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto mt-2 max-w-sm text-sm text-muted",
					children: drinks.length ? "Попробуйте другой запрос или фильтр" : "Добавьте первую банку или загрузите примеры, чтобы посмотреть, как выглядит трекер."
				}),
				!drinks.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: onAdd,
						children: "Добавить банку"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: onSeed,
						children: "Примеры"
					})]
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid gap-3 sm:grid-cols-2",
			children: list.map((d) => {
				const ov = overallRating(d.rating);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setOpen(d);
						setEditing(false);
					},
					className: "flex w-full flex-col items-start rounded-[var(--radius-md)] border border-border bg-surface p-4 text-left transition-colors duration-150 hover:bg-elevated",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex w-full items-start justify-between gap-3",
						children: [
							d.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: d.image,
								alt: "",
								loading: "lazy",
								referrerPolicy: "no-referrer",
								className: "size-12 shrink-0 rounded-[var(--radius-sm)] bg-elevated object-contain"
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-xl font-semibold leading-tight",
									children: d.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: d.flavor || "без вкуса"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("shrink-0 rounded-full px-2 py-0.5 text-xs", d.status === "drank" ? "bg-success/15 text-success" : "bg-elevated text-muted"),
								children: d.status === "drank" ? "Выпил" : "Коллекция"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted",
						children: [
							ov > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stars, {
									value: Math.round(ov),
									size: 12
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono tabular-nums",
									children: ov.toFixed(1)
								})]
							}),
							d.volume ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [d.volume, " л"] }) : null,
							d.caffeine ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [d.caffeine, " мг"] }) : null,
							d.sugar !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [d.sugar, " г сахара"] }) : null,
							d.date ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono",
								children: d.date
							}) : null
						]
					})]
				}) }, d.id);
			})
		}),
		open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fixed inset-0 z-40 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6",
			onClick: () => setOpen(null),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "max-h-[92dvh] w-full overflow-y-auto rounded-t-[var(--radius-xl)] border border-border bg-surface p-5 sm:max-w-lg sm:rounded-[var(--radius-xl)]",
				onClick: (e) => e.stopPropagation(),
				children: editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrinkForm, {
					initial: open,
					submitLabel: "Сохранить",
					onSubmit: (data) => {
						onUpdate(open.id, {
							...open,
							...data,
							id: open.id
						});
						setOpen({
							...open,
							...data,
							id: open.id
						});
						setEditing(false);
					}
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xl font-semibold tracking-tight",
							children: open.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: open.flavor || "без вкуса"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-sm text-muted hover:text-fg",
							onClick: () => setOpen(null),
							children: "Закрыть"
						})]
					}),
					open.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: open.image,
						alt: "",
						referrerPolicy: "no-referrer",
						className: "mx-auto mt-4 h-40 object-contain"
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-5 grid grid-cols-2 gap-3 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spec, {
								label: "Объём",
								value: open.volume ? `${open.volume} л` : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spec, {
								label: "Кофеин",
								value: open.caffeine ? `${open.caffeine} мг` : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spec, {
								label: "Сахар",
								value: open.sugar === null ? "не указан" : `${open.sugar} г`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spec, {
								label: "Цена",
								value: open.price ? `${open.price} ₽` : "—"
							})
						]
					}),
					open.store ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-sm text-muted",
						children: ["Магазин: ", open.store]
					}) : null,
					open.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 rounded-[var(--radius-md)] bg-elevated p-3 text-sm",
						children: open.notes
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 font-mono text-xs text-subtle",
						children: open.date || "дата не указана"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "flex-1",
							onClick: () => setEditing(true),
							children: "Изменить"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "danger",
							onClick: () => {
								if (confirm(`Удалить «${open.name}»?`)) {
									onDelete(open.id);
									setOpen(null);
								}
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
						})]
					})
				] })
			})
		})
	] });
}
function Spec({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-md)] bg-elevated px-3 py-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "font-mono text-sm tabular-nums",
			children: value
		})]
	});
}
function Catalog({ drinks, onAdd }) {
	const [q, setQ] = (0, import_react.useState)("");
	const filtered = (0, import_react.useMemo)(() => {
		const query = q.trim().toLowerCase();
		return PRESETS.filter((p) => !query || p.name.toLowerCase().includes(query) || p.flavor.toLowerCase().includes(query)).sort((a, b) => a.name.localeCompare(b.name, "ru") || a.flavor.localeCompare(b.flavor, "ru"));
	}, [q]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative mb-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			className: "pl-9",
			placeholder: "Volt, Monster, Adrenaline…",
			value: q,
			onChange: (e) => setQ(e.target.value)
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "grid gap-3 sm:grid-cols-2",
		children: filtered.map((p) => {
			const unlocked = drinks.filter((d) => d.name.toLowerCase() === p.name.toLowerCase() && (d.flavor || "").toLowerCase() === p.flavor.toLowerCase()).length > 0;
			function add(status) {
				onAdd({
					id: crypto.randomUUID(),
					name: p.name,
					flavor: p.flavor,
					status,
					date: todayISO(),
					rating: emptyRating(),
					notes: "",
					volume: p.volume,
					caffeine: p.caffeine,
					sugar: p.sugar,
					price: 0,
					store: ""
				});
			}
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: `rounded-[var(--radius-lg)] border border-border bg-surface p-4 ${unlocked ? "" : "opacity-70"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: p.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: p.flavor
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-xs tabular-nums text-subtle",
						children: [
							p.volume,
							" л · ",
							p.caffeine,
							" мг · ",
							p.sugar,
							" г сахара"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							className: "flex-1",
							onClick: () => add("drank"),
							children: "Выпил"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "outline",
							className: "flex-1",
							onClick: () => add("collection"),
							children: "В коллекцию"
						})]
					})
				]
			}, `${p.name}-${p.flavor}`);
		})
	})] });
}
var RANKS = [
	{
		name: "Искра",
		min: 0,
		next: 3
	},
	{
		name: "Искатель",
		min: 3,
		next: 8
	},
	{
		name: "Драйвер",
		min: 8,
		next: 20
	},
	{
		name: "Охотник",
		min: 20,
		next: 50
	},
	{
		name: "Мастер",
		min: 50,
		next: 100
	},
	{
		name: "Властелин",
		min: 100,
		next: null
	}
];
function getRank(drankCount) {
	let current = RANKS[0];
	for (const r of RANKS) if (drankCount >= r.min) current = r;
	return current;
}
var ACHIEVEMENTS = [
	{
		id: "first_spark",
		name: "Первая искра",
		desc: "Добавить первый энергетик"
	},
	{
		id: "pure_energy",
		name: "Чистая энергия",
		desc: "Банка без сахара"
	},
	{
		id: "brand_lover",
		name: "Ценитель бренда",
		desc: "Три вкуса одного бренда"
	},
	{
		id: "max_charge",
		name: "Максимальный заряд",
		desc: "Оценка 4.5 и выше"
	},
	{
		id: "caffeine_monster",
		name: "Кофеиновый монстр",
		desc: "Больше 1000 мг кофеина"
	},
	{
		id: "investor",
		name: "Инвестор бодрости",
		desc: "Потратить больше 1000 ₽"
	},
	{
		id: "collector",
		name: "Коллекционер",
		desc: "5+ банок в коллекции"
	},
	{
		id: "veteran",
		name: "Ветеран охоты",
		desc: "50+ записей"
	},
	{
		id: "critic",
		name: "Критик",
		desc: "Оценить напиток на 1"
	},
	{
		id: "sugar_rush",
		name: "Сахарный удар",
		desc: "Банка с сахаром выше 55 г"
	}
];
function unlockedAchievements(drinks) {
	const unlocked = /* @__PURE__ */ new Set();
	if (drinks.length > 0) unlocked.add("first_spark");
	if (drinks.some((d) => d.sugar === 0)) unlocked.add("pure_energy");
	const brands = /* @__PURE__ */ new Map();
	for (const d of drinks) {
		if (!brands.has(d.name)) brands.set(d.name, /* @__PURE__ */ new Set());
		if (d.flavor) brands.get(d.name).add(d.flavor.toLowerCase());
	}
	if ([...brands.values()].some((s) => s.size >= 3)) unlocked.add("brand_lover");
	if (drinks.some((d) => overallRating(d.rating) >= 4.5)) unlocked.add("max_charge");
	if (drinks.filter((d) => d.status === "drank").reduce((s, d) => s + (d.caffeine || 0), 0) > 1e3) unlocked.add("caffeine_monster");
	if (drinks.reduce((s, d) => s + (d.price || 0), 0) > 1e3) unlocked.add("investor");
	if (drinks.filter((d) => d.status === "collection").length >= 5) unlocked.add("collector");
	if (drinks.length >= 50) unlocked.add("veteran");
	if (drinks.some((d) => overallRating(d.rating) === 1)) unlocked.add("critic");
	if (drinks.some((d) => (d.sugar ?? 0) > 55)) unlocked.add("sugar_rush");
	return unlocked;
}
function summarize(drinks) {
	const drank = drinks.filter((d) => d.status === "drank");
	const rated = drinks.filter((d) => overallRating(d.rating) > 0);
	const avg = rated.length === 0 ? 0 : rated.reduce((s, d) => s + overallRating(d.rating), 0) / rated.length;
	const caffeine = drank.reduce((s, d) => s + (d.caffeine || 0), 0);
	const sugar = drank.reduce((s, d) => s + (d.sugar || 0), 0);
	const spent = drinks.reduce((s, d) => s + (d.price || 0), 0);
	const daily = {};
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
		overdoseDays
	};
}
/** Рисует карточку статистики на canvas (без внешних библиотек). */
async function renderShareCard(s) {
	const W = 1080;
	const H = 1350;
	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas unavailable");
	const accent = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#ffb320";
	const font = "'Segoe UI', Inter, system-ui, sans-serif";
	ctx.fillStyle = "#0b0c10";
	ctx.fillRect(0, 0, W, H);
	const g = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 900);
	g.addColorStop(0, `${accent}55`);
	g.addColorStop(1, "transparent");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
	ctx.fillStyle = accent;
	ctx.font = `700 40px ${font}`;
	ctx.fillText("⚡ ENERGY HUNTER", 80, 120);
	ctx.fillStyle = "#f1f3f7";
	ctx.font = `700 96px ${font}`;
	ctx.fillText(s.name.slice(0, 18), 80, 300);
	ctx.fillStyle = accent;
	ctx.font = `600 52px ${font}`;
	ctx.fillText(s.rank, 80, 380);
	[
		["Выпито банок", String(s.drank)],
		["Кофеин, мг", String(s.caffeine)],
		["Сахар, г", String(s.sugar)],
		["Средняя оценка", s.avg.toFixed(1)],
		["Потрачено, ₽", String(s.spent)]
	].forEach(([label, value], i) => {
		const y = 520 + i * 150;
		ctx.fillStyle = "#14161c";
		ctx.beginPath();
		ctx.roundRect(80, y - 80, 920, 120, 28);
		ctx.fill();
		ctx.fillStyle = "#8b919d";
		ctx.font = `500 36px ${font}`;
		ctx.fillText(label, 120, y - 8);
		ctx.fillStyle = "#f1f3f7";
		ctx.font = `700 56px ${font}`;
		ctx.textAlign = "right";
		ctx.fillText(value, 960, y - 2);
		ctx.textAlign = "left";
	});
	return new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(/* @__PURE__ */ new Error("toBlob failed")), "image/png"));
}
/** Системное «Поделиться» с файлом, иначе — скачивание PNG. */
async function shareStatsCard(s) {
	const blob = await renderShareCard(s);
	const file = new File([blob], "energy-hunter.png", { type: "image/png" });
	if (navigator.canShare?.({ files: [file] })) try {
		await navigator.share({
			files: [file],
			title: "Моя статистика Energy Hunter"
		});
		return "shared";
	} catch (e) {
		if (e.name === "AbortError") return "shared";
	}
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = "energy-hunter.png";
	a.click();
	URL.revokeObjectURL(a.href);
	return "downloaded";
}
function StatsView({ drinks, name }) {
	const summary = summarize(drinks);
	const rank = getRank(summary.drank);
	const unlocked = unlockedAchievements(drinks);
	const progress = rank.next == null ? 100 : Math.min(100, (summary.drank - rank.min) / (rank.next - rank.min) * 100);
	const brandData = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const d of drinks) map.set(d.name, (map.get(d.name) || 0) + 1);
		return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, n]) => ({
			name,
			n
		}));
	}, [drinks]);
	const ratingData = (0, import_react.useMemo)(() => {
		const buckets = [
			1,
			2,
			3,
			4,
			5
		].map((k) => ({
			star: `${k}`,
			n: 0
		}));
		for (const d of drinks) {
			const r = Math.round(overallRating(d.rating));
			if (r >= 1 && r <= 5) buckets[r - 1].n += 1;
		}
		return buckets;
	}, [drinks]);
	if (!drinks.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-14 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-lg font-medium",
			children: "Пока нет статистики"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Добавьте банки — появятся графики, ранг и достижения."
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			summary.overdoseDays > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-[var(--radius-md)] border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn",
				children: [
					"В ",
					summary.overdoseDays,
					" дн. суммарный кофеин превысил 400 мг. Следите за нагрузкой."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-[var(--radius-xl)] border border-border bg-surface p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-wide text-muted",
						children: "Ранг"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-display text-5xl font-bold leading-none tracking-tight",
						children: rank.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: ["Выпито ", summary.drank]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 h-1.5 overflow-hidden rounded-full bg-elevated",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full rounded-full bg-accent",
							style: { width: `${progress}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-subtle",
						children: rank.next == null ? "Максимальный ранг" : `До следующего осталось ${rank.next - summary.drank}`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: "sm",
					onClick: () => shareStatsCard({
						name: name || "Охотник",
						rank: rank.name,
						drank: summary.drank,
						caffeine: summary.caffeine,
						sugar: summary.sugar,
						avg: summary.avg,
						spent: summary.spent
					}).then((r) => r === "downloaded" && toast.success("Картинка сохранена")).catch(() => toast.error("Не удалось создать картинку")),
					children: "Поделиться статистикой"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						value: String(summary.total),
						label: "Записей"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						value: summary.avg.toFixed(1),
						label: "Средняя оценка"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						value: `${summary.caffeine}`,
						label: "мг кофеина"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						value: `${summary.spent}`,
						label: "₽ потрачено"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heatmap, { drinks }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCard, {
					title: "Оценки",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: 220,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
							data: ratingData,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									stroke: "rgba(241,243,247,0.06)",
									vertical: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "star",
									stroke: "#8b919d",
									fontSize: 12,
									tickLine: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									allowDecimals: false,
									stroke: "#8b919d",
									fontSize: 12,
									tickLine: false,
									width: 28
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
									background: "#14161c",
									border: "1px solid rgba(241,243,247,0.12)",
									borderRadius: 8
								} }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
									dataKey: "n",
									fill: "var(--color-accent)",
									radius: [
										4,
										4,
										0,
										0
									]
								})
							]
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCard, {
					title: "Бренды",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: 220,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
							data: brandData,
							layout: "vertical",
							margin: { left: 16 },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									stroke: "rgba(241,243,247,0.06)",
									horizontal: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									type: "number",
									allowDecimals: false,
									hide: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									type: "category",
									dataKey: "name",
									stroke: "#8b919d",
									fontSize: 11,
									width: 110,
									tickLine: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
									background: "#14161c",
									border: "1px solid rgba(241,243,247,0.12)",
									borderRadius: 8
								} }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
									dataKey: "n",
									fill: "var(--color-accent)",
									radius: [
										0,
										4,
										4,
										0
									]
								})
							]
						})
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
				className: "mb-3 text-sm font-medium text-muted",
				children: [
					"Достижения ",
					unlocked.size,
					"/",
					ACHIEVEMENTS.length
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2 sm:grid-cols-3",
				children: ACHIEVEMENTS.map((a) => {
					const on = unlocked.has(a.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `rounded-[var(--radius-md)] border px-3 py-3 ${on ? "border-border bg-elevated" : "border-border/60 bg-surface opacity-45"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: a.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted",
							children: a.desc
						})]
					}, a.id);
				})
			})] })
		]
	});
}
function Stat({ value, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-4xl font-bold leading-none tabular-nums",
			children: value
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-xs text-muted",
			children: label
		})]
	});
}
function ChartCard({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-xl)] border border-border bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 text-sm font-medium",
			children: title
		}), children]
	});
}
function Heatmap({ drinks }) {
	const counts = {};
	for (const d of drinks) if (d.status === "drank" && d.date) counts[d.date] = (counts[d.date] || 0) + 1;
	const weeks = 16;
	const today = /* @__PURE__ */ new Date();
	const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const mondayOffset = (todayLocal.getDay() + 6) % 7;
	const first = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate() - mondayOffset - 105);
	const cells = Array.from({ length: 112 }, (_, i) => {
		const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
		const key = todayISO(day);
		return {
			key,
			count: counts[key] || 0,
			future: day > todayLocal
		};
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-xl)] border border-border bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-3 text-sm font-medium",
			children: "Календарь охоты"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-[3px]",
			style: {
				gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
				gridAutoFlow: "column"
			},
			children: cells.map((c) => {
				const level = c.count >= 4 ? 4 : c.count;
				const bg = c.future ? "transparent" : level === 0 ? "var(--color-elevated)" : `color-mix(in oklab, var(--color-accent) ${[
					0,
					30,
					55,
					80,
					100
				][level]}%, var(--color-elevated))`;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					title: `${c.key}: ${c.count}`,
					className: "aspect-square rounded-[2px]",
					style: { background: bg }
				}, c.key);
			})
		})]
	});
}
function Board({ myName }) {
	const [rows, setRows] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let alive = true;
		fetchLeaderboard().then((data) => {
			if (alive) setRows(data);
		}).catch(() => {
			if (alive) setError(true);
		});
		return () => {
			alive = false;
		};
	}, []);
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-10 text-center text-sm text-muted",
		children: "Рейтинг пока недоступен."
	});
	if (!rows) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse rounded-[var(--radius-xl)] bg-surface" });
	if (!rows.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-10 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "font-medium",
			children: "Пока пусто"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Войдите и сохраните коллекцию — займёте место в таблице."
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "space-y-2",
		children: rows.map((u, i) => {
			const me = myName && u.name === myName;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: `flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 ${me ? "border-accent/40" : ""}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-8 font-mono text-sm tabular-nums text-muted",
					children: i + 1
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "truncate font-medium",
						children: [u.name, me ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 text-xs text-muted",
							children: "вы"
						}) : null]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							u.drinkCount,
							" ",
							pluralizeDrinks(u.drinkCount),
							" выпито"
						]
					})]
				})]
			}, u.id);
		})
	});
}
var THEMES = [
	{
		id: "amber",
		label: "Янтарь",
		color: "#ffb320"
	},
	{
		id: "cyan",
		label: "Циан",
		color: "#4fd8ec"
	},
	{
		id: "green",
		label: "Зелень",
		color: "#6fe09a"
	},
	{
		id: "purple",
		label: "Фиолет",
		color: "#b48cff"
	},
	{
		id: "orange",
		label: "Оранж",
		color: "#ffa24f"
	}
];
var KEY = "energy_hunter_theme";
function getStoredTheme() {
	try {
		const v = localStorage.getItem(KEY);
		if (THEMES.some((t) => t.id === v)) return v;
	} catch {}
	return "amber";
}
function applyTheme(id) {
	const root = document.documentElement;
	if (id === "amber") root.removeAttribute("data-theme");
	else root.setAttribute("data-theme", id);
	try {
		localStorage.setItem(KEY, id);
	} catch {}
}
var NAV = [
	{
		id: "collection",
		label: "Коллекция",
		icon: LayoutGrid
	},
	{
		id: "add",
		label: "Добавить",
		icon: Plus
	},
	{
		id: "catalog",
		label: "Индекс",
		icon: BookOpen
	},
	{
		id: "stats",
		label: "Статистика",
		icon: ChartColumn
	},
	{
		id: "board",
		label: "Рейтинг",
		icon: Trophy
	},
	{
		id: "profile",
		label: "Профиль",
		icon: UserRound
	}
];
function Home() {
	const { user, isPending } = useCurrentUserState();
	const drinks = useDrinks((s) => s.drinks);
	const tab = useDrinks((s) => s.tab);
	const setTab = useDrinks((s) => s.setTab);
	const hydrated = useDrinks((s) => s.hydrated);
	const cloudLoaded = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		applyTheme(getStoredTheme());
	}, []);
	(0, import_react.useEffect)(() => {
		if (isPending) return;
		if (user) {
			useDrinks.getState().setSignedIn(true);
			if (!cloudLoaded.current) {
				cloudLoaded.current = true;
				listMyDrinks().then((cloud) => {
					const local = useDrinks.getState().drinks;
					const merged = mergeDrinks(local, cloud);
					if (local.length > 0 && cloud.length > 0) {
						useDrinks.getState().setCloud(merged);
						toast.success("Локальная и облачная коллекции объединены");
					} else if (local.length > 0) {
						replaceMyDrinks({ data: { drinks: local } });
						useDrinks.getState().setCloud(local);
						toast.success("Локальная коллекция сохранена в облако");
					} else useDrinks.getState().setCloud(cloud);
				}).catch(() => {
					useDrinks.getState().hydrateLocal();
				});
			}
		} else {
			cloudLoaded.current = false;
			useDrinks.getState().setSignedIn(false);
			useDrinks.getState().hydrateLocal();
		}
	}, [user, isPending]);
	async function persistNew(drink) {
		useDrinks.getState().addDrink(drink);
		if (user) try {
			await upsertDrink({ data: drink });
		} catch {
			toast.error("Не удалось сохранить в облако");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-dvh max-w-6xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				theme: "dark",
				position: "top-center"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-3 py-6 md:flex",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-8 flex items-center gap-2 px-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid size-8 place-items-center rounded-[var(--radius-sm)] bg-accent text-accent-fg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "size-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display text-xl font-bold tracking-tight",
							children: "Energy Hunter"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "flex flex-1 flex-col gap-1",
						children: NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setTab(item.id),
							className: cn("relative flex h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm", tab === item.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg"),
							children: [
								tab === item.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: cn("size-4", tab === item.id && "text-accent") }),
								item.label
							]
						}, item.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSlot, { pending: isPending })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center justify-between px-4 py-4 md:px-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-3xl font-bold leading-none tracking-tight md:text-5xl",
						children: NAV.find((n) => n.id === tab)?.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-xs text-muted md:text-sm",
						children: "Отслеживай банки, оценки и кофеин"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "md:hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSlot, {
							pending: isPending,
							compact: true
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "flex-1 px-4 pb-24 md:px-8 md:pb-10",
					children: !hydrated ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse rounded-[var(--radius-xl)] bg-surface" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						tab === "collection" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Collection, {
							drinks,
							onAdd: () => setTab("add"),
							onSeed: () => {
								useDrinks.getState().seedDemo();
								const next = useDrinks.getState().drinks;
								if (user) replaceMyDrinks({ data: { drinks: next } });
								toast.success("Добавлены примеры");
							},
							onUpdate: (id, data) => {
								useDrinks.getState().updateDrink(id, data);
								if (user) upsertDrink({ data });
							},
							onDelete: (id) => {
								useDrinks.getState().deleteDrink(id);
								if (user) removeDrink({ data: { id } });
								toast("Запись удалена");
							}
						}),
						tab === "add" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto max-w-lg rounded-[var(--radius-xl)] border border-border bg-surface p-5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrinkForm, {
								submitLabel: "Добавить в коллекцию",
								onSubmit: (data) => {
									const drink = useDrinks.getState().addDrink(data);
									if (user) upsertDrink({ data: drink });
									toast.success("Добавлено");
									setTab("collection");
								}
							})
						}),
						tab === "catalog" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Catalog, {
							drinks,
							onAdd: (d) => {
								persistNew(d);
								toast.success(`${d.name} добавлен`);
							}
						}),
						tab === "stats" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsView, {
							drinks,
							name: user?.displayName
						}),
						tab === "board" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, { myName: user?.displayName }),
						tab === "profile" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfilePanel, {})
					] })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden",
				children: NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setTab(item.id),
					className: cn("flex h-14 flex-1 flex-col items-center justify-center gap-1 border-t-2 text-[10px]", tab === item.id ? "border-accent text-fg" : "border-transparent text-subtle"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "size-4" }), item.label]
				}, item.id))
			})
		]
	});
}
function AuthSlot({ pending, compact }) {
	if (pending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-8 animate-pulse rounded-full bg-elevated" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/login",
		className: cn("inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-accent px-3 text-sm font-medium text-accent-fg", compact && "px-2.5"),
		children: "Войти"
	}) })] });
}
function ProfilePanel() {
	const user = useCurrentUser();
	const drinks = useDrinks((s) => s.drinks);
	const summary = summarize(drinks);
	const rank = getRank(summary.drank);
	const [theme, setTheme] = (0, import_react.useState)("amber");
	(0, import_react.useEffect)(() => setTheme(getStoredTheme()), []);
	const shownName = user?.displayName ?? user?.primaryEmail ?? "";
	const since = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric"
	}) : null;
	function exportJson() {
		const blob = new Blob([JSON.stringify(drinks, null, 2)], { type: "application/json" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "energy-hunter.json";
		a.click();
		URL.revokeObjectURL(a.href);
	}
	function importJson() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const parsed = JSON.parse(await file.text());
				const imported = parseDrinks(parsed);
				useDrinks.getState().replaceAll(imported);
				const next = useDrinks.getState().drinks;
				if (useDrinks.getState().signedIn) await replaceMyDrinks({ data: { drinks: next } });
				toast.success(`Импортировано ${imported.length} банок`);
			} catch {
				toast.error("Не удалось прочитать файл");
			}
		};
		input.click();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-lg space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-[var(--radius-xl)] border border-border bg-surface p-5",
				children: user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-4",
					children: [user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: user.profileImageUrl,
						alt: "",
						referrerPolicy: "no-referrer",
						className: "size-16 rounded-full object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid size-16 place-items-center rounded-full bg-accent text-2xl font-semibold text-accent-fg",
						children: (shownName[0] ?? "?").toUpperCase()
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs uppercase tracking-wide text-muted",
								children: "Охотник"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-display text-4xl font-bold leading-none tracking-tight",
								children: shownName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [rank.name, since ? ` · в гильдии с ${since}` : ""]
							})
						]
					})]
				}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-lg font-medium",
						children: "Гостевой режим"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "Коллекция хранится на этом устройстве. Войдите, чтобы синхронизировать её между устройствами и попасть в рейтинг."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						className: "mt-4 inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-medium text-accent-fg",
						children: "Войти в облако"
					})
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-3 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
						n: summary.total,
						l: "банок"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
						n: summary.caffeine,
						l: "мг"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
						n: summary.sugar,
						l: "г сахара"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-[var(--radius-xl)] border border-border bg-surface p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 text-xs font-medium uppercase tracking-wide text-muted",
					children: "Тема"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-3",
					children: THEMES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": t.label,
						title: t.label,
						onClick: () => {
							setTheme(t.id);
							applyTheme(t.id);
						},
						className: cn("size-9 rounded-full border-2", theme === t.id ? "border-fg" : "border-transparent"),
						style: { background: t.color }
					}, t.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-11 rounded-[var(--radius-sm)] border border-border text-sm hover:bg-elevated",
					onClick: exportJson,
					children: "Экспорт JSON"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-11 rounded-[var(--radius-sm)] border border-border text-sm hover:bg-elevated",
					onClick: importJson,
					children: "Импорт JSON"
				})]
			})
		]
	});
}
function Mini({ n, l }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-3 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl font-bold tabular-nums leading-none",
			children: n
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-xs text-muted",
			children: l
		})]
	});
}
//#endregion
export { Home as component };
