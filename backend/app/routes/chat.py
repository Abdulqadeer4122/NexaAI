import json
import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.agent.graph import (
    invoke_agent, stream_agent_events, get_state, list_threads,
    delete_thread, get_thread_summary,
)
from app.schemas.models import ChatRequest, AgentResponse, ScheduleItem, UserPrefs

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ── Safe JSON serialisation ───────────────────────────────────────────────────

class _SafeEncoder(json.JSONEncoder):
    """Handle LangChain message objects and other non-serializable types."""

    def default(self, obj):
        # Pydantic v2
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        # Pydantic v1 / dataclasses
        if hasattr(obj, "dict"):
            return obj.dict()
        # Fallback: stringify
        try:
            return str(obj)
        except Exception:
            return "<unserializable>"


def _sse(payload: dict) -> str:
    """Serialise a dict to an SSE data line, safely."""
    return f"data: {json.dumps(payload, cls=_SafeEncoder)}\n\n"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _extract_schedule(messages: list) -> list[ScheduleItem] | None:
    """Parse schedule from tool messages, matched by tool name."""
    for msg in reversed(messages):
        if hasattr(msg, "type") and msg.type == "tool":
            tool_name = getattr(msg, "name", "")
            if tool_name not in ("estimate_and_plan", "reschedule_day"):
                continue
            try:
                content = msg.content
                # Strip markdown fences if present
                if isinstance(content, str) and content.strip().startswith("```"):
                    lines = content.strip().split("\n")
                    content = "\n".join(l for l in lines if not l.startswith("```")).strip()
                data = json.loads(content)
                if isinstance(data, list) and len(data) > 0 and "task" in data[0]:
                    return [ScheduleItem(**{k: v for k, v in item.items() if k in ScheduleItem.model_fields}) for item in data]
            except (json.JSONDecodeError, KeyError, TypeError):
                continue
    return None


def _parse_prefs_from_messages(messages: list) -> dict:
    """Merge all update_memory tool outputs into a single prefs dict."""
    prefs: dict = {}
    for msg in messages:
        if hasattr(msg, "type") and msg.type == "tool":
            if getattr(msg, "name", "") != "update_memory":
                continue
            try:
                content = msg.content
                if isinstance(content, str) and content.strip().startswith("```"):
                    lines = content.strip().split("\n")
                    content = "\n".join(l for l in lines if not l.startswith("```")).strip()
                data = json.loads(content)
                if isinstance(data, dict):
                    prefs.update(data)
            except (json.JSONDecodeError, TypeError):
                pass
    return prefs


def _extract_user_prefs(messages: list) -> UserPrefs | None:
    """Extract updated user prefs from update_memory tool output."""
    for msg in reversed(messages):
        if hasattr(msg, "type") and msg.type == "tool":
            if getattr(msg, "name", "") != "update_memory":
                continue
            try:
                content = msg.content
                if isinstance(content, str) and content.strip().startswith("```"):
                    lines = content.strip().split("\n")
                    content = "\n".join(l for l in lines if not l.startswith("```")).strip()
                data = json.loads(content)
                if isinstance(data, dict) and data:
                    known = set(UserPrefs.model_fields.keys())
                    pref_data = {k: v for k, v in data.items() if k in known}
                    if pref_data:
                        return UserPrefs(**pref_data)
            except (json.JSONDecodeError, KeyError, TypeError):
                continue
    return None


def _get_last_ai_message(messages: list) -> str:
    for msg in reversed(messages):
        if hasattr(msg, "type") and msg.type == "ai":
            content = msg.content
            if isinstance(content, str) and content.strip():
                return _clean_ai_content(content)
            if isinstance(content, list):
                text_parts = [
                    block.get("text", "") if isinstance(block, dict) else str(block)
                    for block in content
                    if not isinstance(block, dict) or block.get("type") != "tool_use"
                ]
                combined = " ".join(p for p in text_parts if p.strip())
                if combined.strip():
                    return _clean_ai_content(combined)
    return "I processed your request."


