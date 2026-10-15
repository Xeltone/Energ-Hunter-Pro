import { useState } from "react";
import { ImageOff, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Found = { url: string; title: string };

/** Поиск фото банки в Open Food Facts + ручной выбор. Только https-ссылки. */
export function ImagePicker({
  query,
  value,
  onChange,
}: {
  query: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found[] | null>(null);
  const [error, setError] = useState("");

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
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const url =
        "https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=12" +
        "&fields=product_name,brands,image_front_small_url,image_front_url" +
        `&search_terms=${encodeURIComponent(`${q} energy drink`)}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("bad status");
      const json = (await res.json()) as {
        products?: {
          product_name?: string;
          brands?: string;
          image_front_small_url?: string;
          image_front_url?: string;
        }[];
      };
      const list: Found[] = [];
      for (const p of json.products ?? []) {
        const img = p.image_front_small_url || p.image_front_url;
        if (img && /^https:\/\//i.test(img)) {
          list.push({ url: img, title: [p.brands, p.product_name].filter(Boolean).join(" · ") });
        }
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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-elevated text-subtle">
          {value ? (
            <img src={value} alt="" className="size-full object-contain" referrerPolicy="no-referrer" />
          ) : (
            <ImageOff className="size-5" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={search} disabled={busy}>
            <Search className="size-4" />
            {busy ? "Ищем…" : "Найти фото"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <X className="size-4" />
              Убрать
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-xs text-warn">{error}</p> : null}
      {found && found.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          {found.map((f) => (
            <li key={f.url}>
              <button
                type="button"
                title={f.title}
                onClick={() => {
                  onChange(f.url);
                  setFound(null);
                }}
                className="grid aspect-square w-full place-items-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-elevated hover:border-accent"
              >
                <img src={f.url} alt={f.title} loading="lazy" className="size-full object-contain" referrerPolicy="no-referrer" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
