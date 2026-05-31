"""api/pim.py

Product Information Management (PIM) API routes.
All resources are scoped to an organization the authenticated user belongs to.

Organizations
  GET    /pim/orgs               — list orgs the user is a member of
  POST   /pim/orgs               — create an org (user becomes owner)
  GET    /pim/orgs/{org_id}      — get org detail

Categories
  GET    /pim/orgs/{org_id}/categories         — list categories
  POST   /pim/orgs/{org_id}/categories         — create category
  PATCH  /pim/orgs/{org_id}/categories/{id}    — update category
  DELETE /pim/orgs/{org_id}/categories/{id}    — delete category

Attribute definitions
  GET    /pim/orgs/{org_id}/attributes         — list attribute defs
  POST   /pim/orgs/{org_id}/attributes         — create attribute def
  PATCH  /pim/orgs/{org_id}/attributes/{id}    — update attribute def
  DELETE /pim/orgs/{org_id}/attributes/{id}    — delete attribute def

Products
  GET    /pim/orgs/{org_id}/products           — list (with search + filter)
  POST   /pim/orgs/{org_id}/products           — create product
  GET    /pim/orgs/{org_id}/products/{id}      — get product (+ variants + media)
  PATCH  /pim/orgs/{org_id}/products/{id}      — update product
  DELETE /pim/orgs/{org_id}/products/{id}      — archive product (soft delete)

Variants
  GET    /pim/orgs/{org_id}/products/{pid}/variants        — list variants
  POST   /pim/orgs/{org_id}/products/{pid}/variants        — create variant
  PATCH  /pim/orgs/{org_id}/products/{pid}/variants/{id}   — update variant
  DELETE /pim/orgs/{org_id}/products/{pid}/variants/{id}   — delete variant

Lifecycle stages
  GET    /pim/orgs/{org_id}/stages             — list stages
  POST   /pim/orgs/{org_id}/stages             — create stage
  POST   /pim/orgs/{org_id}/products/{id}/lifecycle  — advance to a stage
  GET    /pim/orgs/{org_id}/products/{id}/lifecycle  — lifecycle history
"""
from __future__ import annotations

import re
from typing import Any

try:
    from fastapi import APIRouter, Depends, HTTPException, Query
    from pydantic import BaseModel, Field
except ImportError:  # pragma: no cover
    APIRouter = None  # type: ignore
    class BaseModel:  # type: ignore
        pass
    def Field(*a, **kw):  # type: ignore
        return None
    def Depends(x):  # type: ignore
        return x
    def Query(*a, **kw):  # type: ignore
        return None

from api.auth import CurrentUser, require_user
from api.db import service_client, user_client


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


def _require_member(org_id: str, user: CurrentUser) -> None:
    """Raise 403 if user is not a member of the org."""
    db = service_client()
    row = (
        db.table("org_members")
        .select("id")
        .eq("org_id", org_id)
        .eq("user_id", user.user_id)
        .limit(1)
        .execute()
    )
    if not (row.data or []):
        raise HTTPException(status_code=403, detail="not a member of this org")


def _require_admin(org_id: str, user: CurrentUser) -> None:
    """Raise 403 if user is not an owner/admin of the org."""
    db = service_client()
    row = (
        db.table("org_members")
        .select("role")
        .eq("org_id", org_id)
        .eq("user_id", user.user_id)
        .limit(1)
        .execute()
    )
    rows = row.data or []
    if not rows or rows[0]["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="admin access required")


# ─────────────────────────────────────────────────────────────────────────────
# Request schemas
# ─────────────────────────────────────────────────────────────────────────────

class OrgCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    slug: str | None = None
    website: str | None = None


class OrgUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    website: str | None = None


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    slug: str | None = None
    parent_id: str | None = None
    description: str | None = None
    position: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    parent_id: str | None = None
    description: str | None = None
    position: int | None = None


class AttributeDefCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    key: str | None = None
    type: str = "text"
    unit: str | None = None
    options: list[str] = []
    required: bool = False
    position: int = 0


class AttributeDefUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    unit: str | None = None
    options: list[str] | None = None
    required: bool | None = None
    position: int | None = None


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=240)
    slug: str | None = None
    description: str | None = None
    short_description: str | None = None
    category_id: str | None = None
    status: str = "draft"
    attributes: dict[str, Any] = {}
    supplier_id: str | None = None
    hs_code: str | None = None
    country_of_origin: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    short_description: str | None = None
    category_id: str | None = None
    status: str | None = None
    attributes: dict[str, Any] | None = None
    supplier_id: str | None = None
    hs_code: str | None = None
    country_of_origin: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    published_at: str | None = None


class VariantCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=120)
    name: str | None = None
    attributes: dict[str, Any] = {}
    price: float | None = None
    compare_at_price: float | None = None
    cost: float | None = None
    inventory_count: int | None = None
    tracks_inventory: bool = False
    weight_g: int | None = None
    barcode: str | None = None
    position: int = 0


class VariantUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    attributes: dict[str, Any] | None = None
    price: float | None = None
    compare_at_price: float | None = None
    cost: float | None = None
    inventory_count: int | None = None
    tracks_inventory: bool | None = None
    weight_g: int | None = None
    barcode: str | None = None
    position: int | None = None


class StageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    color: str = "#6b7280"
    position: int = 0
    is_terminal: bool = False


class LifecycleAdvance(BaseModel):
    stage_id: str
    notes: str | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/pim", tags=["pim"])


# ── Organizations ─────────────────────────────────────────────────────────────

@router.get("/orgs")
def list_orgs(user: CurrentUser = Depends(require_user)) -> dict[str, Any]:
    db = service_client()
    rows = (
        db.table("org_members")
        .select("org_id, role, organizations(*)")
        .eq("user_id", user.user_id)
        .execute()
        .data or []
    )
    return {
        "orgs": [
            {**r["organizations"], "my_role": r["role"]}
            for r in rows
            if r.get("organizations")
        ]
    }


