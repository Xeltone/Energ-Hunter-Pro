import { create } from "zustand";
import type { Drink, DrinkInput } from "./types";
import { emptyRating } from "./types";
import { todayISO } from "@/lib/utils";
import { PRESETS } from "./presets";

const LOCAL_KEY = "energy_hunter_local_v1";

function loadLocal(): Drink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Drink[];
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

function normalize(d: Drink): Drink {
  return { ...d, image: typeof d.image === "string" ? d.image : "" };
}

function saveLocal(drinks: Drink[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(drinks));
  } catch {
    /* private mode */
  }
}

type Tab = "collection" | "add" | "catalog" | "stats" | "board" | "profile";

type State = {
  drinks: Drink[];
  tab: Tab;
  signedIn: boolean;
  hydrated: boolean;
  setTab: (tab: Tab) => void;
  hydrateLocal: () => void;
  setCloud: (drinks: Drink[]) => void;
  setSignedIn: (v: boolean) => void;
  addDrink: (input: DrinkInput) => Drink;
  updateDrink: (id: string, input: DrinkInput) => void;
  deleteDrink: (id: string) => void;
  replaceAll: (drinks: Drink[]) => void;
  seedDemo: () => void;
};

export const useDrinks = create<State>((set, get) => ({
  drinks: [],
  tab: "collection",
  signedIn: false,
  hydrated: false,
  setTab: (tab) => set({ tab }),
  hydrateLocal: () => {
    if (get().hydrated) return;
    set({ drinks: loadLocal(), hydrated: true });
  },
  setCloud: (drinks) => set({ drinks, hydrated: true }),
  setSignedIn: (signedIn) => set({ signedIn }),
  addDrink: (input) => {
    const drink: Drink = {
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
      image: input.image || "",
    };
    const next = [drink, ...get().drinks];
    if (!get().signedIn) saveLocal(next);
    set({ drinks: next });
    return drink;
  },
  updateDrink: (id, input) => {
    const next = get().drinks.map((d) =>
      d.id === id
        ? {
            ...d,
            ...input,
            id,
            name: input.name.trim(),
            flavor: input.flavor.trim(),
          }
        : d,
    );
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
    const picks = [PRESETS[5], PRESETS[10], PRESETS[11], PRESETS[0]];
    const seeded: Drink[] = picks.map((p, i) => ({
      id: crypto.randomUUID(),
      name: p.name,
      flavor: p.flavor,
      status: i === 3 ? "collection" : "drank",
      date: todayISO(new Date(Date.now() - i * 86400000)),
      rating: { taste: 4 - (i % 2), effect: 4, design: 3 + (i % 2), value: 4 },
      notes: "",
      volume: p.volume,
      caffeine: p.caffeine,
      sugar: p.sugar,
      price: 120 + i * 15,
      store: "Пятёрочка",
    }));
    const next = [...seeded, ...get().drinks];
    if (!get().signedIn) saveLocal(next);
    set({ drinks: next });
  },
}));
