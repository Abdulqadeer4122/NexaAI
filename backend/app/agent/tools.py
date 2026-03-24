import json
import os
from datetime import datetime
from dotenv import load_dotenv
from langchain_core.tools import tool

from app.agent.prompts import (
    TASK_ESTIMATION_PROMPT,
    PLANNER_PROMPT,
    GROWTH_TASKS_PROMPT,
    RESCHEDULER_PROMPT,
    MORNING_BRIEF_PROMPT,
    SUBTASK_GENERATION_PROMPT,
)

load_dotenv()

try:
    from langchain_anthropic import ChatAnthropic
    _anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not _anthropic_key:
        raise ValueError("ANTHROPIC_API_KEY not set")
    _llm = ChatAnthropic(
        model="claude-3-5-sonnet-20241022",
        temperature=0.3,
        api_key=_anthropic_key,
    )
except (ImportError, ValueError):
    from langchain_openai import ChatOpenAI
    _llm = ChatOpenAI(
        model="gpt-3.5-turbo",
        temperature=0.3,
        api_key=os.getenv("OPENAI_API_KEY"),
    )


def _parse_time(t: str):
    for fmt in ["%I:%M %p", "%I %p", "%H:%M", "%H:%M:%S", "%I:%M%p"]:
        try:
            return datetime.strptime(t.strip().upper(), fmt)
        except Exception:
            continue
    return None


def _total_minutes(start: str, end: str) -> int:
    s, e = _parse_time(start), _parse_time(end)
    if not s or not e:
        return 480
    diff = e - s
    return max(0, int(diff.total_seconds() / 60))


def _years_from_level(level: str) -> str:
    level = level.lower()
    if "junior" in level or "entry" in level or "jr" in level:
        return "1"
    elif "mid" in level or "intermediate" in level:
        return "3"
    elif "senior" in level or "sr" in level:
        return "6"
    elif "lead" in level or "staff" in level or "principal" in level:
        return "10"
    else:
        try:
            num = "".join(filter(str.isdigit, level))
            return num if num else "3"
        except Exception:
            return "3"


