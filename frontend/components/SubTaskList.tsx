"use client";

import { useEffect, useRef, useState } from "react";
import { SubTask } from "@/lib/types";

interface SubTaskListProps {
  subtasks: SubTask[];
  experienceLevel: string;
  onAllDone: () => void;
}

function getLevelLabel(level: string): string {
  const l = level.toLowerCase();
  if (l.includes("junior") || l.includes("entry") || l.includes("jr")) return "Your step-by-step guide";
  if (l.includes("senior") || l.includes("sr")) return "Quality gates";
  if (l.includes("lead") || l.includes("staff") || l.includes("principal")) return "Exit criteria";
  return "Key checkpoints";
}

function getLevelLabelColor(level: string): string {
  const l = level.toLowerCase();
  if (l.includes("junior") || l.includes("entry") || l.includes("jr")) return "var(--accent-primary)";
  if (l.includes("senior") || l.includes("sr")) return "#f59e0b"; // amber
  if (l.includes("lead") || l.includes("staff") || l.includes("principal")) return "#f87171"; // coral/red
  return "#2dd4bf"; // teal
}

export default function SubTaskList({ subtasks, experienceLevel, onAllDone }: SubTaskListProps) {
  const [local, setLocal] = useState<SubTask[]>(() =>
    subtasks.map((s) => ({ ...s }))
  );
  const [allDoneFlash, setAllDoneFlash] = useState(false);

  const doneCount = local.filter((s) => s.done).length;
  const total = local.length;

  // Keep a stable ref to the latest onAllDone so the effect below never
  // needs it as a dependency (avoids infinite-loop when the parent re-renders
  // and passes a new inline arrow each time).
  const onAllDoneRef = useRef(onAllDone);
  useEffect(() => { onAllDoneRef.current = onAllDone; });

  // Guard so we only fire once per "all done" state, not on every re-render.
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (doneCount > 0 && doneCount === total && !hasFiredRef.current) {
      hasFiredRef.current = true;
      setAllDoneFlash(true);
      const t = setTimeout(() => setAllDoneFlash(false), 600);
      onAllDoneRef.current();
      return () => clearTimeout(t);
    }
    // Reset guard when user unchecks a subtask
    if (doneCount < total) {
      hasFiredRef.current = false;
    }
  }, [doneCount, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (i: number) => {
    setLocal((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s))
    );
  };

  const label = getLevelLabel(experienceLevel);
  const labelColor = getLevelLabelColor(experienceLevel);

  return (
    <div className="mt-3 animate-fadeSlideUp">
      {/* Section label */}
      <span
        className="mb-2 block text-[11px] font-medium uppercase tracking-wide"
        style={{ color: labelColor }}
      >
        {label}
      </span>

      <div className="space-y-2">
        {local.map((subtask, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 rounded-xl border p-3 transition-all duration-150"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              borderColor: subtask.done ? "rgba(34,197,94,0.3)" : "var(--border-color)",
            }}
          >
            {/* Top row: checkbox + text + time badge */}
            <div className="flex items-start gap-3">
              {/* Custom checkbox */}
              <button
                onClick={() => toggle(i)}
                className="mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded border transition-all duration-150"
                style={{
                  backgroundColor: subtask.done ? "var(--accent-primary)" : "var(--bg-primary)",
                  borderColor: subtask.done ? "var(--accent-primary)" : "var(--border-color)",
                }}
                aria-label={subtask.done ? "Mark incomplete" : "Mark complete"}
              >
                {subtask.done && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Task text */}
              <span
                className="flex-1 text-sm leading-relaxed"
                style={{
                  color: subtask.done ? "var(--text-muted)" : "var(--text-secondary)",
                  textDecoration: subtask.done ? "line-through" : "none",
                }}
              >
                {subtask.text}
              </span>

              {/* Time badge */}
              {subtask.estimated_minutes != null && (
                <span
                  className="ml-auto shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[10px]"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-muted)",
                  }}
                >
                  {subtask.estimated_minutes}m
                </span>
              )}
            </div>

            {/* Why */}
            {subtask.why && (
              <div className="ml-7 flex items-start gap-1.5">
                <span
                  className="text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--accent-primary)" }}
                >
                  why
                </span>
                <span className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>
                  {subtask.why}
                </span>
              </div>
            )}

            {/* Gotcha */}
            {subtask.gotcha && (
              <div className="ml-7 flex items-start gap-1.5">
                <svg
                  className="mt-0.5 h-2.5 w-2.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "#f59e0b" }}
                >
                  <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                </svg>
                <span className="text-[11px]" style={{ color: "#f59e0b" }}>
                  {subtask.gotcha}
                </span>
              </div>
            )}

            {/* Resource */}
            {subtask.resource && (
              <div className="ml-7">
                <button
                  className="text-[11px] underline transition-colors"
                  style={{ color: "var(--accent-secondary)" }}
                  onClick={() => window.open(subtask.resource!, "_blank")}
                >
                  → reference docs
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {total >= 2 && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${(doneCount / total) * 100}%`,
                background: allDoneFlash
                  ? "linear-gradient(to right, #22c55e, #16a34a)"
                  : "linear-gradient(to right, var(--accent-primary), var(--accent-secondary))",
                opacity: allDoneFlash ? 0.7 : 1,
                transition: "width 300ms ease-out, opacity 300ms",
              }}
            />
          </div>
          <span className="tabular-nums text-[10px]" style={{ color: "var(--text-muted)" }}>
            {doneCount}/{total} done
          </span>
        </div>
      )}
    </div>
  );
}
