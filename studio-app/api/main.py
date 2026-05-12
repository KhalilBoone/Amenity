"""FastAPI gateway for Amenity.

Routes split by surface:

Orders (read-only — historical Studio rows + Blanks orders)
  GET  /orders              — list orders the user can see (RLS-scoped)
  GET  /orders/{id}         — order status

Shop / Blanks (e-commerce — Supabase + Stripe)
  GET    /products          — list active products + variants
  GET    /products/{slug}   — single product detail
  GET    /cart              — current user's open cart (auth)
  POST   /cart/items        — add line (auth)
  PATCH  /cart/items/{id}   — change quantity (auth)
  DELETE /cart/items/{id}   — remove line (auth)
  GET    /addresses         — list addresses (auth)
  POST   /addresses         — create address (auth)
  POST   /checkout          — cart → order → Stripe Checkout Session (auth)
  GET    /customization/pricing  — decoration pricing bands
  POST   /uploads/artwork[/intent] — artwork upload helpers

Webhooks
  POST /webhooks/sam        — manual SAM.gov ingestion trigger
  POST /webhooks/stripe     — payment events → mark order paid + fulfill

Health
  GET  /health
"""
from __future__ import annotations

import os
from typing import Any

try:
    from fastapi import Depends, FastAPI, HTTPException, Request, status
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    FastAPI = None  # type: ignore
    HTTPException = Exception  # type: ignore

    class BaseModel:  # type: ignore
        pass

    def Field(*a, **kw):  # type: ignore
        return None

    def Depends(x):  # type: ignore
        return x


from agents.graph import run_bid
from api.auth import CurrentUser, optional_user, require_user
from api.db import service_client, user_client
from api.storage import BUCKET as ARTWORK_BUCKET, make_storage_path, new_artwork_id
from api.stripe_client import StripeError, create_checkout_session, verify_webhook


# ----------------------------------------------------------------------
# App
# ----------------------------------------------------------------------
app = FastAPI(title="Amenity API", version="0.2.0") if FastAPI else None

