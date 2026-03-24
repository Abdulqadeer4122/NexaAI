"use client";

import { KeyboardEvent, useRef, useState } from "react";
import VoiceButton from "./VoiceButton";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div
      className="flex items-end gap-2 rounded-2xl border p-3 backdrop-blur-sm transition-all duration-200 focus-within:border-accent-300 focus-within:shadow-[var(--shadow-lg)] dark:focus-within:border-accent-600"
      style={{
        backgroundColor: "var(--bg-glass)",
        borderColor: "var(--border-color)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <VoiceButton onTranscript={(t) => setValue(t)} />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Plan my day, add a meeting, reschedule..."
        rows={1}
        disabled={disabled}
        className="max-h-[120px] min-h-[40px] flex-1 resize-none overflow-y-auto bg-transparent py-2 text-sm leading-relaxed outline-none disabled:opacity-50 placeholder:text-[var(--text-muted)]"
        style={{ color: "var(--text-primary)" }}
      />

      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: "var(--accent-primary)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {disabled ? (
          /* Spinner */
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-30"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          /* Send arrow */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
      </button>
    </div>
  );
}
