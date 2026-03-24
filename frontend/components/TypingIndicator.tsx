export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      {/* Avatar — matches assistant ChatMessage */}
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

      {/* Dots bubble */}
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border px-4 py-3.5 backdrop-blur-sm"
        style={{
          backgroundColor: "var(--bg-glass)",
          borderColor: "var(--border-color)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-typing-dot rounded-full"
            style={{
              backgroundColor: "var(--accent-secondary)",
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
