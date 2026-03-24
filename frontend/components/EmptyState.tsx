"use client";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const CHIPS = ["Plan my day 🗓️", "I woke up late ⏰", "Add a meeting 📅"];

interface EmptyStateProps {
  onSuggestion: (text: string) => void;
}

export default function EmptyState({ onSuggestion }: EmptyStateProps) {
  return (
    <div className="flex animate-fadeSlideUp flex-col items-center gap-4 py-16">
      {/* Icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-white"
        style={{
          background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
          boxShadow: "var(--shadow-lg)",
          animation: "pulse-glow 2s ease-in-out infinite",
        }}
      >
        ✦
      </div>

      {/* Greeting */}
      <div className="text-center">
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {getGreeting()}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          What would you like to plan today?
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onSuggestion(chip)}
            className="cursor-pointer rounded-xl border px-4 py-2 text-sm transition-all duration-150 hover:border-accent-300 hover:bg-accent-50 hover:text-accent-500 active:scale-95 dark:hover:bg-accent-900/20"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              borderColor: "var(--border-color)",
              color: "var(--text-secondary)",
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