def _clean_ai_content(content: str) -> str:
    """Strip leading JSON blocks that the model sometimes echoes from tool outputs."""
    if not content:
        return content
    text = content.strip()
    while text and text[0] in ("{", "["):
        try:
            decoder = json.JSONDecoder()
            _, end = decoder.raw_decode(text)
            rest = text[end:].lstrip()
            if rest == text:
                break
            text = rest
        except (json.JSONDecodeError, ValueError):
            break
    return text.strip()


def _tool_output_str(raw_output) -> str:
    """Safely extract a string from an on_tool_end output (may be ToolMessage or str)."""
    if raw_output is None:
        return ""
    if hasattr(raw_output, "content"):
        return raw_output.content if isinstance(raw_output.content, str) else ""
    if isinstance(raw_output, str):
        return raw_output
    return str(raw_output)


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=AgentResponse)
async def chat(request: ChatRequest):
    """Send a message to the AutoPilot AI agent and receive a response."""
    try:
        result = await invoke_agent(request.message, request.thread_id)
    except Exception as e:
        error_id = uuid.uuid4().hex[:8]
        logger.exception("Agent error [%s]", error_id)
        raise HTTPException(status_code=500, detail=f"Internal error (ref: {error_id})")

    messages = result.get("messages", [])
    message = _get_last_ai_message(messages)
    schedule = _extract_schedule(messages)
    user_prefs = _extract_user_prefs(messages)

    return AgentResponse(
        message=message,
        schedule=schedule,
        user_prefs=user_prefs,
        thread_id=request.thread_id,
    )


# ── Streaming ─────────────────────────────────────────────────────────────────

@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Stream AI response tokens via Server-Sent Events."""

    async def event_generator():
        try:
            full_content = ""
            schedule = None
            any_tool_started = False
            active_tool_count = 0

            async for event in stream_agent_events(req.message, req.thread_id):
                kind = event.get("event", "")

                if kind == "on_tool_start":
                    active_tool_count += 1
                    any_tool_started = True

                elif kind == "on_tool_end":
                    active_tool_count = max(0, active_tool_count - 1)
                    tool_output = _tool_output_str(event.get("data", {}).get("output"))
                    try:
                        parsed = json.loads(tool_output)
                        if isinstance(parsed, list) and len(parsed) > 0 and "task" in parsed[0]:
                            schedule = parsed
                            yield _sse({"type": "schedule", "schedule": schedule})
                    except Exception:
                        pass

                elif kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk", {})
                    if hasattr(chunk, "content") and isinstance(chunk.content, str) and chunk.content:
                        token = chunk.content
                        full_content += token
                        is_final = (not any_tool_started) or (any_tool_started and active_tool_count == 0)
                        if is_final:
                            yield _sse({"type": "token", "content": token})

            clean = _clean_ai_content(full_content)
            done_payload: dict = {"type": "done", "full_content": clean}
            if schedule is not None:
                done_payload["schedule"] = schedule
            yield _sse(done_payload)

        except Exception as e:
            error_id = uuid.uuid4().hex[:8]
            logger.exception("Stream error [%s]", error_id)
            yield _sse({"type": "error", "message": f"Stream error (ref: {error_id})"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Schedule / state ──────────────────────────────────────────────────────────

@router.get("/schedule/{thread_id}")
async def get_schedule(thread_id: str):
    """Get the persisted schedule for a thread."""
    try:
        state = await get_state(thread_id)
        messages = state.get("messages", [])
        schedule = _extract_schedule(messages)
        return {
            "thread_id": thread_id,
            "schedule": [s.model_dump() for s in schedule] if schedule else None,
            "message_count": len(messages),
        }
    except Exception as e:
        error_id = uuid.uuid4().hex[:8]
        logger.exception("get_schedule error [%s]", error_id)
        raise HTTPException(status_code=500, detail=f"Internal error (ref: {error_id})")


@router.get("/history/{thread_id}")
async def get_conversation_history(thread_id: str):
    """Return the persisted conversation history for a thread."""
    try:
        state = await get_state(thread_id)
        messages = state.get("messages", [])
        history = []
        for m in messages:
            if not (hasattr(m, "type") and m.type in ("human", "ai")):
                continue
            content = m.content
            if isinstance(content, list):
                content = " ".join(
                    b.get("text", "") for b in content
                    if isinstance(b, dict) and b.get("type") == "text"
                )
            if content and content.strip():
                history.append({
                    "role": "user" if m.type == "human" else "assistant",
                    "content": content.strip(),
                })
        return {"thread_id": thread_id, "history": history, "total": len(history)}
    except Exception as e:
        error_id = uuid.uuid4().hex[:8]
        logger.exception("get_history error [%s]", error_id)
        raise HTTPException(status_code=500, detail=f"Internal error (ref: {error_id})")


@router.get("/threads")
async def get_all_threads():
    """List all known thread IDs in the SQLite store."""
    try:
        threads = await list_threads()
        return {"threads": threads, "count": len(threads)}
    except Exception as e:
        error_id = uuid.uuid4().hex[:8]
        logger.exception("list_threads error [%s]", error_id)
        raise HTTPException(status_code=500, detail=f"Internal error (ref: {error_id})")


@router.delete("/thread/{thread_id}")
async def delete_thread_history(thread_id: str):
    """Delete all SQLite checkpoints for a thread and return a fresh thread ID."""
    success = await delete_thread(thread_id)
    new_thread_id = str(uuid.uuid4())
    return {
        "success": success,
        "deleted_thread_id": thread_id,
        "new_thread_id": new_thread_id,
        "message": "Thread deleted. Use new_thread_id for fresh session.",
    }


@router.get("/thread/{thread_id}/summary")
async def get_thread_summary_endpoint(thread_id: str):
    """Return a lightweight summary of a thread's history."""
    summary = await get_thread_summary(thread_id)
    return summary


