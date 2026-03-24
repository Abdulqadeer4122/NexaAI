"use client";

export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Orb 1 — top-left, accent-primary */}
      <div
        className="absolute top-[-20%] left-[-10%] h-96 w-96 animate-float rounded-full bg-accent-500 opacity-[0.06] blur-[120px] transition-all duration-700 dark:opacity-[0.08]"
      />
      {/* Orb 2 — bottom-right, accent-secondary */}
      <div
        className="absolute bottom-[-10%] right-[-5%] h-80 w-80 animate-float rounded-full bg-accent-400 opacity-[0.05] blur-[100px] transition-all duration-700 dark:opacity-[0.07]"
        style={{ animationDelay: "2s" }}
      />
      {/* Orb 3 — center, purple */}
      <div
        className="absolute top-[40%] left-[50%] h-64 w-64 animate-float rounded-full bg-purple-400 opacity-[0.04] blur-[80px] transition-all duration-700 dark:opacity-[0.06]"
        style={{ animationDelay: "4s" }}
      />
    </div>
  );
}
