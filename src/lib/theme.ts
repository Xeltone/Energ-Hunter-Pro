export const THEMES = [
  { id: "amber", label: "Янтарь", color: "#ffb320" },
  { id: "cyan", label: "Циан", color: "#4fd8ec" },
  { id: "green", label: "Зелень", color: "#6fe09a" },
  { id: "purple", label: "Фиолет", color: "#b48cff" },
  { id: "orange", label: "Оранж", color: "#ffa24f" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const KEY = "energy_hunter_theme";

export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY);
    if (THEMES.some((t) => t.id === v)) return v as ThemeId;
  } catch {
    /* private mode */
  }
  return "amber";
}

export function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  if (id === "amber") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private mode */
  }
}
