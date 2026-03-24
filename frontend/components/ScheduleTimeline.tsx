"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActiveTimer, ScheduleItem } from "@/lib/types";
import SubTaskList from "./SubTaskList";

interface TimerState {
  status: "idle" | "running" | "done";
  remaining: number; // seconds
  total: number;     // seconds
}

interface ScheduleTimelineProps {
  items: ScheduleItem[];
  compact?: boolean;
  onTaskComplete?: (taskName: string) => void;
  onActiveTimerChange?: (timer: ActiveTimer | null) => void;
  stopSignal?: number;
  experienceLevel?: string;
}

const CIRCUMFERENCE = 2 * Math.PI * 14; // ≈ 87.96

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getSubtaskBadgeLabel(experienceLevel: string, count: number): string {
  const l = experienceLevel.toLowerCase();
  if (l.includes("lead") || l.includes("staff") || l.includes("principal"))
    return `${count} outcome${count !== 1 ? "s" : ""}`;
  if (l.includes("senior") || l.includes("sr"))
    return `${count} checkpoint${count !== 1 ? "s" : ""}`;
  return `${count} step${count !== 1 ? "s" : ""}`;
}

export default function ScheduleTimeline({
  items,
  compact = false,
  onTaskComplete,
  onActiveTimerChange,
  stopSignal = 0,
  experienceLevel = "mid",
}: ScheduleTimelineProps) {
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [flashDone, setFlashDone] = useState<Record<number, boolean>>({});
  const intervalsRef = useRef<Record<number, ReturnType<typeof setInterval>>>({});
  // Mirror of timers state readable inside interval callbacks without needing the updater form
  const timersRef = useRef<Record<number, TimerState>>({});

  // Clear all timers when stopSignal changes
  useEffect(() => {
    if (stopSignal === 0) return;
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};
    timersRef.current = {};
    setTimers({});
    onActiveTimerChange?.(null);
  }, [stopSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const startTimer = (index: number, item: ScheduleItem) => {
    const total = (item.duration_minutes ?? 25) * 60;

    // Stop any other running timer
    Object.entries(intervalsRef.current).forEach(([key, interval]) => {
      if (Number(key) !== index) {
        clearInterval(interval);
        delete intervalsRef.current[Number(key)];
      }
    });

    const timerState: TimerState = { status: "running", remaining: total, total };
    setTimers((prev) => {
      const next = { [index]: timerState };
      Object.keys(prev).forEach((k) => {
        if (Number(k) !== index) next[Number(k)] = { ...prev[Number(k)], status: "idle" };
      });
      const updated = { ...prev, ...next };
      timersRef.current = updated;
      return updated;
    });

    onActiveTimerChange?.({ taskName: item.task, remaining: total, total });

    intervalsRef.current[index] = setInterval(() => {
      // Read directly from ref — no functional updater needed, so side effects are safe
      const current = timersRef.current[index];
      if (!current || current.status !== "running") {
        clearInterval(intervalsRef.current[index]);
        delete intervalsRef.current[index];
        return;
      }
      const next = current.remaining - 1;
      if (next <= 0) {
        clearInterval(intervalsRef.current[index]);
        delete intervalsRef.current[index];
        const doneState = { ...current, status: "done" as const, remaining: 0 };
        timersRef.current = { ...timersRef.current, [index]: doneState };
        setTimers((prev) => ({ ...prev, [index]: doneState }));
        setFlashDone((f) => ({ ...f, [index]: true }));
        setTimeout(() => setFlashDone((f) => ({ ...f, [index]: false })), 1000);
        onActiveTimerChange?.(null);
        onTaskComplete?.(item.task);
      } else {
        const updatedState = { ...current, remaining: next };
        timersRef.current = { ...timersRef.current, [index]: updatedState };
        setTimers((prev) => ({ ...prev, [index]: updatedState }));
        onActiveTimerChange?.({ taskName: item.task, remaining: next, total: current.total });
      }
    }, 1000);
  };

  const pauseTimer = (index: number) => {
    clearInterval(intervalsRef.current[index]);
    delete intervalsRef.current[index];
    setTimers((prev) => {
      const updated = { ...prev, [index]: { ...prev[index], status: "idle" as const } };
      timersRef.current = updated;
      return updated;
    });
    onActiveTimerChange?.(null);
  };

  const toggleExpand = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleTimerClick = (index: number, item: ScheduleItem) => {
    const state = timers[index];
    if (!state || state.status === "idle") {
      // If done, reset first
      if (state?.status === "done") {
        const total = (item.duration_minutes ?? 25) * 60;
        setTimers((prev) => ({ ...prev, [index]: { status: "idle", remaining: total, total } }));
        return;
      }
      startTimer(index, item);
    } else if (state.status === "running") {
      pauseTimer(index);
    } else if (state.status === "done") {
      // Reset on click
      const total = (item.duration_minutes ?? 25) * 60;
      setTimers((prev) => ({ ...prev, [index]: { status: "idle", remaining: total, total } }));
    }
  };

  return (
    <div className="relative pl-8">
      {/* Gradient spine */}
      <div
        className="absolute left-3 top-0 bottom-0 w-px"
        style={{
          background:
            "linear-gradient(to bottom, var(--accent-primary), var(--accent-secondary), transparent)",
        }}
      />

      {items.map((item, index) => {
        const priority = item.priority ?? "medium";
        const isLast = index === items.length - 1;
        const barWidth = item.duration_minutes
          ? Math.min((item.duration_minutes / 120) * 100, 100)
          : 0;

        const timer = timers[index];
        const isDone = timer?.status === "done";
        const isRunning = timer?.status === "running";
        const hasTimer = !compact && !!item.duration_minutes;
        const remaining = timer?.remaining ?? (item.duration_minutes ?? 0) * 60;
        const total = timer?.total ?? (item.duration_minutes ?? 0) * 60;
        const dashOffset = total > 0 ? CIRCUMFERENCE * (remaining / total) : CIRCUMFERENCE;

        const hasSubtasks = !compact && item.type === "work" && !!item.subtasks?.length;
        const isExpanded = expandedItems.has(index);
        const subtaskCount = item.subtasks?.length ?? 0;

        return (
          <div
            key={index}
            className={`relative flex gap-4 ${isLast ? "pb-2" : "pb-6"} animate-fadeSlideUp`}
            style={{ animationDelay: `${index * 75}ms` }}
          >
            {/* Timeline dot */}
            <div
              className={`absolute top-1 rounded-full ${
                priority === "high" ? "animate-pulse-glow" : ""
              }`}
              style={{
                left: "-21px",
                width: "14px",
                height: "14px",
                backgroundColor:
                  priority === "high"
                    ? "var(--accent-primary)"
                    : priority === "medium"
                    ? "var(--accent-secondary)"
                    : "transparent",
                border:
                  priority === "low" ? "2px solid var(--accent-secondary)" : "none",
                boxShadow:
                  priority === "high" ? "0 0 0 3px var(--accent-glow)" : undefined,
              }}
            />

            {/* Content card */}
            <div
              className="group flex-1 cursor-default rounded-xl border px-4 py-3 backdrop-blur-xs transition-all duration-200 hover:border-accent-200 dark:hover:border-accent-700"
              style={{
                backgroundColor: flashDone[index]
                  ? "rgba(34,197,94,0.1)"
                  : "var(--bg-glass)",
                borderColor: flashDone[index]
                  ? "rgba(34,197,94,0.3)"
                  : "var(--border-color)",
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.2s ease",
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium transition-colors group-hover:text-accent-500 ${
                        isDone ? "line-through opacity-60" : ""
                      }`}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.task}
                    </span>
                    {/* Subtask count badge (collapsed) */}
                    {hasSubtasks && !isExpanded && (
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px]"
                        style={{
                          backgroundColor: "var(--bg-tertiary)",
                          borderColor: "var(--border-color)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {getSubtaskBadgeLabel(experienceLevel, subtaskCount)}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <span
                      className="text-[10px] italic truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.notes}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className="rounded-lg px-2 py-0.5 font-mono text-xs"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {item.time}
                  </span>

                  {/* Chevron expand/collapse (work items with subtasks only) */}
                  {hasSubtasks && (
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-lg transition-all duration-150"
                      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                      onClick={() => toggleExpand(index)}
                      aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                    >
                      <svg
                        className="h-3.5 w-3.5 transition-transform duration-200"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}

                  {/* Circular timer button */}
                  {hasTimer && (
                    <div
                      className="relative h-8 w-8 shrink-0 cursor-pointer"
                      onClick={() => handleTimerClick(index, item)}
                    >
                      {/* SVG ring */}
                      <svg
                        className="-rotate-90"
                        viewBox="0 0 32 32"
                        width="32"
                        height="32"
                        style={{ position: "absolute", inset: 0 }}
                      >
                        {/* Background ring */}
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          fill="none"
                          stroke="var(--bg-tertiary)"
                          strokeWidth="2"
                        />
                        {/* Progress ring */}
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          fill="none"
                          stroke={isDone ? "#22c55e" : "var(--accent-primary)"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray={CIRCUMFERENCE}
                          strokeDashoffset={isDone ? 0 : dashOffset}
                          style={{ transition: "stroke-dashoffset 1s linear" }}
                        />
                      </svg>

                      {/* Button face */}
                      <button
                        className="absolute inset-0 flex items-center justify-center rounded-full text-[10px] transition-all duration-200"
                        style={{
                          color: isDone
                            ? "#22c55e"
                            : isRunning
                            ? "var(--accent-primary)"
                            : "var(--text-muted)",
                        }}
                        aria-label={
                          isDone ? "Reset timer" : isRunning ? "Pause" : "Start timer"
                        }
                      >
                        {isDone ? (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : isRunning ? (
                          <span className="font-mono text-[9px] tabular-nums leading-none">
                            {formatCountdown(remaining)}
                          </span>
                        ) : (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Duration bar */}
              {item.duration_minutes && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="h-1 flex-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        background:
                          "linear-gradient(to right, var(--accent-primary), var(--accent-secondary))",
                      }}
                    />
                  </div>
                  <span
                    className="tabular-nums text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.duration_minutes}m
                  </span>
                </div>
              )}

              {/* Subtask list (expanded) */}
              {hasSubtasks && isExpanded && (
                <SubTaskList
                  subtasks={item.subtasks!}
                  experienceLevel={experienceLevel}
                  onAllDone={() => onTaskComplete?.(item.task)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
