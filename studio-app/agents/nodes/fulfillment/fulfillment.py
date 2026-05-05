"""Fulfillment node — open a PO with the chosen manufacturer.

Generates a unique PO number, drafts the partner email via the Gmail
shim, persists the PO number on the order, and logs the email into
``comms_log`` for audit. Idempotent — if ``orders.po_number`` is
already set, we reuse it instead of generating a new one.
"""
from __future__ import annotations

import os
import uuid
from typing import Any

from agents.runlog import run_logged
from agents.services.gmail_mcp import draft_or_send
from agents.state import AgentState
from api.db import service_client


@run_logged("fulfillment")
def fulfillment_node(state: AgentState) -> AgentState:
    if not state.get("manufacturer_id"):
        return {
            **state,
            "errors": [*state.get("errors", []), "fulfillment: no manufacturer routed"],
        }

    order_id = state.get("order_id")
    db = service_client()

    # Reuse an existing PO number if we've been here before.
    existing = None
    if order_id:
        rows = (
            db.table("orders")
            .select("po_number")
            .eq("id", order_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if rows:
            existing = rows[0].get("po_number")
    po_number = existing or f"AMN-{uuid.uuid4().hex[:8].upper()}"

    # Pull the partner row for the email.
    manufacturer = (
        db.table("manufacturers")
        .select("id, name, contact_email")
        .eq("id", state["manufacturer_id"])
        .limit(1)
        .execute()
        .data
        or [{}]
    )[0]

    spec = state.get("spec", {}) or {}
    subject, body = _format_partner_po_email(
        partner_name=manufacturer.get("name", "Partner"),
        po_number=po_number,
        order_id=order_id or "—",
        product_type=state.get("product_type") or "—",
        quantity=state.get("quantity") or 0,
        target_price=state.get("target_price"),
        due_date=state.get("due_date"),
        spec=spec,
    )

    notes_lines: list[str] = ["PO drafted."]
    to = manufacturer.get("contact_email")
    if to:
        try:
            sent = draft_or_send(to, subject, body)
            meta: dict[str, Any] = {"po_number": po_number, "kind": sent.get("kind")}
            if sent.get("draft_id"):
                meta["draft_id"] = sent["draft_id"]
            if sent.get("message_id"):
                meta["message_id"] = sent["message_id"]
            db.table("comms_log").insert(
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
            ).execute()
        except Exception as e:
            notes_lines.append(f"Email draft failed: {e}")
    else:
        notes_lines.append(f"No contact_email on manufacturer {manufacturer.get('name','?')}.")

    if order_id:
        try:
            db.table("orders").update(
                {"po_number": po_number, "status": "qa"}
            ).eq("id", order_id).execute()
        except Exception:
            pass

    return {
        **state,
        "po_number":         po_number,
        "fulfillment_notes": " ".join(notes_lines),
        "status":            "qa",
    }


def _format_partner_po_email(
    *,
    partner_name: str,
    po_number: str,
    order_id: str,
    product_type: str,
    quantity: int,
    target_price: float | None,
    due_date: str | None,
    spec: dict[str, Any],
) -> tuple[str, str]:
    lines = [
        f"Hi {partner_name},",
        "",
        f"Amenity is opening PO {po_number} (order ref {order_id[:8] if order_id != '—' else '—'}).",
        "",
        "Brief:",
        f"  • Product:  {product_type}",
    ]
    if quantity:
        lines.append(f"  • Quantity: {quantity:,}")
    if target_price is not None:
        lines.append(f"  • Target:   ${target_price:.2f} / unit")
    if due_date:
        lines.append(f"  • Due:      {due_date}")
    if spec.get("similar_brands"):
        lines.append(f"  • Reference brands: {', '.join(spec['similar_brands'])}")
    if spec.get("required_certifications"):
        lines.append(
            f"  • Required certifications: {', '.join(spec['required_certifications'])}"
        )
    if spec.get("notes"):
        # Notes are passed through as Amenity's own brief — never reference
        # the client or use language that reveals a third party placed this order.
        lines += ["", "Additional specs:", f"  {spec['notes']}"]
    lines += [
        "",
        "Please confirm acceptance and propose a sample timeline.",
        "Standard NET-30 terms.",
        "",
        "Thanks,",
        "Amenity Operations",
    ]
    subject = f"Amenity PO {po_number} — {product_type}"
    return subject, "\n".join(lines)
