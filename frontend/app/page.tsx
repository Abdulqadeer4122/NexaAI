"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AnimatedBackground from "@/components/AnimatedBackground";
import ThemeToggle from "@/components/ThemeToggle";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ScheduleTimeline from "@/components/ScheduleTimeline";
import TypingIndicator from "@/components/TypingIndicator";
import EmptyState from "@/components/EmptyState";
import OnboardingMessage from "@/components/OnboardingMessage";
import PrefsCard from "@/components/PrefsCard";
import FocusBar from "@/components/FocusBar";
import ProductivityScore from "@/components/ProductivityScore";
import ConflictBanner from "@/components/ConflictBanner";
import ExportButton from "@/components/ExportButton";
import NewSessionButton from "@/components/NewSessionButton";
import {
  sendMessageStream,
  getMorningBrief,
  getScore,
  getConflicts,
  getConversationHistory,
  getOnboardingStatus,
} from "@/lib/api";
import {
  ActiveTimer,
  ChatMessage as ChatMessageType,
  ConflictWarning,
  ProductivityScore as ProductivityScoreType,
  ScheduleItem,
  UserPrefs,
} from "@/lib/types";

export default function Home() {
  // ── Core state ───────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleItem[] | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPrefs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState("");
  /** null = loading, false = needs onboarding, true = onboarded */
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  // ── New feature state ────────────────────────────────────────────
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [productivityData, setProductivityData] = useState<ProductivityScoreType | null>(null);
  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [stopTimerFlag, setStopTimerFlag] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Init thread ID ────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("autopilot-thread");
    if (stored) {
      setThreadId(stored);
    } else {
      const id = crypto.randomUUID();
      localStorage.setItem("autopilot-thread", id);
      setThreadId(id);
    }
  }, []);

  // ── Load persisted history, check onboarding, then show brief ────
  useEffect(() => {
    if (!threadId) return;

    getOnboardingStatus(threadId)
      .then(async (status) => {
        if (!status.is_onboarded) {
          // First-time user — show onboarding wizard
          setIsOnboarded(false);
          setMessages([]);
          return;
        }

        // Capture user prefs from onboarding status
        if (status.user_prefs && Object.keys(status.user_prefs).length > 0) {
          setUserPrefs(status.user_prefs as UserPrefs);
        }

        // Returning user — restore history then show brief
        setIsOnboarded(true);
        try {
          const { history, total } = await getConversationHistory(threadId);
          if (total > 0) {
            const restored: ChatMessageType[] = history.map((item, i) => ({
              id: i.toString(),
              role: item.role as "user" | "assistant",
              content: item.content,
              timestamp: new Date(),
            }));
            setMessages(restored);
          }
        } catch {
          // ignore history errors — brief will still show
        }

        getMorningBrief(threadId)
          .then(({ brief, needs_onboarding }) => {
            if (needs_onboarding) {
              setIsOnboarded(false);
              setMessages([]);
              return;
            }
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: brief,
                timestamp: new Date(),
                type: "brief",
              },
            ]);
          })
          .catch(() => {});
      })
      .catch(() => {
        // Fail open — treat as onboarded to avoid blocking the app
        setIsOnboarded(true);
        getMorningBrief(threadId)
          .then(({ brief }) => {
            setMessages([{
              id: crypto.randomUUID(),
              role: "assistant",
              content: brief,
              timestamp: new Date(),
              type: "brief",
            }]);
          })
          .catch(() => {});
      });
  }, [threadId]);


  // ── Auto-scroll ───────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Feature 5: Fetch conflicts when schedule changes ─────────────
  useEffect(() => {
    if (!currentSchedule || !threadId) return;
    getConflicts(threadId, currentSchedule)
      .then(({ warnings }) => setConflicts(warnings))
      .catch(() => setConflicts([]));
  }, [currentSchedule, threadId]);

  // ── Feature 4: Fetch score when completed tasks change ────────────
  useEffect(() => {
    if (!threadId || completedTasks.length === 0) return;
    const timer = setTimeout(() => {
      getScore(threadId, completedTasks, currentSchedule?.length ?? 0)
        .then(setProductivityData)
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [completedTasks, threadId, currentSchedule?.length]);

  // ── Feature 1: Streaming send ─────────────────────────────────────
  const handleSend = useCallback(
    async (content: string) => {
      if (!threadId || !content.trim()) return;

      const userMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      const streamId = crypto.randomUUID();
      const placeholderMsg: ChatMessageType = {
        id: streamId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, placeholderMsg]);
      setIsLoading(true);

      try {
        await sendMessageStream(
          content,
          threadId,
          // onToken
          (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId ? { ...m, content: m.content + token } : m
              )
            );
          },
          // onSchedule
          (schedule) => {
            setCurrentSchedule(schedule);
          },
          // onDone
          (fullContent) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId
                  ? { ...m, content: fullContent, isStreaming: false }
                  : m
              )
            );
            setIsLoading(false);
          },
          // onError
          (error) => {
            console.error("Stream error:", error);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId
                  ? {
                      ...m,
                      content:
                        "Sorry, something went wrong. Please check the backend is running and try again.",
                      isStreaming: false,
                    }
                  : m
              )
            );
            setIsLoading(false);
          }
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamId
              ? {
                  ...m,
                  content:
                    "Sorry, something went wrong. Please check the backend is running and try again.",
                  isStreaming: false,
                }
              : m
          )
        );
        setIsLoading(false);
      }
    },
    [threadId]
  );

  // ── Onboarding complete ───────────────────────────────────────────
  const handleOnboardingComplete = useCallback(
    async (data: { profile?: string; work_start: string; work_end: string; role?: string; tasks: string }) => {
      setIsOnboarded(true);

      const profilePart = data.profile || data.role || "developer";
      const message = `I am a ${profilePart}. My workday is ${data.work_start} to ${data.work_end}. Today I need to do: ${data.tasks}. Please plan my day — estimate the task durations yourself based on my experience level and fill any free time with appropriate growth tasks.`;

      const userMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      const streamId = crypto.randomUUID();
      const placeholderMsg: ChatMessageType = {
        id: streamId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages([userMsg, placeholderMsg]);
      setIsLoading(true);

      try {
        await sendMessageStream(
          message,
          threadId,
          (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId ? { ...m, content: m.content + token } : m
              )
            );
          },
          (schedule) => setCurrentSchedule(schedule),
          (fullContent) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId ? { ...m, content: fullContent, isStreaming: false } : m
              )
            );
            setIsLoading(false);
          },
          (error) => {
            console.error("Onboarding stream error:", error);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId
                  ? { ...m, content: "Sorry, something went wrong. Please try again.", isStreaming: false }
                  : m
              )
            );
            setIsLoading(false);
          }
        );
      } catch {
        setIsLoading(false);
      }
    },
    [threadId]
  );

  // ── Feature 3: Task complete handler ─────────────────────────────
  const handleTaskComplete = useCallback(
    (taskName: string) => {
      setCompletedTasks((prev) => {
        if (prev.includes(taskName)) return prev;
        return [...prev, taskName];
      });
      handleSend(`I just completed: ${taskName}`);
    },
    [handleSend]
  );

  // ── Feature 3: Timer stop ─────────────────────────────────────────
  const handleTimerStop = () => {
    setActiveTimer(null);
    setStopTimerFlag((f) => f + 1);
  };

  const handleSuggestion = (text: string) => {
    handleSend(text);
  };

  // ── Session reset ─────────────────────────────────────────────────
  const handleSessionReset = (newThreadId: string) => {
    localStorage.setItem("autopilot-thread", newThreadId);
    setThreadId(newThreadId);
    setMessages([]);
    setCurrentSchedule(null);
    setUserPrefs(null);
    setProductivityData(null);
    setCompletedTasks([]);
    setConflicts([]);
    setActiveTimer(null);
    setIsLoading(false);
    setIsOnboarded(null); // re-check onboarding on new thread
  };

  // ── Derived ───────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const hasPrefs = userPrefs && Object.values(userPrefs).some(Boolean);
  // Only show messages beyond the brief for the count
  const chatMessages = messages.filter((m) => m.type !== "brief" || messages.indexOf(m) === 0);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <AnimatedBackground />

      <div className="relative z-10 flex h-screen flex-col">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header
          className="flex shrink-0 items-center justify-between border-b px-6 py-4 backdrop-blur-sm"
          style={{
            borderColor: "var(--border-color)",
            backgroundColor: "var(--bg-glass)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                boxShadow: "var(--shadow-md)",
              }}
            >
              ✦
            </div>
            <span
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Nexa{" "}
              <span style={{ color: "var(--accent-primary)" }}>AI</span>
            </span>
            <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-green-400" />
          </div>

          <div className="flex items-center gap-3">
            {threadId && (
              <span
                className="rounded-full px-3 py-1 font-mono text-xs"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                }}
              >
                {threadId.slice(0, 8)}
              </span>
            )}
            {threadId && (
              <NewSessionButton threadId={threadId} onSessionReset={handleSessionReset} />
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left Panel — Chat ──────────────────────────────── */}
          <div
            className="flex flex-[3] flex-col overflow-hidden border-r"
            style={{ borderColor: "var(--border-color)" }}
          >
            {/* Chat subheader */}
            <div
              className="flex shrink-0 items-center justify-between border-b px-6 py-3"
              style={{
                borderColor: "var(--border-color)",
                backgroundColor: "color-mix(in srgb, var(--bg-secondary) 50%, transparent)",
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Chat
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                }}
              >
                {chatMessages.length}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto scroll-smooth px-6 py-4">
              {isOnboarded === null ? (
                /* Loading skeleton */
                <div className="flex flex-col gap-3 animate-pulse py-8">
                  <div className="h-4 w-2/3 rounded-full mx-auto" style={{ backgroundColor: "var(--bg-tertiary)" }} />
                  <div className="h-4 w-1/2 rounded-full mx-auto" style={{ backgroundColor: "var(--bg-tertiary)" }} />
                </div>
              ) : isOnboarded === false && messages.length === 0 ? (
                /* Onboarding wizard */
                <OnboardingMessage
                  onOnboardingComplete={handleOnboardingComplete}
                  onSkip={() => setIsOnboarded(true)}
                />
              ) : messages.length === 0 && !isLoading ? (
                <EmptyState onSuggestion={handleSuggestion} />
              ) : (
                messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
              )}
              {isLoading && messages[messages.length - 1]?.isStreaming !== true && (
                <TypingIndicator />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Feature 3: FocusBar — shown above input when timer is running */}
            {activeTimer && (
              <FocusBar timer={activeTimer} onStop={handleTimerStop} />
            )}

            {/* Input */}
            <div
              className="shrink-0 border-t px-6 py-4 backdrop-blur-sm"
              style={{
                borderColor: "var(--border-color)",
                backgroundColor: "var(--bg-glass)",
              }}
            >
              <ChatInput onSend={handleSend} disabled={isLoading} />
            </div>
          </div>

          {/* ── Right Panel — Schedule ─────────────────────────── */}
          <div
            className="flex flex-[2] flex-col overflow-hidden"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--bg-secondary) 30%, transparent)",
            }}
          >
            {/* Schedule subheader */}
            <div
              className="flex shrink-0 items-center justify-between border-b px-6 py-3"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Schedule
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Feature 6: Export button */}
                {currentSchedule && currentSchedule.length > 0 && (
                  <ExportButton schedule={currentSchedule} />
                )}
                <span
                  className="rounded-full px-3 py-1 text-xs"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-muted)",
                  }}
                >
                  {today}
                </span>
              </div>
            </div>

            {/* Schedule content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Feature 5: Conflict warnings */}
              {conflicts.length > 0 && (
                <ConflictBanner warnings={conflicts} />
              )}

              {currentSchedule && currentSchedule.length > 0 ? (
                <ScheduleTimeline
                  items={currentSchedule}
                  onTaskComplete={handleTaskComplete}
                  onActiveTimerChange={setActiveTimer}
                  stopSignal={stopTimerFlag}
                  experienceLevel={userPrefs?.experience_level ?? "mid"}
                />
              ) : (
                <div className="flex h-full animate-fadeSlideUp flex-col items-center justify-center gap-3">
                  <div
                    className="flex h-12 w-12 animate-float items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    📅
                  </div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No schedule yet
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Ask me to plan your day
                  </p>
                </div>
              )}
            </div>

            {/* Preferences + Productivity score */}
            {(hasPrefs || productivityData) && (
              <div
                className="shrink-0 space-y-3 border-t px-6 py-4"
                style={{ borderColor: "var(--border-color)" }}
              >
                {/* Feature 4: Productivity score */}
                {productivityData && (
                  <ProductivityScore
                    data={productivityData}
                    completedCount={completedTasks.length}
                    totalCount={currentSchedule?.length ?? 0}
                  />
                )}
                {hasPrefs && <PrefsCard prefs={userPrefs!} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