@router.post("/reset/{thread_id}")
async def reset_thread(thread_id: str):
    """Legacy: return a fresh thread ID for the client to use."""
    new_id = str(uuid.uuid4())
    return {
        "message": "Start a new session with the new_thread_id below.",
        "old_thread_id": thread_id,
        "new_thread_id": new_id,
    }


# ── Onboarding status ─────────────────────────────────────────────────────────

@router.get("/onboarding-status/{thread_id}")
async def get_onboarding_status(thread_id: str):
    """Check whether a user has completed onboarding for a given thread."""
    try:
        state = await get_state(thread_id)
    except Exception:
        state = {}

    messages = state.get("messages", []) if state else []
    prefs = _parse_prefs_from_messages(messages)

    is_onboarded = bool(
        prefs.get("is_onboarded")
        or (prefs.get("experience_level") and prefs.get("work_start_time"))
        or (prefs.get("role") and prefs.get("work_start_time"))
    )
    human_count = sum(
        1 for m in messages if hasattr(m, "type") and m.type == "human"
    )

    return {
        "is_onboarded": is_onboarded,
        "user_prefs": prefs,
        "has_work_hours": bool(prefs.get("work_start_time") and prefs.get("work_end_time")),
        "has_role": bool(prefs.get("role") or prefs.get("experience_level")),
        "message_count": human_count,
    }


# ── Morning brief ─────────────────────────────────────────────────────────────

