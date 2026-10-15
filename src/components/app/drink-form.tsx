import { useMemo, useState, type FormEvent } from "react";
import { PRESETS } from "@/lib/drinks/presets";
import type { Drink, DrinkInput, Rating } from "@/lib/drinks/types";
import { emptyRating, overallRating } from "@/lib/drinks/types";
import { todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Stars } from "./stars";
import { ImagePicker } from "./image-picker";

export function DrinkForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Drink;
  submitLabel: string;
  onSubmit: (data: DrinkInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [flavor, setFlavor] = useState(initial?.flavor ?? "");
  const [status, setStatus] = useState(initial?.status ?? "drank");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [volume, setVolume] = useState(String(initial?.volume || 0.5));
  const [caffeine, setCaffeine] = useState(String(initial?.caffeine || ""));
  const [sugar, setSugar] = useState(
    initial?.sugar === null || initial?.sugar === undefined ? "" : String(initial.sugar),
  );
  const [price, setPrice] = useState(String(initial?.price || ""));
  const [store, setStore] = useState(initial?.store ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rating, setRating] = useState<Rating>(initial?.rating ?? emptyRating());
  const [image, setImage] = useState(initial?.image ?? "");
  const [openSug, setOpenSug] = useState(false);

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (q.length < 1) return [];
    return PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.flavor.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [name]);

  function applyPreset(p: (typeof PRESETS)[number]) {
    setName(p.name);
    setFlavor(p.flavor);
    setCaffeine(String(p.caffeine));
    setSugar(String(p.sugar));
    setVolume(String(p.volume));
    setOpenSug(false);
  }

  function submit(e: FormEvent) {
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
      image,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="relative">
        <Label htmlFor="name">Бренд</Label>
        <Input
          id="name"
          value={name}
          required
          autoComplete="off"
          placeholder="Red Bull, Monster…"
          onChange={(e) => {
            setName(e.target.value);
            setOpenSug(true);
          }}
          onFocus={() => setOpenSug(true)}
          onBlur={() => setTimeout(() => setOpenSug(false), 120)}
        />
        {openSug && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-lg">
            {suggestions.map((p) => (
              <li key={`${p.name}-${p.flavor}`}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-elevated"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyPreset(p)}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="truncate text-muted">{p.flavor}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <Label>Фото банки</Label>
        <ImagePicker query={`${name} ${flavor}`.trim()} value={image} onChange={setImage} />
      </div>
      <div>
        <Label htmlFor="flavor">Вкус</Label>
        <Input id="flavor" value={flavor} onChange={(e) => setFlavor(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Статус</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as "drank" | "collection")}>
            <option value="drank">Выпил</option>
            <option value="collection">В коллекции</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="date">Дата</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Объём, л</Label>
          <Select value={volume} onChange={(e) => setVolume(e.target.value)}>
            <option value="0.5">0.5</option>
            <option value="0.45">0.45</option>
            <option value="0.33">0.33</option>
            <option value="0.25">0.25</option>
            <option value="0.449">0.449</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="caffeine">Кофеин, мг</Label>
          <Input
            id="caffeine"
            type="number"
            min={0}
            value={caffeine}
            onChange={(e) => setCaffeine(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sugar">Сахар, г</Label>
          <Input
            id="sugar"
            type="number"
            min={0}
            placeholder="не указан"
            value={sugar}
            onChange={(e) => setSugar(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="price">Цена, ₽</Label>
          <Input
            id="price"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="store">Магазин</Label>
        <Input id="store" value={store} onChange={(e) => setStore(e.target.value)} />
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Оценки</p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["taste", "Вкус"],
              ["effect", "Эффект"],
              ["design", "Дизайн"],
              ["value", "Цена/кач."],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted">{label}</span>
              <Stars
                value={rating[key]}
                onChange={(n) => setRating({ ...rating, [key]: n })}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-center font-mono text-sm tabular-nums text-muted">
          Среднее {overallRating(rating).toFixed(1)} / 5
        </p>
      </div>
      <div>
        <Label htmlFor="notes">Заметки</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
