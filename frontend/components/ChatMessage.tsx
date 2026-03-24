"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import ScheduleTimeline from "./ScheduleTimeline";

interface ChatMessageProps {
  message: ChatMessageType;
}

/** Renders assistant markdown with consistent prose styling. */
function MarkdownBody({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div className="prose-sm max-w-none text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs — preserve spacing without extra margins
          p: ({ children }) => (
            <p className="mb-1.5 last:mb-0" style={{ color: "var(--text-secondary)" }}>
              {children}
            </p>
          ),
          // Ordered list
          ol: ({ children }) => (
            <ol className="mb-1.5 list-decimal pl-5 last:mb-0" style={{ color: "var(--text-secondary)" }}>
              {children}
            </ol>
          ),
          // Unordered list
          ul: ({ children }) => (
            <ul className="mb-1.5 list-disc pl-5 last:mb-0" style={{ color: "var(--text-secondary)" }}>
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="mb-0.5" style={{ color: "var(--text-secondary)" }}>
              {children}
            </li>
          ),
          // Bold
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {children}
            </strong>
          ),
          // Inline code
          code: ({ children }) => (
            <code
              className="rounded px-1 py-0.5 font-mono text-xs"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--accent-primary)" }}
            >
              {children}
            </code>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-2 border-t" style={{ borderColor: "var(--border-color)" }} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {/* Blinking cursor during streaming */}
      {isStreaming && (
        <span
          className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[1px] animate-blink rounded-sm align-middle"
          style={{ backgroundColor: "var(--accent-primary)" }}
        />
      )}
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Morning Brief ──────────────────────────────────────────────────
  if (message.type === "brief") {
    return (
      <div className="flex animate-fadeSlideIn items-start gap-3">
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

        <div className="max-w-[80%]">
          <div
            className="mb-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              color: "#fff",
            }}
          >
            ✦ Morning Brief
          </div>

          <div
            className="rounded-2xl rounded-bl-sm border px-5 py-4 backdrop-blur-sm"
            style={{
              backgroundColor: "var(--bg-glass)",
              borderColor: "var(--accent-primary)",
              boxShadow: "var(--shadow-sm)",
              borderTopWidth: "2px",
            }}
          >
            <MarkdownBody content={message.content} />
          </div>
        </div>
      </div>
    );
  }

  // ── User message ───────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex animate-fadeSlideUp justify-end">
        <div className="flex max-w-[75%] flex-col items-end">
          <div
            className="rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed text-white"
            style={{ backgroundColor: "var(--accent-primary)", boxShadow: "var(--shadow-md)" }}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
            {timeStr}
          </span>
        </div>
      </div>
    );
  }

  // ── Assistant message ──────────────────────────────────────────────
  return (
    <div className="flex animate-fadeSlideIn items-start gap-3">
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

      <div className="flex max-w-[80%] flex-col">
        <div
          className="rounded-2xl rounded-bl-sm border px-4 py-3 backdrop-blur-sm"
          style={{
            backgroundColor: "var(--bg-glass)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <MarkdownBody content={message.content} isStreaming={message.isStreaming} />
        </div>

        {message.schedule && message.schedule.length > 0 && (
          <div className="mt-3 w-full animate-fadeSlideUp" style={{ animationDelay: "150ms" }}>
            <ScheduleTimeline items={message.schedule} compact />
          </div>
        )}

        <span className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
          {timeStr}
        </span>
      </div>
    </div>
  );
}
