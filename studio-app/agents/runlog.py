"""Shared helper for the ``agent_runs`` audit table.

Every Studio agent node writes one row per invocation: input snapshot,
output snapshot, error string if any, duration in milliseconds. This
gives us a complete debug trail without scattering ``insert into
agent_runs`` calls across every node.

Usage::

    from agents.runlog import run_logged

    @run_logged("compliance")
    def compliance_node(state: AgentState) -> AgentState:
        ...
"""
from __future__ import annotations

import functools
import time
from typing import Any, Callable

from agents.state import AgentState


def _serializable(obj: Any) -> Any:
    """Best-effort make a state dict JSON-serializable for storage."""
    if isinstance(obj, dict):
        return {k: _serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serializable(x) for x in obj]
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    return str(obj)


def run_logged(node_name: str) -> Callable[..., Any]:
    """Decorator that wraps a node fn with agent_runs logging.

    Falls back silently when Supabase isn't reachable so node logic
    keeps working in unit-test environments.
    """
    def deco(fn: Callable[[AgentState], AgentState]) -> Callable[[AgentState], AgentState]:
        @functools.wraps(fn)
        def wrapper(state: AgentState) -> AgentState:
            t0 = time.monotonic()
            err: str | None = None
            out: AgentState = state
            try:
                out = fn(state)
            except Exception as e:                  # pragma: no cover
                err = f"{type(e).__name__}: {e}"
                raise
            finally:
                _try_persist(node_name, state, out, err, t0)
            return out
        return wrapper
    return deco


def _try_persist(
    node_name: str,
    state_in: AgentState,
    state_out: AgentState,
    err: str | None,
    t0: float,
) -> None:
    """Insert one ``agent_runs`` row. Swallow all errors."""
    try:
        from api.db import service_client
        db = service_client()
        db.table("agent_runs").insert(
            {
                "order_id": state_in.get("order_id"),
                "bid_id":   state_in.get("bid_id"),
                "node":     node_name,
                "input":    _serializable(state_in),
                "output":   _serializable(state_out),
                "error":    err,
                "duration_ms": int((time.monotonic() - t0) * 1000),
            }
        ).execute()
    except Exception:
        # Logging failures must never crash the pipeline.
        pass
