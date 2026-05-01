"""Compliance node — Berry / TAA / standards check.

Runs the spec through a simple rule set and writes the result to
``orders.compliance`` (jsonb). If a hard requirement can't be met
(e.g. Berry without any Berry-compliant manufacturer in our network),
status flips to ``cancelled`` so the user sees it in their dashboard.

Today this is a pragmatic rule-based check — no live policy lookup,
no agency-specific carve-outs. Tightenings (NAICS-aware policy, agency
profiles, etc.) belong in this node.
"""
from __future__ import annotations

from typing import Any

from agents.runlog import run_logged
from agents.state import AgentState
from api.db import service_client


# Internal cert tags that the load_manufacturers ETL stamps onto rows.
# Keep this list in sync with `manufacturers.certifications` values.
KNOWN_CERTS = {"berry_compliant", "taa", "wrap", "sa8000", "oeko_tex"}


@run_logged("compliance")
def compliance_node(state: AgentState) -> AgentState:
    spec = state.get("spec", {}) or {}
    required = set(spec.get("required_certifications", []) or [])
    order_id = state.get("order_id")

    notes: list[str] = []
    blocking = False

    # ---- catch typos / unknown cert slugs ---------------------------
    unknown = required - KNOWN_CERTS
    if unknown:
        notes.append(
            f"Unknown certification slug(s): {sorted(unknown)} — please confirm."
        )

    # ---- gov-eligibility check (Berry implies TAA implies domestic) -
    if "berry_compliant" in required:
        notes.append("Berry-compliant production required — domestic only.")
    if "taa" in required:
        notes.append("TAA-compliant production required — list of designated countries only.")

    # ---- network availability gate ----------------------------------
    # If a hard cert is required, check we have at least one partner who
    # carries it. Block the order rather than route to a non-compliant one.
    if order_id and required:
        try:
            db = service_client()
            for cert in required & {"berry_compliant", "taa"}:
                hit = (
                    db.table("manufacturers")
                    .select("id")
                    .contains("certifications", [cert])
                    .limit(1)
                    .execute()
                    .data
                )
                if not hit:
                    blocking = True
                    notes.append(
                        f"No partner currently carries '{cert}'. Manual review required."
                    )
        except Exception:
            # If Supabase is unreachable, don't block — we'll catch this
            # downstream when routing actually queries the table.
            pass

    result = {
        "berry_required": "berry_compliant" in required,
        "taa_required":   "taa" in required,
        "required":       sorted(required),
        "notes":          notes,
        "blocking":       blocking,
    }

    next_status: str = "cancelled" if blocking else "routing"

    if order_id:
        try:
            service_client().table("orders").update(
                {"compliance": result, "status": next_status}
            ).eq("id", order_id).execute()
        except Exception:
            pass

    return {
        **state,
        "compliance": result,
        "status":     next_status,  # type: ignore[typeddict-item]
    }