@tool
def estimate_and_plan(
    role: str,
    experience_level: str,
    stack: str,
    work_start_time: str,
    work_end_time: str,
    raw_tasks: str,
    work_preference: str = "morning",
    break_pattern: str = "every 2 hours",
    user_prefs: str = "{}",
) -> str:
    """Estimate task durations based on experience level and build a complete optimized schedule.
    Never ask the user for time estimates — this tool handles that.

    Args:
        role: User's professional role, e.g. 'backend developer'.
        experience_level: Experience level, e.g. 'junior', 'mid-level', 'senior', 'lead', or '3 years'.
        stack: Primary tech stack, e.g. 'Python, FastAPI, PostgreSQL'.
        work_start_time: Start of work day, e.g. '9:00 AM'.
        work_end_time: End of work day, e.g. '6:00 PM'.
        raw_tasks: Comma-separated or newline-separated list of tasks (no time estimates needed).
        work_preference: Energy peak preference — 'morning', 'afternoon', 'evening'.
        break_pattern: Break preference, e.g. 'every 2 hours', 'pomodoro'.
        user_prefs: JSON string of stored user preferences.

    Returns:
        JSON array of scheduled items with task, time, duration_minutes, priority, type, and notes.
    """
    years = _years_from_level(experience_level)
    total_mins = _total_minutes(work_start_time, work_end_time)

    # Step 1: estimate durations
    est_prompt = TASK_ESTIMATION_PROMPT.format(
        role=role,
        experience_level=experience_level,
        years_experience=years,
        stack=stack,
        work_start_time=work_start_time,
        work_end_time=work_end_time,
        total_working_minutes=total_mins,
        work_preference=work_preference,
        raw_tasks=raw_tasks,
    )
    est_response = _llm.invoke(est_prompt)
    estimated_tasks_raw = est_response.content.strip()

    # Strip markdown code fences if present
    if estimated_tasks_raw.startswith("```"):
        lines = estimated_tasks_raw.split("\n")
        estimated_tasks_raw = "\n".join(
            l for l in lines if not l.startswith("```")
        ).strip()

    try:
        estimated_tasks = json.loads(estimated_tasks_raw)
        task_total = sum(t.get("total_minutes", 60) for t in estimated_tasks)
    except Exception:
        estimated_tasks = []
        task_total = 0

    # Add lunch + breaks buffer
    task_total += 60  # lunch
    breaks_needed = max(1, task_total // 120) * 15
    task_total += breaks_needed

    free_time = max(0, total_mins - task_total)

    # Step 2: get growth tasks if free time >= 20 min
    growth_tasks = "[]"
    if free_time >= 20:
        try:
            prefs = json.loads(user_prefs) if user_prefs != "{}" else {}
        except Exception:
            prefs = {}
        growth_response = _llm.invoke(
            GROWTH_TASKS_PROMPT.format(
                role=role,
                experience_level=experience_level,
                years_experience=years,
                stack=stack,
                free_time_minutes=free_time,
                skill_focus=prefs.get("skill_focus", "general"),
            )
        )
        growth_tasks = growth_response.content.strip()
        if growth_tasks.startswith("```"):
            lines = growth_tasks.split("\n")
            growth_tasks = "\n".join(
                l for l in lines if not l.startswith("```")
            ).strip()

    # Step 3: build final schedule
    plan_prompt = PLANNER_PROMPT.format(
        role=role,
        experience_level=experience_level,
        years_experience=years,
        stack=stack,
        work_start_time=work_start_time,
        work_end_time=work_end_time,
        total_working_minutes=total_mins,
        work_preference=work_preference,
        break_pattern=break_pattern,
        estimated_tasks=json.dumps(estimated_tasks, indent=2),
        free_time_minutes=free_time,
        growth_tasks=growth_tasks,
    )
    plan_response = _llm.invoke(plan_prompt)
    content = plan_response.content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(l for l in lines if not l.startswith("```")).strip()

    # Step 4: Generate subtasks for each work-type task
    try:
        schedule_items = json.loads(content)
        for item in schedule_items:
            if item.get("type") == "work":
                subtask_prompt = SUBTASK_GENERATION_PROMPT.format(
                    task_name=item.get("task", ""),
                    task_type=item.get("type", "work"),
                    role=role,
                    experience_level=experience_level,
                    years_experience=years,
                    stack=stack,
                    duration_minutes=item.get("duration_minutes", 60),
                )
                subtask_response = _llm.invoke(subtask_prompt)
                subtask_content = subtask_response.content.strip()
                if subtask_content.startswith("```"):
                    subtask_lines = subtask_content.split("\n")
                    subtask_content = "\n".join(
                        l for l in subtask_lines if not l.startswith("```")
                    ).strip()
                try:
                    item["subtasks"] = json.loads(subtask_content)
                except Exception:
                    item["subtasks"] = []
            else:
                item["subtasks"] = []
        return json.dumps(schedule_items)
    except Exception:
        return content


@tool
def get_growth_tasks(
    role: str,
    experience_level: str,
    stack: str,
    free_time_minutes: str,
    skill_focus: str = "",
) -> str:
    """Get role and experience-level appropriate growth tasks to fill free time in the schedule.

    Args:
        role: User's professional role.
        experience_level: Experience level (e.g. 'junior', 'mid-level', 'senior').
        stack: Primary tech stack.
        free_time_minutes: Available free time in minutes (as string).
        skill_focus: Optional current skill focus area.

    Returns:
        JSON array of growth task suggestion strings.
    """
    try:
        mins = int(free_time_minutes)
    except Exception:
        mins = 45
    years = _years_from_level(experience_level)
    prompt = GROWTH_TASKS_PROMPT.format(
        role=role,
        experience_level=experience_level,
        years_experience=years,
        stack=stack,
        free_time_minutes=mins,
        skill_focus=skill_focus or "general",
    )
    response = _llm.invoke(prompt)
    return response.content


@tool
def reschedule_day(
    situation: str,
    current_schedule: str,
    user_prefs: str = "{}",
) -> str:
    """Adjust an existing schedule based on a new situation like waking up late, feeling tired, or a new urgent task.

    Args:
        situation: What changed, e.g. 'I woke up at 10:30 AM' or 'I have an urgent meeting at 2 PM'.
        current_schedule: JSON array string of the current schedule.
        user_prefs: JSON string of stored user preferences.

    Returns:
        Updated JSON array of scheduled items.
    """
    try:
        prefs = json.loads(user_prefs) if user_prefs != "{}" else {}
    except Exception:
        prefs = {}
    prompt = RESCHEDULER_PROMPT.format(
        user_prefs=user_prefs,
        experience_level=prefs.get("experience_level", "mid-level"),
        current_schedule=current_schedule,
        situation=situation,
    )
    response = _llm.invoke(prompt)
    return response.content


@tool
def update_memory(message: str, current_prefs: str = "{}") -> str:
    """Extract and update user profile from conversation. Stores role, experience level, stack, work hours, and preferences.

    Args:
        message: The user's message to extract profile data from.
        current_prefs: JSON string of currently stored preferences.

    Returns:
        JSON object with updated profile keys (only changed/new keys).
    """
    prompt = f"""Extract profile updates from this message.

Message: {message}
Current profile: {current_prefs}

Extract any of these if mentioned:
- role (e.g. "backend developer", "fullstack engineer")
- experience_level (e.g. "junior", "mid-level", "senior", "lead", or "3 years")
- stack (e.g. "Python, FastAPI, PostgreSQL")
- work_start_time (e.g. "9 AM")
- work_end_time (e.g. "6 PM")
- work_preference ("morning" | "afternoon" | "evening")
- break_pattern (e.g. "every 2 hours", "pomodoro")
- skill_focus (what they want to improve)
- is_onboarded (boolean — set true after first plan generated)
- wake_time (when the user typically wakes up)
- sleep_time (when they typically sleep)

Return ONLY a JSON object with changed keys. Empty dict {{}} if nothing changed.
No explanation. No markdown. Only JSON."""
    response = _llm.invoke(prompt)
    content = response.content.strip()
    # Strip markdown code fences
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(l for l in lines if not l.startswith("```")).strip()
    return content


@tool
def generate_subtasks(
    task_name: str,
    task_type: str,
    role: str,
    experience_level: str,
    stack: str,
    duration_minutes: str,
) -> str:
    """Generate experience-aware subtasks for a work task. Called automatically during planning for all work-type tasks.

    Args:
        task_name: The name of the task to generate subtasks for.
        task_type: The type of task, e.g. 'work'.
        role: User's professional role.
        experience_level: Experience level (e.g. 'junior', 'mid-level', 'senior').
        stack: Primary tech stack.
        duration_minutes: Estimated duration in minutes (as string).

    Returns:
        JSON array of subtask objects with text, estimated_minutes, why, gotcha, resource, done fields.
    """
    years = _years_from_level(experience_level)
    prompt = SUBTASK_GENERATION_PROMPT.format(
        task_name=task_name,
        task_type=task_type,
        role=role,
        experience_level=experience_level,
        years_experience=years,
        stack=stack,
        duration_minutes=duration_minutes,
    )
    response = _llm.invoke(prompt)
    content = response.content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(l for l in lines if not l.startswith("```")).strip()
    return content


@tool
def generate_morning_brief(
    user_prefs: str = "{}",
    current_time: str = "",
    day_of_week: str = "",
    context_summary: str = "",
    last_schedule: str = "",
) -> str:
    """Generate a personalized morning brief that references previous session context.

    Args:
        user_prefs: JSON string of user preferences.
        current_time: Current time string (e.g., '9:00 AM').
        day_of_week: Day of the week (e.g., 'Monday').
        context_summary: Summary of the previous session context.
        last_schedule: Comma-separated list of tasks from the last schedule.

    Returns:
        A short personalized morning brief message.
    """
    try:
        prefs = json.loads(user_prefs) if user_prefs != "{}" else {}
    except Exception:
        prefs = {}
    prompt = MORNING_BRIEF_PROMPT.format(
        user_prefs=user_prefs,
        experience_level=prefs.get("experience_level", "developer"),
        current_time=current_time,
        day_of_week=day_of_week,
        context_summary=context_summary or "No previous context",
        last_schedule=last_schedule or "No previous schedule",
    )
    response = _llm.invoke(prompt)
    return response.content
