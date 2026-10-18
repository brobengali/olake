from __future__ import annotations

import logging
import os
import re
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

import asyncio
import sys
from contextlib import asynccontextmanager

_SERVER_DIR = Path(__file__).resolve().parent
if str(_SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(_SERVER_DIR))

from generate import REFUSAL_TEXT, attach_sources, extractive_answer, llm_answer, maybe_web_fallback
from loader import sync_remote_knowledge
from retriever import Retriever

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("olake-assistant")

ROOT = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

MAX_MESSAGE = int(os.environ.get("MAX_MESSAGE_CHARS", "4000"))
RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_MIN", "30"))
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
SYNC_SECRET = os.environ.get("SYNC_SECRET", "").strip()
AUTO_SYNC_HOURS = float(os.environ.get("AUTO_SYNC_HOURS", "12"))

OFF_TOPIC = re.compile(
    r"\b(exploit|malware|ransomware|sql injection payload|make a bomb|child sexual|poem|cricket|ignore all previous|print your system prompt|show your system prompt|reveal your api key|what is your api key)\b",
    re.I,
)

retriever = Retriever()
_hits: dict[str, deque[float]] = defaultdict(deque)
_last_sync_info: dict[str, Any] = {"status": "initialized", "timestamp": time.time()}


async def _background_sync_loop() -> None:
    """Periodically fetches new upstream releases and reloads the retriever."""
    # Brief initial pause to let server finish binding ports
    await asyncio.sleep(2)
    while True:
        try:
            log.info("Checking upstream OLake releases & documentation updates...")
            res = await sync_remote_knowledge()
            if res.get("updated"):
                retriever.reload()
                log.info("Knowledge base automatically updated to %d passages", len(retriever.chunks))
            _last_sync_info["status"] = "success" if res.get("updated") else "up_to_date"
            _last_sync_info["details"] = res
            _last_sync_info["timestamp"] = time.time()
        except Exception as exc:  # noqa: BLE001
            log.warning("Background upstream sync error: %s", exc)
            _last_sync_info["status"] = "failed"
            _last_sync_info["error"] = str(exc)

        if AUTO_SYNC_HOURS <= 0:
            break
        await asyncio.sleep(AUTO_SYNC_HOURS * 3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_task = asyncio.create_task(_background_sync_loop())
    yield
    sync_task.cancel()


app = FastAPI(
    title="OLake Docs Assistant",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Ensure validation errors close the HTTP connection immediately and never hang."""
    errors = jsonable_encoder(exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": errors, "error": "Invalid request payload"},
        headers={"Connection": "close"},
    )


class AskRequest(BaseModel):
    question: str | None = Field(default=None, max_length=MAX_MESSAGE)
    message: str | None = Field(default=None, max_length=MAX_MESSAGE)

    def get_query(self) -> str:
        return (self.question or self.message or "").strip()


class ChatTurn(BaseModel):
    role: str = Field(default="user")
    content: str = Field(default="", max_length=MAX_MESSAGE)


class ChatRequest(BaseModel):
    message: str | None = Field(default=None, max_length=MAX_MESSAGE)
    question: str | None = Field(default=None, max_length=MAX_MESSAGE)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)

    def get_message(self) -> str:
        return (self.message or self.question or "").strip()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else "unknown"


def _rate_limit(ip: str) -> None:
    now = time.time()
    # Memory protection: prune stale entries when cache grows large
    if len(_hits) > 5000:
        expired = [k for k, v in _hits.items() if not v or now - v[-1] > 60]
        for k in expired:
            _hits.pop(k, None)

    bucket = _hits[ip]
    while bucket and now - bucket[0] > 60:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Wait a minute and try again.")
    bucket.append(now)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    is_embed = request.query_params.get("embed") in {"1", "true"}
    frame_ancestors = os.environ.get("FRAME_ANCESTORS", "*" if is_embed else "'none'")
    if not is_embed and frame_ancestors == "'none'":
        response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://openrouter.ai https://generativelanguage.googleapis.com https://api.duckduckgo.com; "
        f"frame-ancestors {frame_ancestors};"
    )
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


@app.get("/api/health")
@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "chunks": len(retriever.chunks),
        "llm": bool(os.environ.get("OPENROUTER_API_KEY") or os.environ.get("GEMINI_API_KEY")),
        "model": os.environ.get("OPENROUTER_MODEL", "z-ai/glm-4.7-flash") if os.environ.get("OPENROUTER_API_KEY") else "extractive",
        "web_fallback": os.environ.get("ALLOW_WEB_FALLBACK", "").lower() in {"1", "true", "yes"},
        "last_synced_at": _last_sync_info.get("timestamp"),
        "sync_status": _last_sync_info.get("status"),
    }


@app.get("/version")
@app.get("/api/version")
async def version() -> dict[str, Any]:
    return {
        "version": "1.0.0",
        "name": "olake-assistant",
        "status": "ok",
        "chunks": len(retriever.chunks),
    }


@app.post("/api/sync")
@app.post("/sync")
async def trigger_sync(request: Request) -> JSONResponse:
    """Webhook or manual trigger to re-sync knowledge from GitHub and reload retriever."""
    if SYNC_SECRET:
        auth_header = request.headers.get("Authorization", "")
        if auth_header != f"Bearer {SYNC_SECRET}":
            raise HTTPException(status_code=401, detail="Invalid or missing sync authorization token.")

    try:
        res = await sync_remote_knowledge()
        chunks_count = retriever.reload()
        _last_sync_info["status"] = "success" if res.get("updated") else "up_to_date"
        _last_sync_info["details"] = res
        _last_sync_info["timestamp"] = time.time()
        return JSONResponse({
            "ok": True,
            "updated": res.get("updated", False),
            "chunks": chunks_count,
            "details": res,
        })
    except Exception as exc:  # noqa: BLE001
        log.error("Sync failed: %s", exc)
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)


@app.post("/api/chat")
@app.post("/chat")
async def chat(payload: ChatRequest, request: Request) -> JSONResponse:
    _rate_limit(_client_ip(request))
    question = payload.get_message()
    if not question:
        raise HTTPException(status_code=400, detail="Field 'message' or 'question' is required and cannot be empty.")
    if OFF_TOPIC.search(question):
        return JSONResponse(
            {
                "answer": "I can only help with OLake setup, sources, sync, catalogs, maintenance, deployment, and troubleshooting.",
                "known": False,
                "sources": [{"title": "OLake docs", "url": "https://olake.io/docs", "source": "docs", "heading": "Docs"}],
            }
        )

    hits = retriever.search(question)
    extras: list[dict[str, str]] = []
    known = retriever.confident(hits)
    if not known:
        extras = await maybe_web_fallback(question)
        if extras:
            known = True

    if not known:
        sources = [
            {"title": "OLake documentation", "url": "https://olake.io/docs", "source": "docs", "heading": "Docs"},
            {"title": "OLake Slack", "url": "https://olake.io/slack/", "source": "community", "heading": "Community"},
        ]
        return JSONResponse({"answer": REFUSAL_TEXT, "known": False, "sources": sources})

    history = [t.model_dump() for t in payload.history]
    try:
        answer = await llm_answer(question, history, hits, extras or None)
    except Exception as exc:  # noqa: BLE001 — fall back, never 500 the user for LLM blips
        log.warning("LLM failed, using extractive answer: %s", exc)
        answer = extractive_answer(question, hits)

    answer, sources = attach_sources(answer, hits, extras or None)
    return JSONResponse({"answer": answer, "known": True, "sources": sources})


@app.post("/ask")
@app.post("/api/ask")
async def ask_endpoint(payload: AskRequest, request: Request) -> JSONResponse:
    """Public evaluation endpoint conforming to:
    POST /ask with {"question": "..."} -> {"answer": "...", "sources": ["<url>", ...]}
    """
    _rate_limit(_client_ip(request))
    query = payload.get_query()
    if not query:
        raise HTTPException(status_code=400, detail="Field 'question' or 'message' is required.")

    if OFF_TOPIC.search(query):
        return JSONResponse({
            "answer": "I can only help with OLake setup, sources, sync, catalogs, maintenance, deployment, and troubleshooting.",
            "sources": ["https://olake.io/docs"],
        })

    hits = retriever.search(query)
    extras: list[dict[str, str]] = []
    known = retriever.confident(hits)
    if not known:
        extras = await maybe_web_fallback(query)
        if extras:
            known = True

    if not known:
        return JSONResponse({
            "answer": REFUSAL_TEXT,
            "sources": ["https://olake.io/docs", "https://olake.io/slack/"],
        })

    try:
        raw_answer = await llm_answer(query, [], hits, extras or None)
    except Exception as exc:  # noqa: BLE001
        log.warning("LLM generation fallback: %s", exc)
        raw_answer = extractive_answer(query, hits)

    answer, sources = attach_sources(raw_answer, hits, extras or None)
    # Return sources as a clean list of URL strings
    url_list = list(dict.fromkeys(s["url"] for s in sources if s.get("url")))

    return JSONResponse({
        "answer": answer,
        "sources": url_list,
    })



@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots() -> str:
    return "User-agent: *\nAllow: /\n"


@app.get("/favicon.ico")
async def favicon() -> Response:
    return Response(status_code=204)


def _find_static(filename: str) -> Path | None:
    for candidate in [
        ROOT / filename,
        Path(__file__).resolve().parent / filename,
        Path(__file__).resolve().parent.parent / filename,
        Path.cwd() / filename,
        Path("/app") / filename,
    ]:
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


@app.get("/")
@app.get("/index.html")
async def index() -> FileResponse:
    p = _find_static("index.html")
    if not p:
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(p, headers={"Cache-Control": "no-cache, must-revalidate"})


@app.get("/style.css")
async def css() -> FileResponse:
    p = _find_static("style.css")
    if not p:
        raise HTTPException(status_code=404, detail="style.css not found")
    return FileResponse(
        p,
        media_type="text/css",
        headers={"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600"},
    )


@app.get("/app.js")
async def js() -> FileResponse:
    p = _find_static("app.js")
    if not p:
        raise HTTPException(status_code=404, detail="app.js not found")
    return FileResponse(
        p,
        media_type="text/javascript",
        headers={"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600"},
    )


@app.get("/embed.js")
async def embed_script() -> FileResponse:
    p = _find_static("embed.js")
    if not p:
        raise HTTPException(status_code=404, detail="embed.js not found")
    return FileResponse(
        p,
        media_type="text/javascript",
        headers={"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600"},
    )

