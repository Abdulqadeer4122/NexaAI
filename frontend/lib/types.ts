export interface SubTask {
  text: string;
  estimated_minutes?: number;
  why?: string | null;
  gotcha?: string | null;
  resource?: string | null;
  done: boolean;
}

export interface ScheduleItem {
  task: string;
  time: string;
  duration_minutes?: number;
  priority?: string;
  type?: "work" | "break" | "learning" | "meeting" | "personal";
  notes?: string;
  subtasks?: SubTask[];
}

export interface UserPrefs {
  wake_time?: string;
  work_preference?: string;
  break_pattern?: string;
  sleep_time?: string;
  work_start_time?: string;
  work_end_time?: string;
  role?: string;
  experience_level?: string;
  stack?: string;
  skill_focus?: string;
  is_onboarded?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  schedule?: ScheduleItem[];
  timestamp: Date;
  /** 'brief' renders a special morning brief style; undefined = normal */
  type?: "brief";
  /** true while streaming tokens are still arriving */
  isStreaming?: boolean;
}

export interface AgentResponse {
  message: string;
  schedule?: ScheduleItem[];
  user_prefs?: UserPrefs;
  thread_id: string;
}

export interface ConflictWarning {
  type: "overlap" | "overload" | "no-break" | "long-day";
  severity: "warning" | "critical";
  message: string;
  tasks: string[];
}

export interface ProductivityScore {
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  insight: string;
  trend: "up" | "down" | "steady";
}

export interface ActiveTimer {
  taskName: string;
  remaining: number; // seconds
  total: number;     // seconds
}
