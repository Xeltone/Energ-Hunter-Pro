import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import type { Drink } from "@/lib/drinks/types";
import { overallRating } from "@/lib/drinks/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Stars } from "./stars";
import { DrinkForm } from "./drink-form";
import { CaffeineMeter } from "./caffeine-meter";
import { cn } from "@/lib/utils";

type Filter = "all" | "drank" | "collection" | "rated";
type Sort = "date_desc" | "date_asc" | "rating_desc" | "name_asc";

export function Collection({
  drinks,
  onAdd,
  onUpdate,
  onDelete,
  onSeed,
}: {
  drinks: Drink[];
  onAdd: () => void;
  onUpdate: (id: string, d: Drink) => void;
  onDelete: (id: string) => void;
  onSeed: () => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("date_desc");
  const [open, setOpen] = useState<Drink | null>(null);
  const [editing, setEditing] = useState(false);

  const list = useMemo(() => {
    let rows = drinks;
    const query = q.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.flavor.toLowerCase().includes(query) ||
          d.store.toLowerCase().includes(query),
      );
    }
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
  }, [drinks, q, filter, sort]);

  return (
    <div>
      <CaffeineMeter drinks={drinks} />
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            className="pl-9"
            placeholder="Поиск по бренду, вкусу, магазину"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Все"],
              ["drank", "Выпил"],
              ["collection", "Коллекция"],
              ["rated", "С оценкой"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "h-9 rounded-full px-3 text-sm",
                filter === id ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
              )}
            >
              {label}
            </button>
          ))}
          <Select
            className="ml-auto h-9 w-auto min-w-36"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="date_desc">Сначала новые</option>
            <option value="date_asc">Сначала старые</option>
            <option value="rating_desc">По рейтингу</option>
            <option value="name_asc">А–Я</option>
          </Select>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-14 text-center">
          <h3 className="text-lg font-medium">
            {drinks.length ? "Ничего не найдено" : "Коллекция пуста"}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            {drinks.length
              ? "Попробуйте другой запрос или фильтр"
              : "Добавьте первую банку или загрузите примеры, чтобы посмотреть, как выглядит трекер."}
          </p>
          {!drinks.length && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={onAdd}>Добавить банку</Button>
              <Button variant="outline" onClick={onSeed}>
                Примеры
              </Button>
            </div>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((d) => {
            const ov = overallRating(d.rating);
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(d);
                    setEditing(false);
                  }}
                  className="flex w-full flex-col items-start rounded-[var(--radius-md)] border border-border bg-surface p-4 text-left transition-colors duration-150 hover:bg-elevated"
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    {d.image ? (
                      <img
                        src={d.image}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="size-12 shrink-0 rounded-[var(--radius-sm)] bg-elevated object-contain"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl font-semibold leading-tight">{d.name}</p>
                      <p className="text-sm text-muted">{d.flavor || "без вкуса"}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs",
                        d.status === "drank"
                          ? "bg-success/15 text-success"
                          : "bg-elevated text-muted",
                      )}
                    >
                      {d.status === "drank" ? "Выпил" : "Коллекция"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {ov > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Stars value={Math.round(ov)} size={12} />
                        <span className="font-mono tabular-nums">{ov.toFixed(1)}</span>
                      </span>
                    )}
                    {d.volume ? <span>{d.volume} л</span> : null}
                    {d.caffeine ? <span>{d.caffeine} мг</span> : null}
                    {d.sugar !== null ? <span>{d.sugar} г сахара</span> : null}
                    {d.date ? <span className="font-mono">{d.date}</span> : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[var(--radius-xl)] border border-border bg-surface p-5 sm:max-w-lg sm:rounded-[var(--radius-xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            {editing ? (
              <DrinkForm
                initial={open}
                submitLabel="Сохранить"
                onSubmit={(data) => {
                  onUpdate(open.id, { ...open, ...data, id: open.id });
                  setOpen({ ...open, ...data, id: open.id });
                  setEditing(false);
                }}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{open.name}</h2>
                    <p className="text-sm text-muted">{open.flavor || "без вкуса"}</p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-muted hover:text-fg"
                    onClick={() => setOpen(null)}
                  >
                    Закрыть
                  </button>
                </div>
                {open.image ? (
                  <img
                    src={open.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="mx-auto mt-4 h-40 object-contain"
                  />
                ) : null}
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <Spec label="Объём" value={open.volume ? `${open.volume} л` : "—"} />
                  <Spec label="Кофеин" value={open.caffeine ? `${open.caffeine} мг` : "—"} />
                  <Spec
                    label="Сахар"
                    value={open.sugar === null ? "не указан" : `${open.sugar} г`}
                  />
                  <Spec label="Цена" value={open.price ? `${open.price} ₽` : "—"} />
                </dl>
                {open.store ? (
                  <p className="mt-3 text-sm text-muted">Магазин: {open.store}</p>
                ) : null}
                {open.notes ? (
                  <p className="mt-3 rounded-[var(--radius-md)] bg-elevated p-3 text-sm">
                    {open.notes}
                  </p>
                ) : null}
                <p className="mt-3 font-mono text-xs text-subtle">{open.date || "дата не указана"}</p>
                <div className="mt-6 flex gap-2">
                  <Button className="flex-1" onClick={() => setEditing(true)}>
                    Изменить
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Удалить «${open.name}»?`)) {
                        onDelete(open.id);
                        setOpen(null);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-elevated px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}
