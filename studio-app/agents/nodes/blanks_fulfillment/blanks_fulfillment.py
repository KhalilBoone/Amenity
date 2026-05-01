"""Blanks fulfillment — drop-ship the paid order to suppliers and printers.

Called from the Stripe ``checkout.session.completed`` webhook handler.

Two flows in one node:

* **Plain blanks** (``order_items.customization IS NULL``) — supplier ships
  direct to the buyer. One PO email per supplier.

* **Customized** (``order_items.customization IS NOT NULL``) — three-party:
  the supplier ships the blanks to a printer, and the printer decorates and
  ships to the buyer. We pick the printer here via
  ``agents.router.printer.pick_printer`` and persist it to
  ``order_items.printer_id``. We then send TWO emails: one to the supplier
  (ship blanks to <printer address>) and one to the printer (here's the
  artwork + technique + buyer's address; please decorate and ship).

This node is idempotent on a per-line basis: items already marked
``forwarded`` are skipped, so re-firing the node (Stripe retry, manual
replay) does not double-email anyone.
"""
from __future__ import annotations

import os
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from agents.router.printer import pick_printer
from agents.services.gmail_mcp import draft_or_send
from api.db import service_client


# ---------------------------------------------------------------------------
# Email body templates
# ---------------------------------------------------------------------------
def _format_address(a: dict[str, Any] | None) -> str:
    if not a:
        return "  (address pending — please hold)"
    parts = [
        a.get("full_name") or "",
        a.get("company") or "",
        a.get("line1") or "",
        a.get("line2") or "",
        f"{a.get('city','')}, {a.get('region','')} {a.get('postal_code','')}",
        a.get("country") or "US",
    ]
    return "\n".join(f"  {p}" for p in parts if p.strip(", "))


def _supplier_blanks_email(
    supplier_name: str,
    order_id: str,
    items: list[dict[str, Any]],
    ship_to_label: str,
    ship_to: dict[str, Any],
) -> tuple[str, str]:
    """Email asking supplier to ship blanks to {ship_to_label}'s address."""
    lines = [
        f"Hi {supplier_name},",
        "",
        f"Please drop-ship the following blanks on Amenity's behalf "
        f"(ref: {order_id}):",
        "",
    ]
    for it in items:
        v = it["product_variants"]
        p = v["products"]
        lines.append(
            f"  • {p['name']} — size {v.get('size','—')}, "
            f"color {v.get('color','—')} × {it['quantity']} "
            f"(SKU {v['sku']})"
        )
    lines += ["", f"Ship to {ship_to_label}:", _format_address(ship_to), ""]
    lines += [
        "Invoice us NET-30 against this order reference.",
        "",
        "Thanks,",
        "Amenity Operations",
    ]
    subject = f"Amenity drop-ship PO — order {order_id[:8]}"
    return subject, "\n".join(lines)


