export type DrinkStatus = "drank" | "collection";

export type Rating = {
  taste: number;
  effect: number;
  design: number;
  value: number;
};

export type Drink = {
  id: string;
  name: string;
  flavor: string;
  status: DrinkStatus;
  date: string;
  rating: Rating;
  notes: string;
  volume: number;
  caffeine: number;
  sugar: number | null;
  price: number;
  store: string;
  /** https-ссылка на фото банки (необязательно). */
  image?: string;
};

export type DrinkInput = Omit<Drink, "id"> & { id?: string };

export function emptyRating(): Rating {
  return { taste: 0, effect: 0, design: 0, value: 0 };
}

export function overallRating(r: Rating) {
  const vals = [r.taste, r.effect, r.design, r.value].filter((v) => v > 0);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
