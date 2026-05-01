"""Helpers around the Supabase Storage 'artwork' bucket.

Two flows:

* **Direct browser upload** — the client uploads via supabase-js using the
  user's JWT; RLS on storage.objects guarantees they can only write inside
  their own ``{user_id}/...`` folder. After the upload completes, the
  client POSTs ``/uploads/artwork`` to register the file in the
  ``artwork_uploads`` table.

* **Server signed URL** (rare; admin tools) — ``signed_download_url`` lets
  an authorised actor (e.g. the blanks_fulfillment node, when emailing
  printers) hand out a time-limited URL without exposing service-role keys.

We keep this module small on purpose: nothing here calls out unless an
operation actually needs Supabase. That keeps ``import api.storage``
working in environments without supabase-py installed.
"""
from __future__ import annotations

import os
from typing import Any
from uuid import uuid4

from api.db import service_client


BUCKET = "artwork"
DEFAULT_DOWNLOAD_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


def make_storage_path(user_id: str, artwork_id: str, filename: str) -> str:
    """Storage path convention: ``{user_id}/{artwork_id}/{safe_filename}``.

    Storage RLS keys off the first path segment, so the user_id MUST be the
    leading segment. We sanitise the filename to avoid path-traversal.
    """
    safe = filename.rsplit("/", 1)[-1].replace("\\", "_").replace("..", "_")
    return f"{user_id}/{artwork_id}/{safe}"


def new_artwork_id() -> str:
    return str(uuid4())


def signed_download_url(file_path: str, ttl_seconds: int = DEFAULT_DOWNLOAD_TTL_SECONDS) -> str:
    """Service-role-signed URL used by agents (e.g. when emailing printers)."""
    client = service_client()
    res = client.storage.from_(BUCKET).create_signed_url(file_path, ttl_seconds)
    # supabase-py returns either {"signedURL": ...} or {"signedUrl": ...} depending on version.
    return res.get("signedURL") or res.get("signedUrl") or ""


def remove_object(file_path: str) -> None:
    """Hard-delete an object. Admin/cleanup only."""
    client = service_client()
    client.storage.from_(BUCKET).remove([file_path])


def public_metadata_for(client: Any, file_path: str) -> dict[str, Any] | None:
    """Best-effort metadata lookup for an uploaded object."""
    try:
        info = client.storage.from_(BUCKET).list(
            path=file_path.rsplit("/", 1)[0],
            options={"search": file_path.rsplit("/", 1)[-1]},
        )
        return (info or [None])[0]
    except Exception:
        return None
