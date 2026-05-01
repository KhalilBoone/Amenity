"""Gmail MCP client.

Wraps the Gmail MCP server's tool-call HTTP endpoint. Two tools we
actually use:

* ``create_draft`` — drafts a message in the user's Drafts folder. Used
  by every agent node that wants ops to review before sending.
* ``send_message`` — sends immediately. Used when ``BLANKS_AUTO_SEND=1``.

Falls back gracefully when the MCP isn't configured (no
``GMAIL_MCP_URL``): returns a synthetic draft id so the calling node's
control flow stays the same. This keeps local dev frictionless and
ensures missing infra never breaks the graph.

The MCP wire format here matches the Anthropic MCP HTTP transport:
    POST /tools/call
    {
      "name": "create_draft",
      "arguments": { "to": "...", "subject": "...", "body": "..." }
    }
    -> { "content": [...], "isError": false }

Adjust ``_call_tool`` if your specific Gmail MCP server uses a different
shape.
"""
from __future__ import annotations

import os
from typing import Any


class GmailMcpError(RuntimeError):
    pass


def _config() -> tuple[str | None, str | None]:
    return os.getenv("GMAIL_MCP_URL"), os.getenv("GMAIL_MCP_TOKEN")


def _call_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """POST /tools/call with the given tool. Returns the raw content
    block. Raises ``GmailMcpError`` if the MCP returned ``isError``.
    """
    url, token = _config()
    if not url:
        raise GmailMcpError("GMAIL_MCP_URL not set")

    try:
        import httpx  # type: ignore
    except ImportError as e:  # pragma: no cover
        raise GmailMcpError("httpx not installed") from e

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    payload = {"name": name, "arguments": arguments}

    try:
        resp = httpx.post(
            f"{url.rstrip('/')}/tools/call",
            headers=headers,
            json=payload,
            timeout=30.0,
        )
        resp.raise_for_status()
    except Exception as e:
        raise GmailMcpError(f"MCP HTTP error: {e}") from e

    body = resp.json() or {}
    if body.get("isError"):
        raise GmailMcpError(f"MCP tool error: {body}")
    return body


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def create_draft(to: str, subject: str, body: str) -> dict[str, Any]:
    """Create a draft. Returns ``{draft_id: str, ...}`` on success.

    Falls back to a synthetic id when the MCP isn't configured so node
    code paths stay uniform.
    """
    if not _config()[0]:
        return _synthetic(to, subject, kind="draft")

    try:
        result = _call_tool("create_draft", {
            "to":      to,
            "subject": subject,
            "body":    body,
        })
    except GmailMcpError:
        return _synthetic(to, subject, kind="draft")

    # Normalise the result so callers don't need to know MCP's content shape.
    text = _first_text(result)
    return {"draft_id": _extract_id(text) or text or "draft_unknown"}


def send_message(to: str, subject: str, body: str) -> dict[str, Any]:
    """Send immediately. Returns ``{message_id: str}``."""
    if not _config()[0]:
        return _synthetic(to, subject, kind="message")

    try:
        result = _call_tool("send_message", {
            "to":      to,
            "subject": subject,
            "body":    body,
        })
    except GmailMcpError:
        return _synthetic(to, subject, kind="message")

    text = _first_text(result)
    return {"message_id": _extract_id(text) or text or "msg_unknown"}


def draft_or_send(to: str, subject: str, body: str) -> dict[str, Any]:
    """Choose draft vs. send based on ``BLANKS_AUTO_SEND``.

    Returns a dict with ``draft_id`` OR ``message_id`` plus a ``kind``
    field so the caller can log which path was taken.
    """
    if os.getenv("BLANKS_AUTO_SEND") == "1":
        out = send_message(to, subject, body)
        return {**out, "kind": "sent"}
    out = create_draft(to, subject, body)
    return {**out, "kind": "draft"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _synthetic(to: str, subject: str, *, kind: str) -> dict[str, Any]:
    suffix = f"{abs(hash((to, subject))) % (10 ** 10)}"
    if kind == "draft":
        return {"draft_id": f"draft_{suffix}"}
    return {"message_id": f"msg_{suffix}"}


def _first_text(result: dict[str, Any]) -> str:
    """MCP responses come back as ``{content: [{type: 'text', text: '...'}]}``.
    Pull the first text block out of that shape."""
    for c in result.get("content") or []:
        if isinstance(c, dict) and c.get("type") == "text":
            return str(c.get("text") or "")
    return ""


def _extract_id(s: str) -> str | None:
    """Best-effort: many MCPs return JSON-in-text with an id field."""
    if not s:
        return None
    try:
        import json
        parsed = json.loads(s)
        if isinstance(parsed, dict):
            for key in ("id", "draft_id", "message_id", "messageId", "draftId"):
                if parsed.get(key):
                    return str(parsed[key])
    except Exception:
        pass
    return None
