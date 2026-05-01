"""Comms node — draft the right message to the right party.

For Studio orders coming out of QA, this drafts a "your run is wrapping
up" email to the brand owner via the Gmail shim. Logs into ``comms_log``
for audit. If we don't have an email on the brand, we no-op gracefully
and let invoicing carry on.
"""
from __future__ import annotations

import os
from typing import Any

from agents.runlog import run_logged
from agents.services.gmail_mcp import draft_or_send
from agents.state import AgentState
from api.db import service_client


@run_logged("comms")
def comms_node(state: AgentState) -> AgentState:
    order_id = state.get("order_id")
    db = service_client()

    # Pull brand contact + product context for the body.
    brand: dict[str, Any] = {}
    if state.get("brand_id"):
        rows = (
            db.table("brands")
            .select("name, contact_email")
            .eq("id", state["brand_id"])
            .limit(1)
            .execute()
            .data
            or []
        )
        if rows:
            brand = rows[0]

    to = brand.get("contact_email")
    last_comm_id: str | None = None

    if to:
        subject = f"Amenity update — your {state.get('product_type','order')} is moving"
        po = state.get("po_number") or "—"
        body = "\n".join([
            f"Hi {brand.get('name','team')},",
            "",
            f"Quick update on your run with Amenity (PO {po}).",
            "",
            "QA has cleared the production checkpoints and we're queuing your "
            "invoice next. Expect delivery shortly.",
            "",
            "Reply to this thread if anything looks off.",
            "",
            "— Amenity Operations",
        ])
        try:
            sent = draft_or_send(to, subject, body)
            meta: dict[str, Any] = {"stage": "post_qa", "kind": sent.get("kind")}
            if sent.get("draft_id"):
                meta["draft_id"] = sent["draft_id"]
            if sent.get("message_id"):
                meta["message_id"] = sent["message_id"]
            inserted = (
                db.table("comms_log")
                .insert(
                    {
                        "order_id":  order_id,
                        "channel":   "email",
                        "direction": "outbound",
                        "to_addr":   to,
                        "from_addr": os.getenv("AMENITY_OPS_EMAIL") or "ops@amenity.studio",
                        "subject":   subject,
                        "body":      body,
                        "metadata":  meta,
                    }
                )
                .execute()
                .data
                or []
            )
            if inserted:
                last_comm_id = inserted[0].get("id")
        except Exception:
            pass

    next_status: str = "invoiced" if state.get("status") == "comms" else state.get("status") or "comms"

    if order_id:
        try:
            db.table("orders").update({"status": next_status}).eq(
                "id", order_id
            ).execute()
        except Exception:
            pass

    return {
        **state,
        "last_comm_id": last_comm_id,
        "status":       next_status,  # type: ignore[typeddict-item]
    }