def _printer_decoration_email(
    printer_name: str,
    order_id: str,
    items: list[dict[str, Any]],
    buyer_address: dict[str, Any] | None,
) -> tuple[str, str]:
    """Email asking the printer to decorate the inbound blanks and ship."""
    lines = [
        f"Hi {printer_name},",
        "",
        f"You'll receive a shipment of blanks from our supplier for the "
        f"following Amenity order (ref: {order_id}).",
        "Please decorate per the spec below and ship direct to the buyer.",
        "",
        "Items + decoration:",
    ]
    for it in items:
        v = it["product_variants"]
        p = v["products"]
        cz = it["customization"] or {}
        lines.append(
            f"  • {p['name']} — size {v.get('size','—')}, "
            f"color {v.get('color','—')} × {it['quantity']}"
        )
        lines.append(
            f"      {cz.get('technique','?')} on {cz.get('placement','?')}"
            + (f" · {cz.get('colors')} ink color(s)"
               if cz.get("colors") else "")
        )
        lines.append(f"      Artwork id: {cz.get('artwork_id','?')}")

    lines += [
        "",
        "Artwork files are linked in the ops dashboard. Reply if you need "
        "us to send signed download URLs.",
        "",
        "Ship to:",
        _format_address(buyer_address),
        "",
        "Invoice us NET-30 against this order reference.",
        "",
        "Thanks,",
        "Amenity Operations",
    ]
    subject = f"Amenity decoration PO — order {order_id[:8]}"
    return subject, "\n".join(lines)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def run(state: dict[str, Any]) -> dict[str, Any]:
    """``state`` only needs ``order_id``."""
    order_id = state.get("order_id")
    if not order_id:
        return {**state, "errors": ["blanks_fulfillment: missing order_id"]}

    db = service_client()

    # Pull order with items + variant + product + supplier in one nested select.
    res = (
        db.table("orders")
        .select(
            "id, user_id, shipping_address_id,"
            " order_items(id, variant_id, quantity, unit_price, customization,"
            "  printer_id, fulfillment_status,"
            "  product_variants(id, sku, size, color,"
            "   products(id, name, supplier_id,"
            "    manufacturers(id, name, contact_email))))"
        )
        .eq("id", order_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return {**state, "errors": [f"order {order_id} not found"]}
    order = rows[0]

    # Buyer shipping address.
    buyer_address: dict[str, Any] | None = None
    if order.get("shipping_address_id"):
        addr = (
            db.table("shipping_addresses")
            .select("*")
            .eq("id", order["shipping_address_id"])
            .limit(1)
            .execute()
        )
        if addr.data:
            buyer_address = addr.data[0]
    buyer_country = (buyer_address or {}).get("country") or "US"

    # Filter to items still in 'pending' (idempotent re-fire).
    pending = [
        i for i in (order.get("order_items") or [])
        if i.get("fulfillment_status") == "pending"
    ]

    # ---- 1. Pick printers for customized items + persist printer_id. ----
    printers: dict[str, dict[str, Any]] = {}   # printer_id → printer row
    for item in pending:
        cz = item.get("customization")
        if not cz:
            continue
        if item.get("printer_id"):
            # Already routed; reuse.
            existing = (
                db.table("manufacturers")
                .select("*")
                .eq("id", item["printer_id"])
                .limit(1)
                .execute()
                .data
            )
            if existing:
                printers[item["printer_id"]] = existing[0]
            continue

        printer = pick_printer(
            technique=cz.get("technique", ""),
            quantity=item.get("quantity") or 0,
            buyer_country=buyer_country,
        )
        if not printer:
            continue
        # Persist the routing decision.
        db.table("order_items").update(
            {"printer_id": printer["id"]}
        ).eq("id", item["id"]).execute()
        item["printer_id"] = printer["id"]
        printers[printer["id"]] = printer

    # ---- 2. Group items by destination. -------------------------------
    # plain_by_supplier: {supplier_id: [items]}  → supplier ships to buyer
    # printer_jobs:      {printer_id: [items]}   → printer decorates + ships to buyer
    # blanks_to_printer: {(supplier_id, printer_id): [items]}
    #                                            → supplier ships blanks to printer
    plain_by_supplier: dict[str, list[dict[str, Any]]] = defaultdict(list)
    printer_jobs: dict[str, list[dict[str, Any]]] = defaultdict(list)
    blanks_to_printer: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    suppliers: dict[str, dict[str, Any]] = {}

    for item in pending:
        v = item.get("product_variants") or {}
        product = v.get("products") or {}
        supplier = product.get("manufacturers") or {}
        supplier_id = supplier.get("id")
        if not supplier_id or not supplier.get("contact_email"):
            continue
        suppliers[supplier_id] = supplier

        if item.get("customization"):
            printer_id = item.get("printer_id")
            if not printer_id:
                continue   # no qualifying printer — leave as pending
            blanks_to_printer[(supplier_id, printer_id)].append(item)
            printer_jobs[printer_id].append(item)
        else:
            plain_by_supplier[supplier_id].append(item)

    # ---- 3. Draft + send emails, mark items forwarded. ---------------
    drafts: list[dict[str, str]] = []
    errors: list[str] = []
    items_forwarded = 0
    auto_send = os.getenv("BLANKS_AUTO_SEND") == "1"
    now_iso = datetime.now(timezone.utc).isoformat()
    ops_email = os.getenv("AMENITY_OPS_EMAIL") or "ops@amenity.studio"

    def _draft(to: str, subject: str, body: str, meta: dict[str, Any]) -> None:
        try:
            sent = draft_or_send(to, subject, body)
        except Exception as e:  # pragma: no cover
            errors.append(f"{to}: {e}")
            return
        drafts.append({"to": to, "subject": subject, "snippet": body.splitlines()[2] if len(body.splitlines()) > 2 else ""})
        merged: dict[str, Any] = {**meta, "kind": sent.get("kind"), "auto_sent": auto_send}
        if sent.get("draft_id"):
            merged["draft_id"] = sent["draft_id"]
        if sent.get("message_id"):
            merged["message_id"] = sent["message_id"]
        db.table("comms_log").insert(
            {
                "order_id": order_id,
                "channel": "email",
                "direction": "outbound",
                "to_addr": to,
                "from_addr": ops_email,
                "subject": subject,
                "body": body,
                "metadata": merged,
            }
        ).execute()

    # 3a. Plain blanks → supplier ships to buyer.
    for sid, items in plain_by_supplier.items():
        s = suppliers[sid]
        subject, body = _supplier_blanks_email(
            s["name"], order_id, items, "buyer", buyer_address or {}
        )
        _draft(s["contact_email"], subject, body, {"supplier_id": sid, "leg": "plain"})
        ids = [i["id"] for i in items]
        db.table("order_items").update(
            {"fulfillment_status": "forwarded", "forwarded_at": now_iso}
        ).in_("id", ids).execute()
        items_forwarded += len(ids)

    # 3b. Customized: supplier ships blanks to printer.
    for (sid, pid), items in blanks_to_printer.items():
        s = suppliers[sid]
        printer = printers.get(pid) or {}
        printer_address = {
            "full_name": printer.get("name"),
            "company":   printer.get("name"),
            "line1":     printer.get("location") or "(printer address on file)",
            "city":      "",
            "region":    "",
            "postal_code": "",
            "country":   "US",
        }
        subject, body = _supplier_blanks_email(
            s["name"], order_id, items, f"printer ({printer.get('name','TBD')})",
            printer_address,
        )
        _draft(s["contact_email"], subject, body, {"supplier_id": sid, "printer_id": pid, "leg": "blanks_to_printer"})
        # We DO NOT mark these forwarded yet — only after the printer leg is also drafted below.

    # 3c. Customized: printer decorates + ships to buyer.
    for pid, items in printer_jobs.items():
        printer = printers.get(pid) or {}
        if not printer.get("contact_email"):
            errors.append(f"printer {printer.get('name','?')} has no contact_email")
            continue
        subject, body = _printer_decoration_email(
            printer["name"], order_id, items, buyer_address
        )
        _draft(printer["contact_email"], subject, body, {"printer_id": pid, "leg": "decoration"})
        ids = [i["id"] for i in items]
        db.table("order_items").update(
            {"fulfillment_status": "forwarded", "forwarded_at": now_iso}
        ).in_("id", ids).execute()
        items_forwarded += len(ids)

    return {
        **state,
        "order_id": order_id,
        "suppliers_emailed": len({d["to"] for d in drafts}),
        "items_forwarded": items_forwarded,
        "drafts": drafts,
        "errors": errors,
    }
