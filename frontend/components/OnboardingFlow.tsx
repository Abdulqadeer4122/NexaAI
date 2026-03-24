"use client";

import { useState } from "react";

interface OnboardingAnswers {
  profile: string;  // raw "role, X years, stack" text
  work_start: string;
  work_end: string;
  tasks: string;
}

interface OnboardingFlowProps {
  onComplete: (answers: OnboardingAnswers) => void;
  onSkip: () => void;
}

/** Convert "HH:MM" (24h) to "H:MM AM/PM" */
function to12Hour(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const meridiem = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${meridiem}`;
}

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [profile, setProfile] = useState("");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [tasks, setTasks] = useState("");

  const isNextDisabled =
    (step === 0 && !profile.trim()) ||
    (step === 2 && !tasks.trim());

  const handleNext = () => {
    if (step === 0) setStep(1);
    else if (step === 1) setStep(2);
    else if (step === 2 && tasks.trim()) {
      onComplete({
        profile: profile.trim(),
        work_start: to12Hour(workStart),
        work_end: to12Hour(workEnd),
        tasks: tasks.trim(),
      });
    }
  };

  return (
    <div className="flex flex-col gap-5 py-8 px-2 animate-fadeSlideUp max-w-lg mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
          style={{
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            boxShadow: "var(--shadow-md)",
          }}
        >
          ✦
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Let&apos;s set up your day
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            3 quick questions — I&apos;ll handle the rest
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                backgroundColor: i === step ? "var(--accent-primary)" : "var(--bg-tertiary)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Step 0 — Profile (role + experience + stack) */}
      {step === 0 && (
        <div className="flex flex-col gap-3 animate-fadeSlideIn">
          <p className="text-sm font-medium text-center" style={{ color: "var(--text-secondary)" }}>
            What do you do, and how experienced are you?
          </p>
          <input
            type="text"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && profile.trim() && handleNext()}
            placeholder="e.g. Backend dev, 3 years, Python / FastAPI"
            autoFocus
            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Nexa uses your experience level to estimate how long each task will take — no guessing needed on your end.
          </p>
        </div>
      )}

      {/* Step 1 — Work hours */}
      {step === 1 && (
        <div className="flex flex-col gap-4 animate-fadeSlideIn">
          <p className="text-sm font-medium text-center" style={{ color: "var(--text-secondary)" }}>
            What time does your workday start and end today?
          </p>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Start time
              </label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                End time
              </label>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Tasks (no time estimates) */}
      {step === 2 && (
        <div className="flex flex-col gap-3 animate-fadeSlideIn">
          <p className="text-sm font-medium text-center" style={{ color: "var(--text-secondary)" }}>
            What do you need to get done today?
          </p>
          <textarea
            rows={4}
            value={tasks}
            onChange={(e) => setTasks(e.target.value)}
            placeholder="e.g. fix auth bug, review Ahmed's PR, write deployment docs, standup at 10"
            autoFocus
            className="w-full resize-none rounded-xl border px-3 py-3 text-sm focus:outline-none"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          />
          <div
            className="flex items-start gap-2 rounded-xl border px-3 py-2.5"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-primary) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent-primary) 25%, transparent)",
            }}
          >
            <span style={{ color: "var(--accent-primary)" }}>✦</span>
            <p className="text-xs" style={{ color: "var(--accent-primary)" }}>
              No time estimates needed — Nexa will calculate durations based on your experience level and fill any free time with growth tasks.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-1">
        {step > 0 ? (
          <button
            onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
            className="text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="text-xs underline cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            disabled={isNextDisabled}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40"
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            {step === 2 ? "Generate my schedule ✦" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
