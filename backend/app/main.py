import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.agent.graph import get_agent
    await get_agent()
    print("✅ SQLite checkpointer initialized")
    yield
    print("👋 Shutting down")


app = FastAPI(title="Nexa AI", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health")
def health():
    db_path = os.getenv("SQLITE_DB_PATH", "./autopilot_memory.db")
    return {
        "status": "ok",
        "persistence": "sqlite",
        "db_path": db_path,
        "db_exists": os.path.exists(db_path),
    }
