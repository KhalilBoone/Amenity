"""Thin Stripe wrapper for Blanks checkout.

Two callers:
  * ``/checkout`` — turns a hydrated cart into a Stripe Checkout Session.
  * ``/webhooks/stripe`` — verifies the signature on incoming events.

Lazy import so the rest of the API runs without ``stripe`` installed
(useful in CI / py_compile).
"""
from __future__ import annotations

import os
from typing import Any


class StripeError(RuntimeError):
    pass


def _client() -> Any:
    try:
        import stripe  # type: ignore
    except ImportError as e:  # pragma: no cover
        raise StripeError("stripe SDK not installed. `pip install stripe`.") from e
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        raise StripeError("STRIPE_SECRET_KEY not set")
    stripe.api_key = key
    return stripe


# ----------------------------------------------------------------------
# Checkout session
# ----------------------------------------------------------------------
def create_checkout_session(
    *,
    order_id: str,
    user_email: str | None,
    line_items: list[dict[str, Any]],
    success_url: str,
    cancel_url: str,
    shipping_amount_cents: int = 0,
) -> dict[str, Any]:
    """Build a Checkout Session.

    ``line_items`` shape::

        [{"name": "...", "unit_amount_cents": 2200, "quantity": 2}]

    Shipping is added as a flat ``shipping_options`` rate so it appears as
    a separate line on the receipt.
    """
    stripe = _client()

    stripe_line_items = [
        {
            "price_data": {
                "currency": "usd",
                "product_data": {"name": li["name"]},
                "unit_amount": int(li["unit_amount_cents"]),
            },
            "quantity": int(li["quantity"]),
        }
        for li in line_items
    ]

    params: dict[str, Any] = {
        "mode": "payment",
        "line_items": stripe_line_items,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": order_id,
        "metadata": {"order_id": order_id},
        "shipping_address_collection": {"allowed_countries": ["US"]},
    }
    if user_email:
        params["customer_email"] = user_email
    if shipping_amount_cents > 0:
        params["shipping_options"] = [
            {
                "shipping_rate_data": {
                    "type": "fixed_amount",
                    "fixed_amount": {
                        "amount": int(shipping_amount_cents),
                        "currency": "usd",
                    },
                    "display_name": "Standard shipping",
                },
            }
        ]

    session = stripe.checkout.Session.create(**params)
    return {"id": session.id, "url": session.url}


# ----------------------------------------------------------------------
# Webhook verification
# ----------------------------------------------------------------------
def verify_webhook(payload: bytes, sig_header: str) -> dict[str, Any]:
    """Verify the signature and return the parsed event.

    Raises ``StripeError`` on any failure (caller should map to 400).
    """
    stripe = _client()
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise StripeError("STRIPE_WEBHOOK_SECRET not set")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except Exception as e:
        raise StripeError(f"signature verification failed: {e}") from e
    return event  # stripe Event is dict-like
