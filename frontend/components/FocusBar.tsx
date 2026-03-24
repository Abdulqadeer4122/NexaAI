"use client";

import { ActiveTimer } from "@/lib/types";

interface FocusBarProps {
  timer: ActiveTimer;
  onStop: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusBar({ timer, onStop }: FocusBarProps) {
  const progress = timer.total > 0 ? ((timer.total - timer.remaining) / timer.total) * 100 : 0;

  return (
    <div
      className="shrink-0 border-t px-6 py-3 backdrop-blur-sm transition-all duration-300"
      style={{
        borderColor: "var(--border-color)",
        backgroundColor: "var(--bg-glass)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Pulsing dot */}
        <span
          className="h-2 w-2 shrink-0 animate-pulse rounded-full"
          style={{ backgroundColor: "var(--accent-primary)" }}
        />

        {/* Task name */}
        <span
          className="flex-1 truncate text-xs font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {timer.taskName}
        </span>

        {/* Countdown */}
        <span
          className="shrink-0 font-mono text-xs tabular-nums"
          style={{ color: "var(--accent-primary)" }}
        >
          {formatTime(timer.remaining)}
        </span>

        {/* Stop button */}
        <button
          onClick={onStop}
          aria-label="Stop timer"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all duration-150 hover:opacity-80 active:scale-95"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-muted)",
          }}
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="mt-2 h-1 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(to right, var(--accent-primary), var(--accent-secondary))",
          }}
        />
      </div>
    </div>
  );
}
