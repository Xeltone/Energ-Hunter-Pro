import { useMemo, useState } from "react";
import { PRESETS } from "@/lib/drinks/presets";
import type { Drink, DrinkStatus } from "@/lib/drinks/types";
import { emptyRating } from "@/lib/drinks/types";
import { todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Search } from "lucide-react";

export function Catalog({
  drinks,
  onAdd,
}: {
  drinks: Drink[];
  onAdd: (d: Drink) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rows = PRESETS.filter(
      (p) =>
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.flavor.toLowerCase().includes(query),
    );
    return rows.sort((a, b) => a.name.localeCompare(b.name, "ru") || a.flavor.localeCompare(b.flavor, "ru"));
  }, [q]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          className="pl-9"
          placeholder="Volt, Monster, Adrenaline…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => {
          const matches = drinks.filter(
            (d) =>
              d.name.toLowerCase() === p.name.toLowerCase() &&
              (d.flavor || "").toLowerCase() === p.flavor.toLowerCase(),
          );
          const unlocked = matches.length > 0;
          function add(status: DrinkStatus) {
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
              store: "",
            });
          }
          return (
            <li
              key={`${p.name}-${p.flavor}`}
              className={`rounded-[var(--radius-lg)] border border-border bg-surface p-4 ${
                unlocked ? "" : "opacity-70"
              }`}
            >
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted">{p.flavor}</p>
              <p className="mt-2 font-mono text-xs tabular-nums text-subtle">
                {p.volume} л · {p.caffeine} мг · {p.sugar} г сахара
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => add("drank")}>
                  Выпил
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => add("collection")}>
                  В коллекцию
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
