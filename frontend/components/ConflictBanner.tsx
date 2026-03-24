import { ConflictWarning } from "@/lib/types";

interface ConflictBannerProps {
  warnings: ConflictWarning[];
}

export default function ConflictBanner({ warnings }: ConflictBannerProps) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="mb-3 animate-fadeSlideUp space-y-2">
      {warnings.map((w, i) => {
        const isCritical = w.severity === "critical";
        return (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={
              isCritical
                ? {
                    backgroundColor: "rgba(239,68,68,0.06)",
                    borderColor: "rgba(239,68,68,0.25)",
                    color: "#ef4444",
                  }
                : {
                    backgroundColor: "rgba(245,158,11,0.06)",
                    borderColor: "rgba(245,158,11,0.25)",
                    color: "#f59e0b",
                  }
            }
          >
            {/* Icon */}
            <span className="mt-0.5 shrink-0 text-sm">
              {isCritical ? "✕" : "⚠"}
            </span>

            {/* Content */}
            <div className="flex-1">
              <p className="text-sm font-medium">{w.message}</p>
              {w.tasks && w.tasks.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {w.tasks.map((task, ti) => (
                    <span
                      key={ti}
                      className="rounded-md px-1.5 py-0.5 text-[11px]"
                      style={{
                        backgroundColor: isCritical
                          ? "rgba(239,68,68,0.12)"
                          : "rgba(245,158,11,0.12)",
                      }}
                    >
                      {task}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
