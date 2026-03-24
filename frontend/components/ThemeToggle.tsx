"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("autopilot-theme") ?? "dark";
    setIsDark(stored === "dark");
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("autopilot-theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Render placeholder to avoid layout shift before mount
  if (!mounted) {
    return <div className="h-7 w-14 rounded-full bg-slate-700" />;
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative h-7 w-14 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ${
        isDark ? "bg-slate-700" : "bg-amber-200"
      }`}
    >
      {/* Sliding circle */}
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
          isDark ? "translate-x-8" : "translate-x-1"
        }`}
      />

      {/* Sun icon — visible in light mode */}
      <svg
        className={`absolute left-1.5 top-1.5 h-4 w-4 text-amber-500 transition-opacity duration-200 ${
          isDark ? "opacity-0" : "opacity-100"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
        />
      </svg>

      {/* Moon icon — visible in dark mode */}
      <svg
        className={`absolute right-1.5 top-1.5 h-4 w-4 text-slate-300 transition-opacity duration-200 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
    </button>
  );
}
