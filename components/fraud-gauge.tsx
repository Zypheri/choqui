interface FraudGaugeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

function getFraudLevel(score: number): "bajo" | "medio" | "alto" {
  if (score < 40) return "bajo";
  if (score < 70) return "medio";
  return "alto";
}

const SIZE_MAP = {
  sm: { box: 44, stroke: 4, font: "text-xs", label: "text-[9px]" },
  md: { box: 72, stroke: 5, font: "text-lg", label: "text-[10px]" },
  lg: { box: 120, stroke: 8, font: "text-3xl", label: "text-xs" },
} as const;

const COLOR_MAP = {
  bajo: "#22C55E",
  medio: "#F5A524",
  alto: "#EF4444",
  pending: "#9199A8",
} as const;

export function FraudGauge({ score, size = "sm" }: FraudGaugeProps) {
  const { box, stroke, font, label } = SIZE_MAP[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const isPending = score === null || Number.isNaN(score);
  const clamped = isPending ? 0 : Math.min(100, Math.max(0, score));
  const level = isPending ? "pending" : getFraudLevel(clamped);
  const color = COLOR_MAP[level];
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="inline-flex flex-col items-center gap-1"
      role="img"
      aria-label={
        isPending
          ? "Score de fraude pendiente"
          : `Score de fraude ${Math.round(clamped)}`
      }
    >
      <div className="relative" style={{ width: box, height: box }}>
        <svg width={box} height={box} className="-rotate-90">
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke="#22252C"
            strokeWidth={stroke}
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={isPending ? circumference : offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-semibold tabular-nums text-text-primary ${font}`}
          >
            {isPending ? "—" : Math.round(clamped)}
          </span>
        </div>
      </div>
      {isPending && (
        <span className={`text-text-muted ${label}`}>Pendiente</span>
      )}
    </div>
  );
}

export function getFraudLevelFromScore(
  score: number | null
): "bajo" | "medio" | "alto" | "pending" {
  if (score === null || Number.isNaN(score)) return "pending";
  return getFraudLevel(score);
}
