import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function Stars({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden={!onChange}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const icon = (
          <Star
            style={{ width: size, height: size }}
            fill={filled ? "currentColor" : "none"}
            strokeWidth={1.6}
          />
        );
        const cls = filled ? "text-accent" : "text-subtle";
        if (!onChange) {
          return (
            <span key={n} className={cls}>
              {icon}
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? 0 : n)}
            className={cn("p-0.5", cls)}
            aria-label={`${n}`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
