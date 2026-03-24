from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default"


class SubTask(BaseModel):
    text: str
    estimated_minutes: Optional[int] = None
    why: Optional[str] = None
    gotcha: Optional[str] = None
    resource: Optional[str] = None
    done: bool = False


class ScheduleItem(BaseModel):
    task: str = Field(description="Name of the task")
    time: str = Field(description="Start time, e.g. '09:00' or '9:00 AM'")
    duration_minutes: Optional[int] = Field(default=None, description="Duration in minutes")
    priority: Optional[str] = Field(default="medium", description="Priority level: high, medium, or low")
    type: Optional[str] = Field(default="work", description="Task type: work, break, learning, meeting, or personal")
    notes: Optional[str] = Field(default=None, description="Brief note on why this was scheduled here")
    subtasks: Optional[list[SubTask]] = Field(default_factory=list, description="Experience-calibrated subtasks for work items")


class DaySchedule(BaseModel):
    """An optimized daily schedule."""
    items: list[ScheduleItem] = Field(description="Scheduled tasks in chronological order")


class UserPrefs(BaseModel):
    wake_time: Optional[str] = Field(default=None, description="When the user typically wakes up, e.g. '6:30 AM'")
    work_preference: Optional[str] = Field(default=None, description="Work style, e.g. 'morning person', 'deep work in the morning'")
    break_pattern: Optional[str] = Field(default=None, description="How they prefer breaks, e.g. 'short breaks every hour'")
    sleep_time: Optional[str] = Field(default=None, description="When they typically sleep, e.g. '10:30 PM'")
    work_start_time: Optional[str] = Field(default=None, description="Work day start time, e.g. '9:00 AM'")
    work_end_time: Optional[str] = Field(default=None, description="Work day end time, e.g. '6:00 PM'")
    role: Optional[str] = Field(default=None, description="User's professional role, e.g. 'backend developer'")
    experience_level: Optional[str] = Field(default=None, description="Experience level, e.g. 'junior', 'mid-level', 'senior'")
    stack: Optional[str] = Field(default=None, description="Primary tech stack, e.g. 'Python, FastAPI, PostgreSQL'")
    skill_focus: Optional[str] = Field(default=None, description="Current skill focus area")
    is_onboarded: Optional[bool] = Field(default=None, description="True after first plan is generated")


class AgentResponse(BaseModel):
    message: str
    schedule: Optional[list[ScheduleItem]] = None
    user_prefs: Optional[UserPrefs] = None
    thread_id: str
