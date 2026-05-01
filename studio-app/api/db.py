"""Supabase client factory.

Two clients are exposed:

* ``service_client()`` — uses ``SUPABASE_SERVICE_ROLE_KEY``. Bypasses RLS.
  Used by webhooks (Stripe, SAM.gov) and by the agent graph, both of which
  act on behalf of "the system" rather than a specific user.

* ``user_client(jwt)`` — uses the anon key but forwards a user JWT in the
  ``Authorization`` header so RLS policies see ``auth.uid()`` correctly.
  Used by every authenticated route in ``api/main.py``.

We import ``supabase`` lazily so the module still imports in environments
where the SDK isn't installed (CI smoke tests, py_compile, etc.).
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:  # pragma: no cover
    from supabase import Client


class SupabaseConfigError(RuntimeError):
    """Raised when required env vars are missing."""


def _require(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise SupabaseConfigError(
            f"{name} is not set. Copy .env.example → .env and fill it in."
        )
    return val


def _create(url: str, key: str, jwt: str | None = None) -> "Client":
    """Build a Supabase client; attach a user JWT if provided."""
    try:
        from supabase import create_client
    except ImportError as e:  # pragma: no cover
        raise SupabaseConfigError(
            "supabase-py is not installed. `pip install supabase`."
        ) from e

    client = create_client(url, key)
    if jwt:
        # postgrest-py forwards this header to PostgREST so RLS sees auth.uid().
        client.postgrest.auth(jwt)
    return client


@lru_cache(maxsize=1)
def service_client() -> "Client":
    """Memoised service-role client. Use sparingly — bypasses RLS."""
    url = _require("SUPABASE_URL")
    key = _require("SUPABASE_SERVICE_ROLE_KEY")
    return _create(url, key)


def user_client(jwt: str) -> "Client":
    """Per-request anon client carrying the user's JWT (RLS-respecting).

    Not memoised: every request gets its own client so JWTs don't leak
    across users.
    """
    url = _require("SUPABASE_URL")
    key = _require("SUPABASE_ANON_KEY")
    return _create(url, key, jwt=jwt)


# ----------------------------------------------------------------------
# Convenience: small helpers used by routes/agents
# ----------------------------------------------------------------------
def fetch_one(client: "Client", table: str, **filters: Any) -> dict[str, Any] | None:
    """Single-row fetch. Returns ``None`` if no row matches."""
    q = client.table(table).select("*")
    for k, v in filters.items():
        q = q.eq(k, v)
    res = q.limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None
