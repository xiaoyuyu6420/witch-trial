"use client";

const TIER_COLORS: Record<number, string> = {
  0: "#334155", // L
  1: "#64748b", // M
  2: "#a78bfa", // H
  3: "#8b5cf6", // X
};

interface DimensionBarProps {
  label: string;
  value: number; // 0-3
  compareValue?: number; // 0-3, template value for overlay
}

export default function DimensionBar({ label, value, compareValue }: DimensionBarProps) {
  const pct = ((value) / 3) * 100;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-16 text-right text-[var(--text-2)] shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-[#1e1b2e] relative overflow-hidden">
        {/* User bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-600"
          style={{
            width: `${Math.max(pct, 4)}%`,
            background: TIER_COLORS[value] ?? TIER_COLORS[1],
          }}
        />
        {/* Template overlay */}
        {compareValue !== undefined && (
          <div
            className="absolute inset-y-0 left-0 rounded-full border-2 border-dashed border-[#f59e0b]/60"
            style={{ width: `${((compareValue) / 3) * 100}%` }}
          />
        )}
      </div>
      <span className="w-5 text-[var(--text-2)] text-xs font-mono">
        {["L","M","H","X"][value] ?? "M"}
      </span>
    </div>
  );
}
