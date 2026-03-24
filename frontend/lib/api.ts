import { AgentResponse, ScheduleItem, ConflictWarning, ProductivityScore } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8004";

// ── Existing ──────────────────────────────────────────────────────────────────

export async function sendMessage(
  message: string,
  threadId: string
): Promise<AgentResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: threadId }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }
  return res.json();
}

export async function getSchedule(threadId: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/schedule/${threadId}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function resetThread(threadId: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/reset/${threadId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Feature 1: Streaming ──────────────────────────────────────────────────────

export async function sendMessageStream(
  message: string,
  threadId: string,
  onToken: (token: string) => void,
  onSchedule: (schedule: ScheduleItem[]) => void,
  onDone: (fullContent: string) => void,
  onError: (error: string) => void
): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: threadId }),
  });

  if (!response.body) {
    onError("No response body");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep last partial line in buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "token") onToken(data.content);
        else if (data.type === "schedule") onSchedule(data.schedule);
        else if (data.type === "done") {
          // Fallback: if schedule came bundled in done (on_tool_end parse failed earlier)
          if (data.schedule) onSchedule(data.schedule);
          onDone(data.full_content);
        }
        else if (data.type === "error") onError(data.message);
      } catch {
        // Ignore malformed lines
      }
    }
  }
}

// ── Session management ────────────────────────────────────────────────────────

export async function deleteThread(threadId: string): Promise<{
  success: boolean;
  new_thread_id: string;
  deleted_thread_id: string;
}> {
  const res = await fetch(`${BASE_URL}/api/thread/${threadId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete thread");
  return res.json();
}

export async function getThreadSummary(threadId: string): Promise<{
  thread_id: string;
  message_count: number;
  last_schedule_preview: string[] | null;
  has_history: boolean;
}> {
  try {
    const res = await fetch(`${BASE_URL}/api/thread/${threadId}/summary`);
    if (!res.ok) return { thread_id: threadId, message_count: 0, last_schedule_preview: null, has_history: false };
    return res.json();
  } catch {
    return { thread_id: threadId, message_count: 0, last_schedule_preview: null, has_history: false };
  }
}

// ── Conversation history (persistence) ───────────────────────────────────────

export async function getConversationHistory(threadId: string): Promise<{
  history: Array<{ role: string; content: string }>;
  total: number;
}> {
  try {
    const res = await fetch(`${BASE_URL}/api/history/${threadId}`);
    if (!res.ok) return { history: [], total: 0 };
    return res.json();
  } catch {
    return { history: [], total: 0 };
  }
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function getOnboardingStatus(threadId: string): Promise<{
  is_onboarded: boolean;
  user_prefs: Record<string, string>;
  has_work_hours: boolean;
  has_role: boolean;
  message_count: number;
}> {
  try {
    const res = await fetch(`${BASE_URL}/api/onboarding-status/${threadId}`);
    if (!res.ok)
      return {
        is_onboarded: false,
        user_prefs: {},
        has_work_hours: false,
        has_role: false,
        message_count: 0,
      };
    return res.json();
  } catch {
    return {
      is_onboarded: false,
      user_prefs: {},
      has_work_hours: false,
      has_role: false,
      message_count: 0,
    };
  }
}

// ── Feature 2: Morning brief ──────────────────────────────────────────────────

export async function getMorningBrief(threadId: string): Promise<{
  brief: string;
  time: string;
  day: string;
  needs_onboarding?: boolean;
  user_prefs?: Record<string, string>;
}> {
  const res = await fetch(`${BASE_URL}/api/brief/${threadId}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Feature 4: Productivity score ────────────────────────────────────────────

export async function getScore(
  threadId: string,
  completedTasks: string[],
  totalTasks: number
): Promise<ProductivityScore> {
  const res = await fetch(`${BASE_URL}/api/score/${threadId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed_tasks: completedTasks, total_tasks: totalTasks }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Feature 5: Conflict detector ─────────────────────────────────────────────

export async function getConflicts(
  threadId: string,
  schedule: ScheduleItem[]
): Promise<{ warnings: ConflictWarning[] }> {
  const res = await fetch(`${BASE_URL}/api/conflicts/${threadId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schedule }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
