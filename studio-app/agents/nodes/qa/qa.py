"""QA node — check inspection state and gate the graph forward.

The node is invoked twice in the order's lifecycle:

1. **First entry from fulfillment** — there's no QA data yet. We seed
   the checkpoint plan into ``orders.qa_results`` so ops sees a list of
   to-do items in the dashboard. Status stays at ``qa`` (pending).

2. **Re-entry after ops marks a checkpoint** — the
   ``/orders/{id}/qa-checkpoint`` endpoint updates the JSON and
   re-invokes this node. We read the current state and decide:

   * All required checkpoints passed → ``qa_passed=True``,
     ``status='comms'`` (advance).
   * Any checkpoint failed → ``qa_passed=False``,
     ``status='fulfillment'`` (loop back for rework).
   * Otherwise still pending → ``status='qa'`` (wait).

This makes the graph a state machine that's safe to re-fire on every
checkpoint update.
"""
from __future__ import annotations

from typing import Any

from agents.runlog import run_logged
from agents.state import AgentState
from api.db import service_client


# Required checkpoints — every item here must have ``passed=True`` for
# the order to advance. ``Photo QA`` is treated as required so we don't
# skip the visual sign-off.
DEFAULT_PLAN: list[dict[str, Any]] = [
    {"name": "Pre-production sample",    "stage": "pp",       "passed": None, "required": True},
    {"name": "First-article inspection", "stage": "fai",      "passed": None, "required": True},
    {"name": "Inline 50%",               "stage": "inline",   "passed": None, "required": True},
    {"name": "Final + AQL sample",       "stage": "final",    "passed": None, "required": True},
    {"name": "Photo QA",                 "stage": "photo_qa", "passed": None, "required": True},
]


def _evaluate(checkpoints: list[dict[str, Any]]) -> tuple[bool | None, list[str]]:
    """Return (qa_passed, blocking_reasons).

    ``qa_passed=None`` means still pending. ``True`` means advance.
    ``False`` means at least one required checkpoint failed.
    """
    failed: list[str] = []
    pending: list[str] = []
    for c in checkpoints:
        if not c.get("required", True):
            continue
        passed = c.get("passed")
        if passed is False:
            failed.append(c.get("name") or c.get("stage") or "?")
        elif passed is None:
            pending.append(c.get("name") or c.get("stage") or "?")

    if failed:
        return False, [f"failed: {n}" for n in failed]
    if pending:
        return None, [f"pending: {n}" for n in pending]
    return True, []


@run_logged("qa")
def qa_node(state: AgentState) -> AgentState:
    order_id = state.get("order_id")
    db = service_client()

    # Pull the current persisted state.
    existing: dict[str, Any] = {}
    if order_id:
        rows = (
            db.table("orders")
            .select("qa_results, qa_passed")
            .eq("id", order_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if rows:
            existing = rows[0].get("qa_results") or {}

    checkpoints = list(existing.get("checkpoints") or [])
    if not checkpoints:
        # First entry — seed the plan, don't advance yet.
        checkpoints = [dict(c) for c in DEFAULT_PLAN]

    qa_passed_raw, reasons = _evaluate(checkpoints)
    if qa_passed_raw is True:
        next_status = "comms"
        qa_passed = True
    elif qa_passed_raw is False:
        next_status = "fulfillment"
        qa_passed = False
    else:
        # Pending: stay at qa.
        next_status = "qa"
        qa_passed = False   # not pass-through-yet; the conditional edge in
                            # graph.py treats False as 'fail' and will loop.
                            # When evaluating from the pending state we
                            # rely on callers to NOT re-invoke until
                            # checkpoint data arrives via the API.

    results = {
        **existing,
        "checkpoints":     checkpoints,
        "blocking_reasons": reasons,
        "defect_rate":     existing.get("defect_rate"),
        "photos_received": bool(existing.get("photos_received") or False),
    }

    if order_id:
        try:
            db.table("orders").update(
                {
                    "qa_results": results,
                    "qa_passed":  qa_passed if qa_passed_raw is not None else None,
                    "status":     next_status,
                }
            ).eq("id", order_id).execute()
        except Exception:
            pass

    return {
        **state,
        "qa_results": results,
        "qa_passed":  qa_passed,
        "status":     next_status,  # type: ignore[typeddict-item]
    }
