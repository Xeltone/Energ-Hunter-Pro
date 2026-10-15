import { useEffect, useState } from "react";
import { fetchLeaderboard } from "@/lib/drinks/server";
import { pluralizeDrinks } from "@/lib/utils";

export function Board({ myName }: { myName?: string | null }) {
  const [rows, setRows] = useState<{ id: string; name: string; drinkCount: number }[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchLeaderboard()
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-10 text-center text-sm text-muted">
        Рейтинг пока недоступен.
      </div>
    );
  }
  if (!rows) {
    return (
      <div className="h-40 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-10 text-center">
        <h3 className="font-medium">Пока пусто</h3>
        <p className="mt-2 text-sm text-muted">Войдите и сохраните коллекцию — займёте место в таблице.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {rows.map((u, i) => {
        const me = myName && u.name === myName;
        return (
          <li
            key={u.id}
            className={`flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 ${
              me ? "border-accent/40" : ""
            }`}
          >
            <span className="w-8 font-mono text-sm tabular-nums text-muted">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {u.name}
                {me ? <span className="ml-2 text-xs text-muted">вы</span> : null}
              </p>
              <p className="text-xs text-muted">
                {u.drinkCount} {pluralizeDrinks(u.drinkCount)} выпито
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
