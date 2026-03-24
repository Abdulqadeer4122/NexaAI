"use client";

import { useEffect, useRef, useState } from "react";
import { ProductivityScore as ProductivityScoreType } from "@/lib/types";

interface ProductivityScoreProps {
  data: ProductivityScoreType;
  completedCount: number;
  totalCount: number;
}

const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  S: { bg: "rgba(139,111,255,0.15)", text: "var(--accent-primary)", label: "S" },
  A: { bg: "rgba(20,184,166,0.15)", text: "#14b8a6", label: "A" },
  B: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "B" },
  C: { bg: "rgba(249,115,22,0.15)", text: "#f97316", label: "C" },
  D: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", label: "D" },
};

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
  up: { icon: "↑", color: "#22c55e" },
  down: { icon: "↓", color: "#ef4444" },
  steady: { icon: "→", color: "var(--text-muted)" },
};

export default function ProductivityScore({
  data,
  completedCount,
  totalCount,
}: ProductivityScoreProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const rafRef = useRef<number | null>(null);
  const gradeStyle = GRADE_STYLES[data.grade] ?? GRADE_STYLES.B;
  const trendStyle = TREND_ICONS[data.trend] ?? TREND_ICONS.steady;

  // Count-up animation
  useEffect(() => {
    const start = performance.now();
    const duration = 1500;
    const target = data.score;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [data.score]);

  return (
    <div
      className="animate-fadeSlideUp rounded-2xl border p-4"
      style={{
        backgroundColor: "var(--bg-glass)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: "var(--accent-primary)" }} className="text-sm">
          ◆
        </span>
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Productivity
        </span>
      </div>

      {/* Score + Grade row */}
      <div className="flex items-center justify-between">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {displayScore}
        </span>
        <span
          className="rounded-xl px-3 py-1 text-lg font-bold"
          style={{ backgroundColor: gradeStyle.bg, color: gradeStyle.text }}
        >
          {gradeStyle.label}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="mt-3 h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${data.score}%`,
            background:
              "linear-gradient(to right, var(--accent-primary), var(--accent-secondary))",
          }}
        />
      </div>

      {/* Insight */}
      <p
        className="mt-2 text-xs italic"
        style={{ color: "var(--text-muted)" }}
      >
        {data.insight}
      </p>

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          <span style={{ color: "var(--text-primary)" }} className="font-medium">
            {completedCount}
          </span>
          /{totalCount} tasks done
        </span>
        <span
          className="text-sm font-bold"
          style={{ color: trendStyle.color }}
        >
          {trendStyle.icon}
        </span>
      </div>
    </div>
  );
}
