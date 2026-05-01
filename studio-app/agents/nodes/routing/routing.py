"""Routing node — pick the best manufacturer for a Studio order.

Steps:

1. Pull the manufacturer pool from Supabase. We pre-filter at the DB layer
   to anything that overlaps at least one capability tag with the spec —
   this keeps scoring cheap when the table grows.
2. Run ``scoring.rank`` to produce a ranked list with score + reasons.
3. Persist the top pick + the top 5 candidates to the ``orders`` row so
   the Studio dashboard can show why we picked them.
4. Advance status to ``fulfillment`` (or stay at ``routing`` if no
   qualifying partner exists, which we surface in errors).
"""
from __future__ import annotations

from typing import Any

from agents.router.scoring import rank
from agents.runlog import run_logged
from agents.state import AgentState
from api.db import service_client


@run_logged("routing")
def routing_node(state: AgentState) -> AgentState:
    spec = state.get("spec", {}) or {}
    order_id = state.get("order_id")

    manufacturers = _load_pool(spec)
    ranked = rank(spec, manufacturers)
    top = ranked[0] if ranked else None

    candidates = [
        {
            "id":             c["id"],
            "name":           c.get("name"),
            "score":          round(c.get("score", 0.0), 1),
            "reasons":        c.get("reasons", []),
            "moq":            c.get("moq"),
            "domestic":       c.get("domestic"),
            "lead_time_weeks": c.get("lead_time_weeks"),
        }
        for c in ranked[:5]
    ]

    update: dict[str, Any] = {
        "routing_score":   round(top["score"], 1) if top else None,
        "routing_reasons": {"reasons": top["reasons"]} if top else None,
        "manufacturer_id": top["id"] if top else None,
        "status":          "fulfillment" if top else "routing",
    }
    errors = list(state.get("errors") or [])
    if not top:
        errors.append("routing: no qualifying manufacturer found")

    if order_id:
        try:
            service_client().table("orders").update(update).eq(
                "id", order_id
            ).execute()
        except Exception:
            pass

    return {
        **state,
        "candidates":      candidates,
        "manufacturer_id": top["id"] if top else None,
        "routing_score":   top["score"] if top else None,
        "routing_reasons": top["reasons"] if top else [],
        "status":          "fulfillment" if top else "routing",  # type: ignore[typeddict-item]
        "errors":          errors,
    }


def _load_pool(spec: dict[str, Any]) -> list[dict[str, Any]]:
    """Return manufacturer rows that overlap at least one needed capability.

    Falls back to the full ``role='manufacturer'`` list if no capability
    overlap is given (e.g. the spec is empty). Returns [] if Supabase is
    unreachable.
    """
    needed = list(spec.get("capabilities") or [])
    try:
        db = service_client()
        q = db.table("manufacturers").select("*").eq("role", "manufacturer")
        # postgrest "overlaps" maps to PostgreSQL && for arrays.
        if needed:
            q = q.overlaps("capabilities", needed)
        return q.limit(200).execute().data or []
    except Exception:
        return []
