import type { Drink } from "@/lib/drinks/types";
import { todayISO } from "@/lib/utils";

const LIMIT = 400;
const SEGMENTS = 20;

/** Кофеин за сегодня: 20 сегментов по 20 мг, предел — 400 мг. */
export function CaffeineMeter({ drinks }: { drinks: Drink[] }) {
  const today = todayISO();
  const mg = Math.round(
    drinks
      .filter((d) => d.status === "drank" && d.date === today)
      .reduce((s, d) => s + (d.caffeine || 0), 0),
  );
  const lit = Math.min(SEGMENTS, Math.ceil(mg / (LIMIT / SEGMENTS)));
  const over = mg > LIMIT;

  return (
    <section
      aria-label="Кофеин за сегодня"
      className="mb-5 rounded-[var(--radius-lg)] border border-border bg-surface p-4 md:p-5"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Кофеин сегодня</p>
          <p
            className={`font-display text-5xl font-bold leading-none tabular-nums md:text-6xl ${
              over ? "text-warn" : "text-fg"
            }`}
          >
            {mg}
            <span className="ml-1.5 text-xl font-semibold text-muted">мг</span>
          </p>
        </div>
        <p className="max-w-[11rem] text-right text-xs text-muted">
          {over
            ? `Выше нормы на ${mg - LIMIT} мг. На сегодня хватит.`
            : mg === 0
              ? "Ни одной банки. Предел — 400 мг в день."
              : `До предела ${LIMIT - mg} мг (400 мг в день).`}
        </p>
      </div>
      <div className="mt-4 flex gap-[3px]" role="img" aria-label={`${mg} из ${LIMIT} мг`}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-[3px] ${
              i < lit ? (over ? "bg-warn" : "bg-accent") : "bg-elevated"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