@router.post("/orgs", status_code=201)
def create_org(
    body: OrgCreate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    db = service_client()
    slug = body.slug or _slugify(body.name)

    org = (
        db.table("organizations")
        .insert({"name": body.name, "slug": slug, "website": body.website})
        .execute()
        .data[0]
    )
    db.table("org_members").insert(
        {"org_id": org["id"], "user_id": user.user_id, "role": "owner"}
    ).execute()
    return {**org, "my_role": "owner"}


@router.get("/orgs/{org_id}")
def get_org(org_id: str, user: CurrentUser = Depends(require_user)) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    row = (
        db.table("organizations")
        .select("*")
        .eq("id", org_id)
        .single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="org not found")
    return row


# ── Org members ───────────────────────────────────────────────────────────────

class MemberInvite(BaseModel):
    email: str
    role: str = "member"


@router.get("/orgs/{org_id}/members")
def list_members(org_id: str, user: CurrentUser = Depends(require_user)) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    rows = (
        db.table("org_members")
        .select("id, user_id, role, created_at")
        .eq("org_id", org_id)
        .order("created_at")
        .execute()
        .data or []
    )
    # Enrich with email from auth.users via service role
    enriched = []
    for r in rows:
        try:
            u = db.auth.admin.get_user_by_id(r["user_id"])
            r["email"] = u.user.email if u and u.user else None
        except Exception:
            r["email"] = None
        enriched.append(r)
    return {"members": enriched}


@router.post("/orgs/{org_id}/members/invite", status_code=201)
def invite_member(
    org_id: str,
    body: MemberInvite,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    """Look up the user by email and add them to the org."""
    _require_admin(org_id, user)
    db = service_client()
    # Fetch user by email via Supabase admin API
    try:
        result = db.auth.admin.list_users()
        target = next(
            (u for u in result if u.email == body.email),
            None,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Auth lookup failed: {e}")

    if not target:
        raise HTTPException(
            status_code=404,
            detail=f"No account found for {body.email}. They need to sign up first."
        )

    # Check not already a member
    existing = (
        db.table("org_members")
        .select("id")
        .eq("org_id", org_id)
        .eq("user_id", str(target.id))
        .limit(1)
        .execute()
        .data or []
    )
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member of this org.")

    row = (
        db.table("org_members")
        .insert({"org_id": org_id, "user_id": str(target.id), "role": body.role})
        .execute()
        .data[0]
    )
    row["email"] = body.email
    return row


@router.delete("/orgs/{org_id}/members/{member_id}", status_code=204)
def remove_member(
    org_id: str,
    member_id: str,
    user: CurrentUser = Depends(require_user),
) -> None:
    """Remove a member. Admins can remove others; anyone can remove themselves."""
    _require_admin(org_id, user)
    # Never remove the last owner
    db = service_client()
    target = (
        db.table("org_members")
        .select("role")
        .eq("id", member_id)
        .eq("org_id", org_id)
        .limit(1)
        .execute()
        .data or []
    )
    if target and target[0]["role"] == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the org owner.")
    db.table("org_members").delete().eq("id", member_id).eq("org_id", org_id).execute()


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/orgs/{org_id}/categories")
def list_categories(org_id: str, user: CurrentUser = Depends(require_user)) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    rows = (
        db.table("pim_categories")
        .select("*")
        .eq("org_id", org_id)
        .order("position")
        .execute()
        .data or []
    )
    return {"categories": rows}


@router.post("/orgs/{org_id}/categories", status_code=201)
def create_category(
    org_id: str,
    body: CategoryCreate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_admin(org_id, user)
    db = service_client()
    slug = body.slug or _slugify(body.name)
    payload = {
        "org_id": org_id,
        "name": body.name,
        "slug": slug,
        "parent_id": body.parent_id,
        "description": body.description,
        "position": body.position,
    }
    return db.table("pim_categories").insert(payload).execute().data[0]


@router.patch("/orgs/{org_id}/categories/{cat_id}")
def update_category(
    org_id: str,
    cat_id: str,
    body: CategoryUpdate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_admin(org_id, user)
    db = service_client()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="no fields to update")
    rows = (
        db.table("pim_categories")
        .update(patch)
        .eq("id", cat_id)
        .eq("org_id", org_id)
        .execute()
        .data or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail="category not found")
    return rows[0]


@router.delete("/orgs/{org_id}/categories/{cat_id}", status_code=204)
def delete_category(
    org_id: str,
    cat_id: str,
    user: CurrentUser = Depends(require_user),
) -> None:
    _require_admin(org_id, user)
    service_client().table("pim_categories").delete().eq("id", cat_id).eq("org_id", org_id).execute()


# ── Attribute definitions ──────────────────────────────────────────────────────

@router.get("/orgs/{org_id}/attributes")
def list_attributes(org_id: str, user: CurrentUser = Depends(require_user)) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    rows = (
        db.table("pim_attribute_definitions")
        .select("*")
        .eq("org_id", org_id)
        .order("position")
        .execute()
        .data or []
    )
    return {"attributes": rows}


@router.post("/orgs/{org_id}/attributes", status_code=201)
def create_attribute(
    org_id: str,
    body: AttributeDefCreate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_admin(org_id, user)
    db = service_client()
    key = body.key or _slugify(body.name).replace("-", "_")
    payload = {
        "org_id": org_id,
        "name": body.name,
        "key": key,
        "type": body.type,
        "unit": body.unit,
        "options": body.options,
        "required": body.required,
        "position": body.position,
    }
    return db.table("pim_attribute_definitions").insert(payload).execute().data[0]


@router.patch("/orgs/{org_id}/attributes/{attr_id}")
def update_attribute(
    org_id: str,
    attr_id: str,
    body: AttributeDefUpdate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_admin(org_id, user)
    db = service_client()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="no fields to update")
    rows = (
        db.table("pim_attribute_definitions")
        .update(patch)
        .eq("id", attr_id)
        .eq("org_id", org_id)
        .execute()
        .data or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail="attribute not found")
    return rows[0]


@router.delete("/orgs/{org_id}/attributes/{attr_id}", status_code=204)
def delete_attribute(
    org_id: str,
    attr_id: str,
    user: CurrentUser = Depends(require_user),
) -> None:
    _require_admin(org_id, user)
    service_client().table("pim_attribute_definitions").delete().eq("id", attr_id).eq("org_id", org_id).execute()


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/orgs/{org_id}/products")
def list_products(
    org_id: str,
    user: CurrentUser = Depends(require_user),
    status: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    query = (
        db.table("pim_products")
        .select(
            "id, name, slug, status, category_id, attributes, "
            "created_at, updated_at, published_at, "
            "pim_categories(name)"
        )
        .eq("org_id", org_id)
        .order("updated_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if status:
        query = query.eq("status", status)
    if category_id:
        query = query.eq("category_id", category_id)
    if q:
        query = query.ilike("name", f"%{q}%")

    rows = query.execute().data or []
    return {"products": rows, "offset": offset, "limit": limit}


@router.post("/orgs/{org_id}/products", status_code=201)
def create_product(
    org_id: str,
    body: ProductCreate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    slug = body.slug or _slugify(body.name)
    payload = {
        "org_id": org_id,
        "name": body.name,
        "slug": slug,
        "description": body.description,
        "short_description": body.short_description,
        "category_id": body.category_id,
        "status": body.status,
        "attributes": body.attributes,
        "supplier_id": body.supplier_id,
        "hs_code": body.hs_code,
        "country_of_origin": body.country_of_origin,
        "meta_title": body.meta_title,
        "meta_description": body.meta_description,
    }
    return db.table("pim_products").insert(payload).execute().data[0]


@router.get("/orgs/{org_id}/products/{product_id}")
def get_product(
    org_id: str,
    product_id: str,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    row = (
        db.table("pim_products")
        .select("*, pim_categories(name, slug), pim_variants(*), pim_media(*)")
        .eq("id", product_id)
        .eq("org_id", org_id)
        .single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="product not found")
    return row


@router.patch("/orgs/{org_id}/products/{product_id}")
def update_product(
    org_id: str,
    product_id: str,
    body: ProductUpdate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="no fields to update")
    rows = (
        db.table("pim_products")
        .update(patch)
        .eq("id", product_id)
        .eq("org_id", org_id)
        .execute()
        .data or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail="product not found")
    return rows[0]


@router.delete("/orgs/{org_id}/products/{product_id}", status_code=204)
def archive_product(
    org_id: str,
    product_id: str,
    user: CurrentUser = Depends(require_user),
) -> None:
    """Soft-delete: sets status to 'archived' rather than destroying the row."""
    _require_member(org_id, user)
    service_client().table("pim_products").update({"status": "archived"}).eq(
        "id", product_id
    ).eq("org_id", org_id).execute()


# ── Variants ──────────────────────────────────────────────────────────────────

@router.get("/orgs/{org_id}/products/{product_id}/variants")
def list_variants(
    org_id: str,
    product_id: str,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    rows = (
        db.table("pim_variants")
        .select("*")
        .eq("product_id", product_id)
        .order("position")
        .execute()
        .data or []
    )
    return {"variants": rows}


@router.post("/orgs/{org_id}/products/{product_id}/variants", status_code=201)
def create_variant(
    org_id: str,
    product_id: str,
    body: VariantCreate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    payload = {
        "product_id": product_id,
        **body.model_dump(exclude_none=True),
    }
    return db.table("pim_variants").insert(payload).execute().data[0]


@router.patch("/orgs/{org_id}/products/{product_id}/variants/{variant_id}")
def update_variant(
    org_id: str,
    product_id: str,
    variant_id: str,
    body: VariantUpdate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="no fields to update")
    rows = (
        db.table("pim_variants")
        .update(patch)
        .eq("id", variant_id)
        .eq("product_id", product_id)
        .execute()
        .data or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail="variant not found")
    return rows[0]


@router.delete("/orgs/{org_id}/products/{product_id}/variants/{variant_id}", status_code=204)
def delete_variant(
    org_id: str,
    product_id: str,
    variant_id: str,
    user: CurrentUser = Depends(require_user),
) -> None:
    _require_member(org_id, user)
    service_client().table("pim_variants").delete().eq("id", variant_id).eq(
        "product_id", product_id
    ).execute()


# ── Lifecycle stages ───────────────────────────────────────────────────────────

@router.get("/orgs/{org_id}/stages")
def list_stages(org_id: str, user: CurrentUser = Depends(require_user)) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    rows = (
        db.table("pim_lifecycle_stages")
        .select("*")
        .eq("org_id", org_id)
        .order("position")
        .execute()
        .data or []
    )
    return {"stages": rows}


@router.post("/orgs/{org_id}/stages", status_code=201)
def create_stage(
    org_id: str,
    body: StageCreate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_admin(org_id, user)
    db = service_client()
    payload = {
        "org_id": org_id,
        "name": body.name,
        "color": body.color,
        "position": body.position,
        "is_terminal": body.is_terminal,
    }
    return db.table("pim_lifecycle_stages").insert(payload).execute().data[0]


@router.get("/orgs/{org_id}/products/{product_id}/lifecycle")
def get_lifecycle_history(
    org_id: str,
    product_id: str,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    rows = (
        db.table("pim_product_lifecycle")
        .select("*, pim_lifecycle_stages(name, color)")
        .eq("product_id", product_id)
        .order("created_at", desc=True)
        .execute()
        .data or []
    )
    return {"history": rows}


@router.post("/orgs/{org_id}/products/{product_id}/lifecycle", status_code=201)
def advance_lifecycle(
    org_id: str,
    product_id: str,
    body: LifecycleAdvance,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    payload = {
        "product_id": product_id,
        "stage_id": body.stage_id,
        "notes": body.notes,
        "changed_by": user.user_id,
    }
    return db.table("pim_product_lifecycle").insert(payload).execute().data[0]


# ── Media ─────────────────────────────────────────────────────────────────────

class MediaCreate(BaseModel):
    url: str
    alt: str | None = None
    mime: str | None = None
    width_px: int | None = None
    height_px: int | None = None
    position: int = 0


@router.get("/orgs/{org_id}/products/{product_id}/media")
def list_media(
    org_id: str,
    product_id: str,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    rows = (
        db.table("pim_media")
        .select("*")
        .eq("product_id", product_id)
        .order("position")
        .execute()
        .data or []
    )
    return {"media": rows}


@router.post("/orgs/{org_id}/products/{product_id}/media", status_code=201)
def add_media(
    org_id: str,
    product_id: str,
    body: MediaCreate,
    user: CurrentUser = Depends(require_user),
) -> dict[str, Any]:
    _require_member(org_id, user)
    db = service_client()
    payload = {
        "product_id": product_id,
        "url": body.url,
        "alt": body.alt,
        "mime": body.mime,
        "width_px": body.width_px,
        "height_px": body.height_px,
        "position": body.position,
    }
    return db.table("pim_media").insert(payload).execute().data[0]


@router.delete("/orgs/{org_id}/products/{product_id}/media/{media_id}", status_code=204)
def delete_media(
    org_id: str,
    product_id: str,
    media_id: str,
    user: CurrentUser = Depends(require_user),
) -> None:
    _require_member(org_id, user)
    service_client().table("pim_media").delete().eq("id", media_id).eq(
        "product_id", product_id
    ).execute()
