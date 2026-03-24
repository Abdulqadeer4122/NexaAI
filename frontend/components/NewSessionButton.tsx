"use client";

import { useEffect, useState } from "react";
import NewSessionModal from "./NewSessionModal";
import { deleteThread, getThreadSummary } from "@/lib/api";

interface NewSessionButtonProps {
  threadId: string;
  onSessionReset: (newThreadId: string) => void;
}

export default function NewSessionButton({ threadId, onSessionReset }: NewSessionButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadSummary, setThreadSummary] = useState<{
    message_count: number;
    last_schedule_preview: string[] | null;
    has_history: boolean;
  } | null>(null);

  useEffect(() => {
    if (!threadId) return;
    getThreadSummary(threadId).then(setThreadSummary).catch(() => {});
  }, [threadId]);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await deleteThread(threadId);
      setShowModal(false);
      setThreadSummary(null);
      onSessionReset(result.new_thread_id);
    } catch (e) {
      console.error("Failed to delete thread:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const hasHistory = threadSummary?.has_history ?? false;

  return (
    <>
      <NewSessionModal
        isOpen={showModal}
        onConfirm={handleConfirm}
        onCancel={() => setShowModal(false)}
        isLoading={isLoading}
        threadSummary={threadSummary}
      />

      <div className="relative flex items-center gap-1.5">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200"
          style={
            hasHistory
              ? {
                  backgroundColor: "rgba(239,68,68,0.1)",
                  borderColor: "rgba(239,68,68,0.2)",
                  color: "#f87171",
                }
              : {
                  backgroundColor: "var(--bg-tertiary)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-muted)",
                }
          }
          aria-label="Start new session"
        >
          {hasHistory ? (
            /* Rotate-CCW icon */
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          ) : (
            /* Plus icon */
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
          New session
        </button>

        {/* Pulsing dot — only when there's history to clear */}
        {hasHistory && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        )}
      </div>
    </>
  );
}
