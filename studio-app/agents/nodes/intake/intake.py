"""Intake node — load the persisted order, normalize the spec.

The API (``POST /studio/rfq``) writes the order row before invoking the
graph, so intake's job is to:

1. Read ``state["order_id"]`` (set by the API), pull the order row, and
   hydrate the rest of the agent state from it. This makes downstream
   nodes work even if the caller only passes ``{"order_id": ...}``.
2. Coalesce the RFQ payload (``raw_input``) and the persisted columns
   into a single canonical ``spec`` dict.
3. Advance ``orders.status`` to ``compliance`` so the dashboard reflects
   progress as the graph runs.
"""
from __future__ import annotations

from typing import Any

from agents.runlog import run_logged
from agents.state import AgentState
from api.db import service_client


@run_logged("intake")
def intake_node(state: AgentState) -> AgentState:
    raw = state.get("raw_input", {}) or {}
    order_id = state.get("order_id")

    persisted: dict[str, Any] = {}
    if order_id:
        db = service_client()
        rows = (
            db.table("orders")
            .select("*")
            .eq("id", order_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if rows:
            persisted = rows[0]

    # Persisted columns win over raw_input — the DB is the source of truth
    # once /studio/rfq has run.
    spec = {
        **(persisted.get("spec") or {}),
        # raw_input fields fill any gaps for callers that bypass the API.
        "capabilities":            raw.get("capabilities") or (persisted.get("spec") or {}).get("capabilities", []),
        "required_certifications": raw.get("required_certifications") or (persisted.get("spec") or {}).get("required_certifications", []),
        "similar_brands":          raw.get("similar_brands") or (persisted.get("spec") or {}).get("similar_brands", []),
        "lead_time_weeks":         raw.get("lead_time_weeks") or (persisted.get("spec") or {}).get("lead_time_weeks"),
        "quantity":                persisted.get("quantity") or raw.get("quantity"),
        "notes":                   raw.get("notes") or (persisted.get("spec") or {}).get("notes", ""),
    }

    # Advance status if we own a persisted order.
    if order_id:
        try:
            service_client().table("orders").update(
                {"status": "compliance", "spec": spec}
            ).eq("id", order_id).execute()
        except Exception:
            pass

    return {
        **state,
        "order_id":     order_id,
        "brand_id":     persisted.get("brand_id"),
        "spec":         spec,
        "product_type": persisted.get("product_type") or raw.get("product_type"),
        "quantity":     spec.get("quantity"),
        "target_price": persisted.get("target_price") or raw.get("target_price"),
        "due_date":     persisted.get("due_date") or raw.get("due_date"),
        "status":       "compliance",
    }
