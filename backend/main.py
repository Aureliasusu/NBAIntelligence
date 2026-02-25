"""
FastAPI backend for the AI Assistant: configurable agent with LLM + tools.
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional

from agent import DEFAULT_SYSTEM_PROMPT, chat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _make_json_serializable(obj):
    """Convert numpy/types to native Python so JSON encoding never fails."""
    import numpy as np
    if isinstance(obj, dict):
        return {k: _make_json_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_make_json_serializable(v) for v in obj]
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.str_, np.bytes_)):
        return str(obj)
    return obj


# Load .env from backend/ or project root (so OPENAI_API_KEY is available)
_backend_dir = Path(__file__).resolve().parent
if (_backend_dir / ".env").exists():
    load_dotenv(_backend_dir / ".env", override=False)
if (_backend_dir.parent / ".env").exists():
    load_dotenv(_backend_dir.parent / ".env", override=False)

app = FastAPI(title="NBA Intelligence AI Assistant", version="0.1.0")


@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    """Ensure every unhandled exception returns JSON with the real error message."""
    logger.exception("Unhandled exception in %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict] = Field(..., description="Conversation history: [{ role, content }]")
    system_prompt: Optional[str] = Field(None, description="Override default system prompt")
    model: str = Field("gpt-4o-mini", description="OpenAI model name")
    api_key: Optional[str] = Field(None, description="OpenAI API key (or set OPENAI_API_KEY env)")


class ChatResponse(BaseModel):
    last_content: str = Field(..., description="Final assistant reply text")
    tool_results: list[dict] = Field(default_factory=list, description="Tables and/or plotly figures from tools")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def api_chat(req: ChatRequest) -> ChatResponse:
    """Run the agent on the conversation and return the final reply plus any tool results (tables, plots)."""
    try:
        # Normalize messages to { role, content }
        messages = []
        for m in req.messages:
            role = m.get("role")
            content = m.get("content") or m.get("text") or ""
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content})
        if not messages:
            raise HTTPException(status_code=400, detail="At least one message required")

        result = chat(
            messages=messages,
            api_key=req.api_key or os.environ.get("OPENAI_API_KEY"),
            model=req.model,
            system_prompt=req.system_prompt or DEFAULT_SYSTEM_PROMPT,
            max_tool_rounds=3,
        )
        tool_results = _make_json_serializable(result.get("tool_results", []))
        last_content = result.get("last_content") or ""
        if not isinstance(last_content, str):
            last_content = str(last_content)
        return ChatResponse(last_content=last_content, tool_results=tool_results)
    except FileNotFoundError as e:
        logger.warning("FileNotFoundError: %s", e)
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        err_msg = getattr(e, "message", None) or str(e)
        logger.exception("Error in /api/chat: %s", err_msg)
        raise HTTPException(status_code=500, detail=err_msg)
