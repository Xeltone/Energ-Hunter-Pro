import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Drink } from "@/lib/drinks/types";
import { overallRating } from "@/lib/drinks/types";
import { ACHIEVEMENTS, getRank, summarize, unlockedAchievements } from "@/lib/drinks/stats";
import { todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { shareStatsCard } from "@/lib/share-card";
import { toast } from "sonner";

export function StatsView({ drinks, name }: { drinks: Drink[]; name?: string | null }) {
  const summary = summarize(drinks);
  const rank = getRank(summary.drank);
  const unlocked = unlockedAchievements(drinks);
  const progress =
    rank.next == null ? 100 : Math.min(100, ((summary.drank - rank.min) / (rank.next - rank.min)) * 100);

  const brandData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of drinks) map.set(d.name, (map.get(d.name) || 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, n]) => ({ name, n }));
  }, [drinks]);

  const ratingData = useMemo(() => {
    const buckets = [1, 2, 3, 4, 5].map((k) => ({ star: `${k}`, n: 0 }));
    for (const d of drinks) {
      const r = Math.round(overallRating(d.rating));
      if (r >= 1 && r <= 5) buckets[r - 1].n += 1;
    }
    return buckets;
  }, [drinks]);

  if (!drinks.length) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-14 text-center">
        <h3 className="text-lg font-medium">Пока нет статистики</h3>
        <p className="mt-2 text-sm text-muted">Добавьте банки — появятся графики, ранг и достижения.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {summary.overdoseDays > 0 && (
        <div className="rounded-[var(--radius-md)] border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          В {summary.overdoseDays} дн. суммарный кофеин превысил 400 мг. Следите за нагрузкой.
        </div>
      )}

      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Ранг</p>
        <p className="mt-1 font-display text-5xl font-bold leading-none tracking-tight">{rank.name}</p>
        <p className="text-sm text-muted">Выпито {summary.drank}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-subtle">
          {rank.next == null
            ? "Максимальный ранг"
            : `До следующего осталось ${rank.next - summary.drank}`}
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            shareStatsCard({
              name: name || "Охотник",
              rank: rank.name,
              drank: summary.drank,
              caffeine: summary.caffeine,
              sugar: summary.sugar,
              avg: summary.avg,
              spent: summary.spent,
            })
              .then((r) => r === "downloaded" && toast.success("Картинка сохранена"))
              .catch(() => toast.error("Не удалось создать картинку"))
          }
        >
          Поделиться статистикой
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={String(summary.total)} label="Записей" />
        <Stat value={summary.avg.toFixed(1)} label="Средняя оценка" />
        <Stat value={`${summary.caffeine}`} label="мг кофеина" />
        <Stat value={`${summary.spent}`} label="₽ потрачено" />
      </div>

      <Heatmap drinks={drinks} />

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Оценки">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ratingData}>
              <CartesianGrid stroke="rgba(241,243,247,0.06)" vertical={false} />
              <XAxis dataKey="star" stroke="#8b919d" fontSize={12} tickLine={false} />
              <YAxis allowDecimals={false} stroke="#8b919d" fontSize={12} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: "#14161c",
                  border: "1px solid rgba(241,243,247,0.12)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="n" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Бренды">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={brandData} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid stroke="rgba(241,243,247,0.06)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis type="category" dataKey="name" stroke="#8b919d" fontSize={11} width={110} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#14161c",
                  border: "1px solid rgba(241,243,247,0.12)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="n" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted">
          Достижения {unlocked.size}/{ACHIEVEMENTS.length}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const on = unlocked.has(a.id);
            return (
              <div
                key={a.id}
                className={`rounded-[var(--radius-md)] border px-3 py-3 ${
                  on ? "border-border bg-elevated" : "border-border/60 bg-surface opacity-45"
                }`}
              >
                <p className="text-sm font-medium">{a.name}</p>
                <p className="mt-1 text-xs text-muted">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-4">
      <p className="font-display text-4xl font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
      <p className="mb-2 text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

function Heatmap({ drinks }: { drinks: Drink[] }) {
  const counts: Record<string, number> = {};
  for (const d of drinks) {
    if (d.status === "drank" && d.date) counts[d.date] = (counts[d.date] || 0) + 1;
  }
  const weeks = 16;
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const mondayOffset = (todayLocal.getDay() + 6) % 7;
  const first = new Date(
    todayLocal.getFullYear(),
    todayLocal.getMonth(),
    todayLocal.getDate() - mondayOffset - (weeks - 1) * 7,
  );
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    const key = todayISO(day);
    return { key, count: counts[key] || 0, future: day > todayLocal };
  });

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-medium">Календарь охоты</p>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridAutoFlow: "column" }}
      >
        {cells.map((c) => {
          const level = c.count >= 4 ? 4 : c.count;
          const bg = c.future
            ? "transparent"
            : level === 0
              ? "var(--color-elevated)"
              : `color-mix(in oklab, var(--color-accent) ${[0, 30, 55, 80, 100][level]}%, var(--color-elevated))`;
          return (
            <div
              key={c.key}
              title={`${c.key}: ${c.count}`}
              className="aspect-square rounded-[2px]"
              style={{ background: bg }}
            />
          );
        })}
      </div>
    </div>
  );
}
