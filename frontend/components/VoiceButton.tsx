"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
}

export default function VoiceButton({ onTranscript }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    setIsSupported(true);
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      if (final) {
        onTranscript(final.trim());
        setIsListening(false);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, [onTranscript]);

  if (!isSupported) return null;

  const handleClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isListening ? "Stop listening" : "Start voice input"}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
        isListening
          ? "border-transparent text-white"
          : "border text-[var(--text-muted)] hover:text-accent-500"
      }`}
      style={
        isListening
          ? {
              backgroundColor: "var(--accent-primary)",
              boxShadow: "0 8px 32px var(--accent-glow)",
            }
          : {
              backgroundColor: "var(--bg-tertiary)",
              borderColor: "var(--border-color)",
            }
      }
    >
      {isListening ? (
        /* Animated wave bars */
        <div className="flex items-center gap-0.5">
          {[0, 100, 200, 300].map((delay) => (
            <span
              key={delay}
              className="h-4 w-0.5 animate-voice-wave rounded-full bg-white"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      ) : (
        /* Microphone icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      )}
    </button>
  );
}
