"""api/sourcing.py

Liai sourcing-agent API routes.

  POST /sourcing/chat
    Accepts a plain-text sourcing brief plus optional conversation history.
    1. Embeds the latest user message with text-embedding-3-small.
    2. Calls match_manufacturers RPC to get semantically similar partners.
    3. Streams a Claude response that synthesises and ranks the matches.

Response format: newline-delimited JSON (ndjson) stream.
  {"type": "matches", "data": [...]}   — sent first, before text tokens
  {"type": "token",   "data": "..."}   — one per streamed text chunk
  {"type": "done"}                     — terminal frame

The frontend reads this stream and renders the manufacturer cards
immediately (from "matches") while the prose explanation streams in.
"""
from __future__ import annotations

import json
import os
from typing import Any, Generator

try:
    from fastapi import APIRouter, Depends, HTTPException
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel, Field
except ImportError:  # pragma: no cover
    APIRouter = None   # type: ignore
    StreamingResponse = None  # type: ignore
    class BaseModel:   # type: ignore
        pass
    def Field(*a, **kw):  # type: ignore
        return None
    def Depends(x):    # type: ignore
        return x

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # type: ignore

try:
    import anthropic as _anthropic
except ImportError:
    _anthropic = None  # type: ignore

from api.auth import CurrentUser, optional_user
from api.db import service_client

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMS  = 1536
CLAUDE_MODEL    = "claude-sonnet-4-6"
MATCH_COUNT     = 10       # candidates fetched from vector search
RETURN_COUNT    = 5        # top N cards shown to the user
MIN_SIMILARITY  = 0.35     # cosine similarity floor

SYSTEM_PROMPT = """You are Liai, an expert sourcing agent for product-based businesses.
You help brands find the right manufacturers, mills, suppliers, and decorators.

You have already performed a semantic search and retrieved the most relevant
manufacturers from the network. They are provided below as JSON.

Your job:
1. Briefly acknowledge the user's brief in 1–2 sentences.
2. Explain why the top matches are a good fit — capability alignment, relevant
   certifications, suitable MOQ, or geographic fit. Be specific.
3. If the brief is ambiguous (e.g. missing quantity, certification, timeline),
   ask ONE targeted follow-up question to sharpen the next search.
4. Keep your tone direct, informed, and concise. No fluff or filler phrases.
5. Never fabricate manufacturer details. Only reference what is in the JSON.
6. Do not mention vector search, embeddings, or AI mechanics.

Format: plain prose. No markdown headers or bullet lists — the UI renders
the manufacturer cards separately; your text is the narrative that connects them."""


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class HistoryMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class SourcingChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[HistoryMessage] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _openai_client() -> Any:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")
    if OpenAI is None:
        raise HTTPException(status_code=503, detail="openai package not installed")
    return OpenAI(api_key=key)


def _anthropic_client() -> Any:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")
    if _anthropic is None:
        raise HTTPException(status_code=503, detail="anthropic package not installed")
    return _anthropic.Anthropic(api_key=key)


def _embed(text: str) -> list[float]:
    oai = _openai_client()
    resp = oai.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMS,
    )
    return resp.data[0].embedding


def _match_manufacturers(embedding: list[float]) -> list[dict[str, Any]]:
    """Call the match_manufacturers RPC and return the top results."""
    db = service_client()
    result = db.rpc(
        "match_manufacturers",
        {
            "query_embedding": embedding,
            "match_count": MATCH_COUNT,
            "min_similarity": MIN_SIMILARITY,
        },
    ).execute()
    rows = result.data or []
    # Return only the top RETURN_COUNT and strip the embedding field if present
    return [
        {k: v for k, v in r.items() if k != "embedding"}
        for r in rows[:RETURN_COUNT]
    ]


def _format_matches_for_claude(matches: list[dict[str, Any]]) -> str:
    """Serialise the match list into a compact JSON string for the system context."""
    slim = []
    for m in matches:
        slim.append({
            "name": m.get("name"),
            "role": m.get("role"),
            "category": m.get("category"),
            "specialty": m.get("specialty"),
            "capabilities": m.get("capabilities") or [],
            "certifications": m.get("certifications") or [],
            "moq": m.get("moq"),
            "lead_time_weeks": m.get("lead_time_weeks"),
            "location": m.get("location"),
            "domestic": m.get("domestic"),
            "similarity_pct": round((m.get("similarity") or 0) * 100),
        })
    return json.dumps(slim, indent=2)


def _stream_response(
    request: SourcingChatRequest,
    matches: list[dict[str, Any]],
) -> Generator[str, None, None]:
    """Yield ndjson frames: matches first, then streamed text tokens, then done."""

    # 1. Emit the manufacturer cards immediately
    yield json.dumps({"type": "matches", "data": matches}) + "\n"

    # 2. Build the Claude messages
    context_block = (
        f"Manufacturer matches retrieved for this brief:\n\n"
        f"{_format_matches_for_claude(matches)}"
    )

    messages: list[dict[str, str]] = []
    for h in request.history[-8:]:  # last 8 turns of context
        messages.append({"role": h.role, "content": h.content})

    # Append the current user message with the match context injected
    messages.append({
        "role": "user",
        "content": f"{request.message}\n\n---\n{context_block}",
    })

    # 3. Stream Claude
    client = _anthropic_client()
    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=600,
        system=SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield json.dumps({"type": "token", "data": text}) + "\n"

    yield json.dumps({"type": "done"}) + "\n"


# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/sourcing", tags=["sourcing"])


@router.post("/chat")
def sourcing_chat(
    body: SourcingChatRequest,
    user: CurrentUser | None = Depends(optional_user),
) -> StreamingResponse:
    """Embed the brief, retrieve manufacturer matches, stream Claude's analysis."""

    # Embed
    try:
        embedding = _embed(body.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Embedding error: {e}")

    # Vector search
    try:
        matches = _match_manufacturers(embedding)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Match error: {e}")

    return StreamingResponse(
        _stream_response(body, matches),
        media_type="application/x-ndjson",
    )
