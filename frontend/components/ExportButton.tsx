"use client";

import { useEffect, useRef, useState } from "react";
import { ScheduleItem } from "@/lib/types";

interface ExportButtonProps {
  schedule: ScheduleItem[];
}

function formatScheduleAsText(items: ScheduleItem[]): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lines = [`Nexa AI Schedule — ${today}`, ""];
  for (const item of items) {
    const dur = item.duration_minutes ? ` (${item.duration_minutes}m)` : "";
    const pri = item.priority ? ` [${item.priority}]` : "";
    lines.push(`${item.time}  ${item.task}${dur}${pri}`);
  }
  return lines.join("\n");
}

function parseTimeToDate(timeStr: string): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Try HH:MM format
  const hhmm = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    date.setHours(parseInt(hhmm[1]), parseInt(hhmm[2]), 0, 0);
    return date;
  }

  // Try H:MM AM/PM format
  const ampm = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    date.setHours(h, m, 0, 0);
    return date;
  }

  return date;
}

function formatICSDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

function generateICS(items: ScheduleItem[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexa AI//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  items.forEach((item, i) => {
    const start = parseTimeToDate(item.time);
    const uid = `autopilot-${Date.now()}-${i}@autopilot.ai`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART:${formatICSDate(start)}`);
    if (item.duration_minutes) {
      lines.push(`DURATION:PT${item.duration_minutes}M`);
    }
    lines.push(`SUMMARY:${item.task}`);
    if (item.priority) {
      lines.push(`DESCRIPTION:Priority: ${item.priority}`);
    }
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default function ExportButton({ schedule }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  };

  const handleCopyText = async () => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(formatScheduleAsText(schedule));
      showToast("Copied to clipboard!");
    } catch {
      showToast("Copy failed — try again");
    }
  };

  const handleDownloadICS = () => {
    setOpen(false);
    const ics = generateICS(schedule);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexa-schedule.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded!");
  };

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-all hover:border-accent-300 hover:bg-accent-50 hover:text-accent-500 dark:hover:bg-accent-900/20"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            borderColor: "var(--border-color)",
            color: "var(--text-muted)",
          }}
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-xl border p-1 shadow-lg"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <button
              onClick={handleCopyText}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-accent-50 dark:hover:bg-accent-900/20"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy as text
            </button>
            <button
              onClick={handleDownloadICS}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-accent-50 dark:hover:bg-accent-900/20"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Download .ics
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 animate-fadeSlideIn rounded-xl border px-4 py-2 text-sm shadow-lg"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
