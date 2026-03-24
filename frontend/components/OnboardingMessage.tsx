"use client";

import OnboardingFlow from "./OnboardingFlow";

interface OnboardingMessageProps {
  onOnboardingComplete: (data: {
    profile: string;
    work_start: string;
    work_end: string;
    tasks: string;
  }) => void;
  onSkip: () => void;
}

export default function OnboardingMessage({
  onOnboardingComplete,
  onSkip,
}: OnboardingMessageProps) {
  return (
    <div className="flex animate-fadeSlideIn items-start gap-3">
      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
        style={{
          background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
          boxShadow: "var(--shadow-md)",
          animation: "pulse-glow 2s ease-in-out infinite",
        }}
      >
        ✦
      </div>

      {/* Bubble */}
      <div
        className="w-full max-w-[90%] rounded-2xl rounded-bl-sm border px-5 py-4 backdrop-blur-sm"
        style={{
          backgroundColor: "var(--bg-glass)",
          borderColor: "var(--border-color)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <OnboardingFlow onComplete={onOnboardingComplete} onSkip={onSkip} />
      </div>
    </div>
  );
}
