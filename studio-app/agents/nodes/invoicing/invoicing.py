"""Invoicing node — bill the client.

Computes the line total from ``quantity × target_price``, ensures the
brand has a Stripe Customer (creating one on first use), drafts a
Stripe invoice in send_invoice mode (NET-30), and persists an
``invoices`` row.

If ``STRIPE_SECRET_KEY`` is missing, the row is created with
``status='draft'`` and ``stripe_id=NULL`` so a human can finalise it.
The order is closed regardless — invoice status is tracked separately.
"""
from __future__ import annotations

import os
from typing import Any

from agents.runlog import run_logged
from agents.state import AgentState
from api.db import service_client


def _ensure_stripe_customer(brand: dict[str, Any]) -> str | None:
    """Return a Stripe customer id for this brand, creating one if needed.

    Persists the new id back to ``brands.stripe_customer_id`` so subsequent
    invoices skip the create call.
    """
    if not os.getenv("STRIPE_SECRET_KEY"):
        return None

    cid = brand.get("stripe_customer_id")
    if cid:
        return cid

    try:
        import stripe  # type: ignore
    except ImportError:                # pragma: no cover
        return None

    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    try:
        customer = stripe.Customer.create(
            name=brand.get("name") or None,
            email=brand.get("contact_email") or None,
            metadata={
                "amenity_brand_id": brand.get("id") or "",
            },
        )
    except Exception:
        return None

    # Persist the new id so the next invoice reuses it.
    try:
        service_client().table("brands").update(
            {"stripe_customer_id": customer.id}
        ).eq("id", brand["id"]).execute()
    except Exception:
        pass

    return customer.id


def _draft_stripe_invoice(amount: float, customer_id: str, *, order_id: str) -> str | None:
    """Add a line item + draft an invoice. Returns the invoice id."""
    try:
        import stripe  # type: ignore
    except ImportError:                 # pragma: no cover
        return None
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    try:
        stripe.InvoiceItem.create(
            customer=customer_id,
            amount=int(round(amount * 100)),
            currency="usd",
            description=f"Amenity Studio production run — order {order_id[:8]}",
        )
        invoice = stripe.Invoice.create(
            customer=customer_id,
            collection_method="send_invoice",
            days_until_due=30,
            metadata={"amenity_order_id": order_id},
        )
        return invoice.id
    except Exception:
        return None


@run_logged("invoicing")
def invoicing_node(state: AgentState) -> AgentState:
    qty = state.get("quantity") or 0
    unit = state.get("target_price") or 0.0
    amount = round(float(qty) * float(unit), 2)
    order_id = state.get("order_id")

    db = service_client()

    # Pull the brand (with stripe_customer_id).
    brand: dict[str, Any] = {}
    if state.get("brand_id"):
        rows = (
            db.table("brands")
            .select("*")
            .eq("id", state["brand_id"])
            .limit(1)
            .execute()
            .data
            or []
        )
        if rows:
            brand = rows[0]

    stripe_id: str | None = None
    if amount > 0 and brand:
        customer_id = _ensure_stripe_customer(brand)
        if customer_id and order_id:
            stripe_id = _draft_stripe_invoice(amount, customer_id, order_id=order_id)

    invoice_id: str | None = None
    if order_id and amount > 0:
        try:
            row = (
                db.table("invoices")
                .insert(
                    {
                        "order_id":  order_id,
                        "amount":    amount,
                        "currency":  "USD",
                        "stripe_id": stripe_id,
                        "status":    "open" if stripe_id else "draft",
                    }
                )
                .execute()
                .data
                or []
            )
            if row:
                invoice_id = row[0].get("id")
        except Exception:
            pass

    if order_id:
        try:
            db.table("orders").update({"status": "closed"}).eq(
                "id", order_id
            ).execute()
        except Exception:
            pass

    return {
        **state,
        "invoice_id":     invoice_id,
        "invoice_amount": amount,
        "status":         "closed",
    }