@router.get("/brief/{thread_id}")
async def get_morning_brief(thread_id: str):
    """Generate a personalized morning brief, referencing the user's previous session."""
    now = datetime.now()
    time_str = now.strftime("%I:%M %p")
    day_str = now.strftime("%A")

    try:
        state = await get_state(thread_id)
    except Exception:
        state = {}

    messages = state.get("messages", []) if state else []
    prefs = _parse_prefs_from_messages(messages)

    # First-time user — no onboarding data yet
    is_onboarded = bool(
        prefs.get("is_onboarded")
        or (prefs.get("experience_level") and prefs.get("work_start_time"))
        or (prefs.get("role") and prefs.get("work_start_time"))
    )

    if not is_onboarded and not messages:
        return {
            "brief": "Hey! I'm Nexa AI. To plan your day properly I need to know a bit about you — what you do, your experience level, and your working hours. Ready?",
            "time": time_str,
            "day": day_str,
            "needs_onboarding": True,
        }

    # Build last schedule preview
    last_schedule_tasks: list[str] = []
    for m in reversed(messages[-20:]):
        if hasattr(m, "type") and m.type == "tool" and getattr(m, "name", "") in ("estimate_and_plan", "reschedule_day"):
            try:
                parsed = json.loads(m.content)
                if isinstance(parsed, list) and len(parsed) > 0 and "task" in parsed[0]:
                    last_schedule_tasks = [item.get("task", "") for item in parsed[:4]]
                    break
            except Exception:
                pass

    # Build human message context
    context_lines: list[str] = []
    for m in messages[-6:]:
        if hasattr(m, "type") and m.type == "human":
            context_lines.append(m.content[:100])
    context_summary = ". ".join(context_lines[-2:]) if context_lines else "No previous context"

    from app.agent.tools import _llm
    from app.agent.prompts import MORNING_BRIEF_PROMPT

    prompt = MORNING_BRIEF_PROMPT.format(
        user_prefs=json.dumps(prefs),
        experience_level=prefs.get("experience_level", prefs.get("role", "developer")),
        current_time=time_str,
        day_of_week=day_str,
        context_summary=context_summary,
        last_schedule=", ".join(last_schedule_tasks) if last_schedule_tasks else "No previous schedule",
    )

    try:
        response = _llm.invoke(prompt)
        content = response.content
        idx = content.find('{"suggest_planning"')
        display_text = content[:idx].strip() if idx != -1 else content.strip()
        return {
            "brief": display_text,
            "time": time_str,
            "day": day_str,
            "needs_onboarding": not is_onboarded,
            "user_prefs": prefs,
        }
    except Exception:
        error_id = uuid.uuid4().hex[:8]
        logger.exception("brief error [%s]", error_id)
        raise HTTPException(status_code=500, detail=f"Internal error (ref: {error_id})")


# ── Productivity score ────────────────────────────────────────────────────────

@router.post("/score/{thread_id}")
async def get_productivity_score(thread_id: str, request: Request):
    """Calculate a productivity score based on completed tasks and conversation."""
    body = await request.json()
    completed = body.get("completed_tasks", [])
    total = body.get("total_tasks", 0)

    time_str = datetime.now().strftime("%I:%M %p")
    try:
        state = await get_state(thread_id)
        messages = state.get("messages", [])
    except Exception:
        messages = []
    summary = f"{len(messages)} messages exchanged"

    from app.agent.tools import _llm
    from app.agent.prompts import PRODUCTIVITY_SCORE_PROMPT

    prompt = PRODUCTIVITY_SCORE_PROMPT.format(
        conversation_summary=summary,
        completed_tasks=json.dumps(completed),
        total_tasks=total,
        time_of_day=time_str,
    )

    try:
        response = _llm.invoke(prompt)
        result = json.loads(response.content.strip())
        return result
    except Exception:
        logger.warning("Productivity score fallback triggered")
        return {"score": 50, "grade": "B", "insight": "Keep going, you're making progress!", "trend": "steady"}


# ── Conflict detector ─────────────────────────────────────────────────────────

@router.post("/conflicts/{thread_id}")
async def check_conflicts(thread_id: str, request: Request):
    """Analyze the schedule for conflicts and overload."""
    body = await request.json()
    schedule = body.get("schedule", [])

    if not schedule:
        return {"warnings": []}

    try:
        state = await get_state(thread_id)
        user_prefs = json.dumps(state.get("user_prefs", {}))
    except Exception:
        user_prefs = "{}"

    from app.agent.tools import _llm
    from app.agent.prompts import CONFLICT_DETECTOR_PROMPT

    prompt = CONFLICT_DETECTOR_PROMPT.format(
        schedule=json.dumps(schedule),
        user_prefs=user_prefs,
    )

    try:
        response = _llm.invoke(prompt)
        warnings = json.loads(response.content.strip())
        return {"warnings": warnings if isinstance(warnings, list) else []}
    except Exception:
        logger.warning("Conflict detection fallback triggered")
        return {"warnings": []}
