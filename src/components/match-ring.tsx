import { cn } from "@/lib/utils";

/** Circular match-score indicator. Color scales with the score. */
export function MatchRing({
  score,
  size = 52,
}: {
  score: number;
  size?: number;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 80
      ? "stroke-emerald-500"
      : pct >= 60
        ? "stroke-indigo-500"
        : pct >= 40
          ? "stroke-amber-500"
          : "stroke-rose-400";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="stroke-muted"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all", color)}
          fill="none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
        {pct}
      </span>
    </div>
  );
}
