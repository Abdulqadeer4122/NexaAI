"use client";

interface NewSessionModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  threadSummary: {
    message_count: number;
    last_schedule_preview: string[] | null;
  } | null;
}

export default function NewSessionModal({
  isOpen,
  onConfirm,
  onCancel,
  isLoading,
  threadSummary,
}: NewSessionModalProps) {
  if (!isOpen) return null;

  const hasHistory = (threadSummary?.message_count ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="mx-4 w-full max-w-sm animate-fadeSlideUp rounded-2xl border p-6 shadow-xl backdrop-blur-sm"
        style={{
          backgroundColor: "var(--bg-glass)",
          borderColor: "var(--border-color)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171" }}
          >
            ⚠
          </div>
          <span
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Start new session?
          </span>
          <button
            onClick={onCancel}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Context */}
        {hasHistory ? (
          <div
            className="mt-4 rounded-xl border p-3"
            style={{ backgroundColor: "var(--bg-tertiary)", borderColor: "var(--border-color)" }}
          >
            <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
              This will permanently delete:
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              • {threadSummary!.message_count} message{threadSummary!.message_count !== 1 ? "s" : ""} from this session
            </p>
            {threadSummary?.last_schedule_preview && (
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                • Your last schedule ({threadSummary.last_schedule_preview.slice(0, 2).join(", ")}
                {threadSummary.last_schedule_preview.length > 2 ? "…" : ""})
              </p>
            )}
            <p className="mt-2 text-xs font-medium" style={{ color: "#f87171" }}>
              This cannot be undone.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            No history to clear. A new session will simply generate a fresh thread ID.
          </p>
        )}

        {/* Buttons */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex h-10 flex-1 items-center justify-center rounded-xl border text-sm transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              borderColor: "var(--border-color)",
              color: "var(--text-secondary)",
            }}
          >
            Keep session
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: isLoading ? "#ef4444cc" : "#ef4444" }}
          >
            {isLoading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Clearing…
              </>
            ) : (
              "Yes, start fresh"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
