import json as _json_std
import os
from dotenv import load_dotenv
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
import langgraph.checkpoint.sqlite.aio as _sqlite_aio_module

from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import estimate_and_plan, get_growth_tasks, reschedule_day, update_memory, generate_morning_brief, generate_subtasks

# ── Compatibility patch ───────────────────────────────────────────────────────
# LangGraph 0.2.38 was written for langchain-core 0.2.x which had JSON-serialisable
# message objects. langchain-core 0.3.x messages are Pydantic v2 models that require
# .model_dump(). We shadow the `json` name inside the sqlite checkpoint module so its
# json.dumps() calls use a safe encoder that handles these objects transparently.

class _LangChainEncoder(_json_std.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        if hasattr(obj, "dict"):
            return obj.dict()
        try:
            return str(obj)
        except Exception:
            return None


class _PatchedJson:
    """Thin proxy around the json module that injects _LangChainEncoder by default."""
    def dumps(self, obj, **kwargs):
        kwargs.setdefault("cls", _LangChainEncoder)
        return _json_std.dumps(obj, **kwargs)

    def __getattr__(self, name):
        return getattr(_json_std, name)


_sqlite_aio_module.json = _PatchedJson()
# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

DB_PATH = os.getenv("SQLITE_DB_PATH", "./autopilot_memory.db")

try:
    from langchain_anthropic import ChatAnthropic
    _anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not _anthropic_key:
        raise ValueError("ANTHROPIC_API_KEY not set")
    llm = ChatAnthropic(
        model="claude-3-5-sonnet-20241022",
        temperature=0.5,
        api_key=_anthropic_key,
    )
except (ImportError, ValueError):
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(
        model="gpt-3.5-turbo",
        temperature=0.5,
        max_tokens=2048,
        api_key=os.getenv("OPENAI_API_KEY"),
    )

tools = [estimate_and_plan, get_growth_tasks, reschedule_day, update_memory, generate_morning_brief, generate_subtasks]

_checkpointer_cm = None   # keeps the context manager alive so the DB connection stays open
_checkpointer = None      # the actual AsyncSqliteSaver instance
_agent = None


async def get_checkpointer() -> AsyncSqliteSaver:
    global _checkpointer_cm, _checkpointer
    if _checkpointer is None:
        _checkpointer_cm = AsyncSqliteSaver.from_conn_string(DB_PATH)
        # __aenter__ returns the real saver; _checkpointer_cm keeps the CM alive
        _checkpointer = await _checkpointer_cm.__aenter__()
    return _checkpointer


async def get_agent():
    global _agent
    if _agent is None:
        checkpointer = await get_checkpointer()
        _agent = create_react_agent(
            model=llm,
            tools=tools,
            checkpointer=checkpointer,
            messages_modifier=SYSTEM_PROMPT,
        )
    return _agent


async def invoke_agent(message: str, thread_id: str) -> dict:
    agent = await get_agent()
    config = {"configurable": {"thread_id": thread_id}}
    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": message}]},
        config=config,
    )
    return result


async def stream_agent_events(message: str, thread_id: str):
    agent = await get_agent()
    config = {"configurable": {"thread_id": thread_id}}
    async for event in agent.astream_events(
        {"messages": [{"role": "user", "content": message}]},
        config=config,
        version="v2",
    ):
        yield event


async def get_state(thread_id: str) -> dict:
    agent = await get_agent()
    config = {"configurable": {"thread_id": thread_id}}
    state = await agent.aget_state(config)
    return state.values if state and state.values else {}


async def get_full_history(thread_id: str) -> list:
    agent = await get_agent()
    config = {"configurable": {"thread_id": thread_id}}
    history = []
    async for state in agent.aget_state_history(config):
        history.append(state)
    return history


async def delete_thread(thread_id: str) -> bool:
    """Delete all checkpoints for a thread from SQLite."""
    try:
        checkpointer = await get_checkpointer()
        # Use the built-in async delete method (tables: checkpoints + writes)
        await checkpointer.adelete_thread(thread_id)
        return True
    except Exception as e:
        print(f"Error deleting thread {thread_id}: {e}")
        return False


async def get_thread_summary(thread_id: str) -> dict:
    """Return a lightweight summary of a thread's history."""
    try:
        import json as _json
        state = await get_state(thread_id)
        messages = state.get("messages", [])
        human_count = sum(1 for m in messages if hasattr(m, "type") and m.type == "human")
        schedule_preview = None
        for m in reversed(messages):
            if hasattr(m, "type") and m.type == "tool":
                try:
                    parsed = _json.loads(m.content)
                    if isinstance(parsed, list) and len(parsed) > 0 and "task" in parsed[0]:
                        schedule_preview = [item.get("task", "") for item in parsed[:3]]
                        break
                except Exception:
                    pass
        return {
            "thread_id": thread_id,
            "message_count": human_count,
            "last_schedule_preview": schedule_preview,
            "has_history": human_count > 0,
        }
    except Exception:
        return {"thread_id": thread_id, "message_count": 0, "last_schedule_preview": None, "has_history": False}


async def list_threads() -> list[str]:
    checkpointer = await get_checkpointer()
    threads: set[str] = set()
    async for item in checkpointer.alist({}):
        thread_id = item.config.get("configurable", {}).get("thread_id")
        if thread_id:
            threads.add(thread_id)
    return list(threads)
