import { UserPrefs } from "@/lib/types";

interface PrefsCardProps {
  prefs: UserPrefs;
}

const PREF_FIELDS: { key: keyof UserPrefs; label: string }[] = [
  { key: "wake_time", label: "wake time" },
  { key: "work_preference", label: "work preference" },
  { key: "break_pattern", label: "break pattern" },
  { key: "sleep_time", label: "sleep time" },
];

export default function PrefsCard({ prefs }: PrefsCardProps) {
  const visible = PREF_FIELDS.filter((f) => prefs[f.key]);
  if (visible.length === 0) return null;

  return (
    <div
      className="animate-fadeSlideUp rounded-2xl border p-4 backdrop-blur-sm"
      style={{
        backgroundColor: "var(--bg-glass)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: "var(--accent-primary)" }} className="text-sm">
          ◈
        </span>
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Learned about you
        </span>
      </div>

      {/* Preference rows */}
      <div>
        {visible.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center gap-2 border-b py-2 last:border-0"
            style={{ borderColor: "var(--border-color)" }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: "var(--accent-secondary)" }}
            />
            <span
              className="text-xs capitalize"
              style={{ color: "var(--text-muted)" }}
            >
              {label}
            </span>
            <span
              className="ml-auto text-xs font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {prefs[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