if app is not None:
    origins = [o.strip() for o in os.getenv("API_CORS_ORIGINS", "").split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ----------------------------------------------------------------------
# Schemas
# ----------------------------------------------------------------------
class CustomizationPayload(BaseModel):
    artwork_id: str
    placement: str
    technique: str                 # 'screen_print' | 'embroidery' | 'dtg'
    colors: int | None = None      # ink colors (screen print)
    ink_colors: list[str] = []
    size_in: dict[str, float] | None = None
    setup_fee: float
    unit_cost: float


class CartAddRequest(BaseModel):
    variant_id: str
    quantity: int = Field(default=1, ge=1)
    customization: CustomizationPayload | None = None


class CartUpdateRequest(BaseModel):
    quantity: int = Field(ge=1)


class ArtworkRegisterRequest(BaseModel):
    file_path: str                 # caller already uploaded to this path
    original_filename: str | None = None
    mime: str | None = None
    size_bytes: int | None = None
    width_px: int | None = None
    height_px: int | None = None


class ArtworkUploadIntentRequest(BaseModel):
    """Returns the storage path + artwork_id the client should upload to.
    The actual upload happens client-side via supabase-js."""
    filename: str
    mime: str | None = None


class AddressRequest(BaseModel):
    full_name: str | None = None
    company: str | None = None
    line1: str
    line2: str | None = None
    city: str
    region: str | None = None
    postal_code: str
    country: str = "US"
    phone: str | None = None
    is_default: bool = False


class CheckoutRequest(BaseModel):
    shipping_address_id: str
    success_url: str
    cancel_url: str


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
SHIPPING_FLAT_USD = 12.00  # Phase 1 placeholder; replace with rate engine.


def _ensure_open_cart(client: Any, user_id: str) -> dict[str, Any]:
    """Find or create the user's single open cart."""
    res = (
        client.table("carts")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "open")
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if rows:
        return rows[0]
    created = (
        client.table("carts")
        .insert({"user_id": user_id, "status": "open"})
        .execute()
    )
    return created.data[0]


def _hydrate_cart(client: Any, cart_id: str) -> dict[str, Any]:
    """Return the cart with its items, variants, and parent products joined."""
    cart = (
        client.table("carts")
        .select("*")
        .eq("id", cart_id)
        .single()
        .execute()
        .data
    )
    items_res = (
        client.table("cart_items")
        .select(
            "id, cart_id, variant_id, quantity, unit_price, created_at,"
            " product_variants(id, sku, size, color, price, hero_image_url, product_id,"
            " products(id, slug, name, hero_image_url, brand))"
        )
        .eq("cart_id", cart_id)
        .execute()
    )
    items = items_res.data or []
    subtotal = sum(float(i["unit_price"]) * int(i["quantity"]) for i in items)
    return {**cart, "items": items, "subtotal": round(subtotal, 2)}


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
if app is not None:

    # ---------------- health -----------------------------------------
    @app.get("/health")
    def health() -> dict[str, Any]:
        return {"ok": True}

    # ---------------- Orders (read-only after Studio sunset) ---------
    @app.get("/orders/{order_id}")
    def get_order(
        order_id: str,
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        client = user_client(user.jwt)
        res = client.table("orders").select("*").eq("id", order_id).limit(1).execute()
        rows = res.data or []
        if not rows:
            raise HTTPException(status_code=404, detail="order not found")
        return rows[0]

    @app.get("/orders")
    def list_orders(
        user: CurrentUser = Depends(require_user),
        order_type: str | None = None,
        limit: int = 50,
    ) -> dict[str, Any]:
        """All orders the user can see (RLS handles the filter — Studio
        orders via brand ownership, Blanks orders via user_id)."""
        client = user_client(user.jwt)
        q = (
            client.table("orders")
            .select("*")
            .order("created_at", desc=True)
            .limit(min(max(1, limit), 200))
        )
        if order_type:
            q = q.eq("order_type", order_type)
        res = q.execute()
        return {"orders": res.data or []}

    # ---------------- Blanks: products -------------------------------
    @app.get("/products")
    def list_products(
        category: str | None = None,
        sourcing: str | None = None,
    ) -> dict[str, Any]:
        # Public: anon RLS allows status='active' selects on products + variants.
        client = service_client()  # public catalog read; safe to use service role
        q = (
            client.table("products")
            .select("*, product_variants(*)")
            .eq("status", "active")
            .order("name")
        )
        if category:
            q = q.eq("category", category)
        if sourcing:
            q = q.eq("sourcing", sourcing)
        res = q.execute()
        return {"products": res.data or []}

    @app.get("/products/{slug}")
    def get_product(slug: str) -> dict[str, Any]:
        client = service_client()
        res = (
            client.table("products")
            .select("*, product_variants(*)")
            .eq("slug", slug)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if not rows:
            raise HTTPException(status_code=404, detail="product not found")
        return rows[0]

    # ---------------- Blanks: cart -----------------------------------
    @app.get("/cart")
    def get_cart(user: CurrentUser = Depends(require_user)) -> dict[str, Any]:
        client = user_client(user.jwt)
        cart = _ensure_open_cart(client, user.user_id)
        return _hydrate_cart(client, cart["id"])

    @app.post("/cart/items")
    def add_to_cart(
        body: CartAddRequest,
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        client = user_client(user.jwt)
        cart = _ensure_open_cart(client, user.user_id)

        # Snapshot the variant price at add-time.
        variant = (
            client.table("product_variants")
            .select("id, price")
            .eq("id", body.variant_id)
            .limit(1)
            .execute()
            .data
        )
        if not variant:
            raise HTTPException(status_code=404, detail="variant not found")
        variant_price = float(variant[0]["price"])

        cz = body.customization
        unit_price = variant_price + (float(cz.unit_cost) if cz else 0.0)

        if cz is None:
            # ---- Plain blank line: merge with any existing blank line for
            # the same variant.
            existing = (
                client.table("cart_items")
                .select("id, quantity")
                .eq("cart_id", cart["id"])
                .eq("variant_id", body.variant_id)
                .is_("customization", "null")
                .limit(1)
                .execute()
                .data
            )
            if existing:
                new_qty = int(existing[0]["quantity"]) + body.quantity
                client.table("cart_items").update({"quantity": new_qty}).eq(
                    "id", existing[0]["id"]
                ).execute()
            else:
                client.table("cart_items").insert(
                    {
                        "cart_id": cart["id"],
                        "variant_id": body.variant_id,
                        "quantity": body.quantity,
                        "unit_price": unit_price,
                    }
                ).execute()
        else:
            # ---- Customized line: never merge automatically (different
            # artwork / placement = different product). Always a new row.
            # Confirm the artwork belongs to this user before linking.
            artwork = (
                client.table("artwork_uploads")
                .select("id")
                .eq("id", cz.artwork_id)
                .limit(1)
                .execute()
                .data
            )
            if not artwork:
                raise HTTPException(
                    status_code=404, detail="artwork not found"
                )
            client.table("cart_items").insert(
                {
                    "cart_id": cart["id"],
                    "variant_id": body.variant_id,
                    "quantity": body.quantity,
                    "unit_price": unit_price,
                    "customization": cz.dict(),
                }
            ).execute()

        return _hydrate_cart(client, cart["id"])

    @app.patch("/cart/items/{item_id}")
    def update_cart_item(
        item_id: str,
        body: CartUpdateRequest,
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        client = user_client(user.jwt)
        # RLS guarantees the user can only update their own cart's items.
        res = (
            client.table("cart_items")
            .update({"quantity": body.quantity})
            .eq("id", item_id)
            .execute()
        )
        if not (res.data or []):
            raise HTTPException(status_code=404, detail="cart item not found")
        cart = _ensure_open_cart(client, user.user_id)
        return _hydrate_cart(client, cart["id"])

    @app.delete("/cart/items/{item_id}")
    def remove_cart_item(
        item_id: str,
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        client = user_client(user.jwt)
        client.table("cart_items").delete().eq("id", item_id).execute()
        cart = _ensure_open_cart(client, user.user_id)
        return _hydrate_cart(client, cart["id"])

    # ---------------- Blanks: addresses ------------------------------
    @app.get("/addresses")
    def list_addresses(
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        client = user_client(user.jwt)
        res = (
            client.table("shipping_addresses")
            .select("*")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"addresses": res.data or []}

    @app.post("/addresses")
    def create_address(
        body: AddressRequest,
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        client = user_client(user.jwt)
        payload = body.dict()
        payload["user_id"] = user.user_id
        res = client.table("shipping_addresses").insert(payload).execute()
        return res.data[0]

    # ---------------- Blanks: checkout -------------------------------
    @app.post("/checkout")
    def checkout(
        body: CheckoutRequest,
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        client = user_client(user.jwt)
        cart = _ensure_open_cart(client, user.user_id)
        hydrated = _hydrate_cart(client, cart["id"])

        items = hydrated["items"]
        if not items:
            raise HTTPException(status_code=400, detail="cart is empty")

        subtotal = float(hydrated["subtotal"])
        shipping_cost = SHIPPING_FLAT_USD
        tax = 0.0  # tax engine not wired yet
        total = round(subtotal + shipping_cost + tax, 2)

        # Service role for order creation so RLS doesn't trip on the FK
        # set during the same transaction.
        admin = service_client()
        order_row = (
            admin.table("orders")
            .insert(
                {
                    "user_id": user.user_id,
                    "order_type": "blanks",
                    "status": "intake",
                    "shipping_address_id": body.shipping_address_id,
                    "subtotal": subtotal,
                    "shipping_cost": shipping_cost,
                    "tax": tax,
                    "total": total,
                    "currency": "USD",
                }
            )
            .execute()
            .data[0]
        )
        order_id = order_row["id"]

        # Mirror cart_items → order_items.
        admin.table("order_items").insert(
            [
                {
                    "order_id": order_id,
                    "variant_id": i["variant_id"],
                    "quantity": i["quantity"],
                    "unit_price": i["unit_price"],
                }
                for i in items
            ]
        ).execute()

        # Build Stripe line items from the hydrated rows.
        stripe_line_items = [
            {
                "name": (
                    f"{i['product_variants']['products']['name']}"
                    f" — {i['product_variants'].get('size','')} "
                    f"{i['product_variants'].get('color','')}"
                ).strip(),
                "unit_amount_cents": int(round(float(i["unit_price"]) * 100)),
                "quantity": int(i["quantity"]),
            }
            for i in items
        ]

        # The frontend sends '/orders/{ORDER_ID}/success'; substitute the real
        # id so Stripe gets a concrete URL.
        success_url = body.success_url.replace("{ORDER_ID}", order_id)
        cancel_url = body.cancel_url.replace("{ORDER_ID}", order_id)
        try:
            session = create_checkout_session(
                order_id=order_id,
                user_email=user.email,
                line_items=stripe_line_items,
                success_url=success_url,
                cancel_url=cancel_url,
                shipping_amount_cents=int(round(shipping_cost * 100)),
            )
        except StripeError as e:
            # Roll back the empty order so the cart isn't orphaned.
            admin.table("orders").delete().eq("id", order_id).execute()
            raise HTTPException(status_code=502, detail=str(e))

        # Mark cart as checked_out and stash session id on the order.
        admin.table("orders").update(
            {"stripe_session_id": session["id"]}
        ).eq("id", order_id).execute()
        admin.table("carts").update({"status": "checked_out"}).eq(
            "id", cart["id"]
        ).execute()

        return {"order_id": order_id, "checkout_url": session["url"]}

    # ---------------- Blanks: customization --------------------------
    @app.get("/customization/pricing")
    def customization_pricing() -> dict[str, Any]:
        """Public — the customize page reads this to compute live prices."""
        client = service_client()
        res = (
            client.table("customization_pricing")
            .select("*")
            .eq("active", True)
            .order("technique")
            .order("min_quantity")
            .execute()
        )
        return {"pricing": res.data or []}

    @app.post("/uploads/artwork/intent")
    def artwork_upload_intent(
        body: ArtworkUploadIntentRequest,
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        """Allocate an artwork_id + storage path so the client knows where
        to upload to. Client uploads via supabase-js (RLS gates the write
        to ``{user_id}/...``), then calls /uploads/artwork to register."""
        artwork_id = new_artwork_id()
        path = make_storage_path(user.user_id, artwork_id, body.filename)
        return {
            "artwork_id": artwork_id,
            "bucket": ARTWORK_BUCKET,
            "file_path": path,
        }

    @app.post("/uploads/artwork")
    def register_artwork(
        body: ArtworkRegisterRequest,
        user: CurrentUser = Depends(require_user),
    ) -> dict[str, Any]:
        """Register a freshly-uploaded file as an artwork_uploads row."""
        # The path must start with the user's id — defence in depth on top
        # of storage RLS.
        if not body.file_path.startswith(f"{user.user_id}/"):
            raise HTTPException(
                status_code=403, detail="file_path outside user folder"
            )
        client = user_client(user.jwt)
        res = (
            client.table("artwork_uploads")
            .insert(
                {
                    "user_id": user.user_id,
                    "file_path": body.file_path,
                    "original_filename": body.original_filename,
                    "mime": body.mime,
                    "size_bytes": body.size_bytes,
                    "width_px": body.width_px,
                    "height_px": body.height_px,
                    "status": "uploaded",
                }
            )
            .execute()
        )
        return res.data[0]

    # ---------------- Webhooks ---------------------------------------
    def _check_cron_token(request: Request) -> None:
        """Enforce ``PARTNER_MONITOR_TOKEN`` if it's set in the env.

        We accept all callers when the token isn't configured — this is
        the dev / unconfigured-staging path. In prod, set the env var on
        the API host and on the cron caller (GitHub Actions secret).
        """
        expected = os.getenv("PARTNER_MONITOR_TOKEN")
        if not expected:
            return
        provided = request.headers.get("x-cron-token") or request.headers.get(
            "X-Cron-Token"
        )
        if provided != expected:
            raise HTTPException(status_code=401, detail="invalid cron token")

    @app.post("/webhooks/sam")
    async def sam_webhook(request: Request) -> dict[str, Any]:
        _check_cron_token(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        result = run_bid(  # type: ignore[arg-type]
            {"raw_input": payload, "status": "discovered"}
        )
        return {"bid_id": result.get("bid_id"), "status": result.get("status")}

    @app.post("/webhooks/stripe")
    async def stripe_webhook(request: Request) -> dict[str, Any]:
        sig = request.headers.get("stripe-signature", "")
        body = await request.body()
        try:
            event = verify_webhook(body, sig)
        except StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))

        etype = event.get("type")
        admin = service_client()

        if etype == "checkout.session.completed":
            session = event["data"]["object"]
            order_id = session.get("metadata", {}).get("order_id") or session.get(
                "client_reference_id"
            )
            if order_id:
                admin.table("orders").update(
                    {
                        "status": "fulfillment",
                        "stripe_payment_intent_id": session.get("payment_intent"),
                    }
                ).eq("id", order_id).execute()

                # Hand off to the blanks fulfillment node (drafts supplier POs).
                try:
                    from agents.nodes.blanks_fulfillment.blanks_fulfillment import (
                        run as run_blanks_fulfillment,
                    )

                    run_blanks_fulfillment({"order_id": order_id})
                except Exception:
                    # Don't fail the webhook if the agent step trips —
                    # Stripe will retry, and we can re-fire manually.
                    pass

        return {"received": True, "type": etype}
