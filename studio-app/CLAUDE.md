# studio-app — Project Context

## What This Is
Amenity is a digital consultant platform for brand owners and government agencies sourcing clothing and footwear manufacturing services.

Amenity has **two public products** plus a wholesale shop and one outbound surface:
- **Liai** — AI sourcing agent. Marketing lander at `/products/liai`; live chat at `/sourcing`. Supports `?brief=` query param to pre-fill a brief from manufacturer cards. pgvector embeddings on `manufacturers.embedding`.
- **Blanks** — Wholesale blanks shop. Lives at `/shop/*`. No separate marketing lander — the shop IS the product.
- **Manufacturers** — Public directory at `/manufacturers` (filterable: domestic, cert, category, search). Individual profile pages at `/manufacturers/[slug]`.
- **Supply Co.** — Outbound SAM.gov bidding (backend-only `bids` flow, never user-facing).

Studio / PLM has been **removed** from all public surfaces. `/products/studio` redirects to `/shop`.

Layers:
- **Frontend** (`frontend/`) — Next.js App Router, Supabase client, shared TS types.
- **API** (`api/main.py`) — FastAPI gateway. Routers: `api/sourcing.py` (Liai), `api/pim.py` (PIM), plus Shop + webhook handlers inline. Public manufacturer endpoints inline in `main.py`.
- **Agents** (`agents/`) — Supply Co. bid graph + Shop drop-ship fulfillment node.
- **Supabase** (`supabase/schema.sql`) — base schema. Migrations in `supabase/migrations/`.

---

## Agent Graph

```
   build_bid_graph()  — Supply Co.
   partner_monitor ──► compliance ──► comms ──► END

   blanks_fulfillment — fired from /webhooks/stripe (single step, not a graph)
```

---

## File Map

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Base Postgres DDL (orders, manufacturers, products, carts, bids, etc.) |
| `supabase/migrations/003_pgvector_manufacturer_embeddings.sql` | pgvector extension + `embedding` column + HNSW index + `match_manufacturers` RPC |
| `supabase/migrations/004_organizations_and_pim.sql` | `organizations`, `org_members`, `pim_*` tables + RLS helpers |
| `supabase/seeds/generate_manufacturer_embeddings.py` | Backfills `manufacturers.embedding` via OpenAI text-embedding-3-small. Run once after migration 003. |
| `api/sourcing.py` | `POST /sourcing/chat` — embed brief → `match_manufacturers` RPC → stream Claude response (ndjson) |
| `api/pim.py` | PIM CRUD: orgs, categories, attribute defs, products, variants (Lifecycle removed) |
| `api/main.py` | FastAPI app — mounts routers; `GET /manufacturers` + `GET /manufacturers/{id}` (public); Shop + webhook routes inline |
| `api/db.py` | `service_client()` / `user_client(jwt)` |
| `api/auth.py` | `require_user` / `optional_user` FastAPI deps |
| `api/storage.py` | Supabase Storage helpers (artwork bucket) |
| `api/stripe_client.py` | Stripe SDK wrapper |
| `frontend/app/(marketing)/page.tsx` | Homepage — hero with customer-type chips, Liai + Blanks product cards, featured manufacturers, how-it-works |
| `frontend/app/(marketing)/products/liai/page.tsx` | Liai marketing lander — hero, features (incl. Berry/TAA), how-it-works, Blanks cross-sell |
| `frontend/app/(marketing)/products/studio/page.tsx` | Redirects to `/shop` |
| `frontend/app/(marketing)/sourcing/page.tsx` | Liai chat — split-panel; supports `?brief=` query param to auto-fire a pre-filled brief |
| `frontend/app/(marketing)/manufacturers/page.tsx` | **Subscription teaser** — blurred ghost cards, benefits list, sign-in/subscribe CTAs. No longer a public directory. |
| `frontend/app/(marketing)/manufacturers/[slug]/page.tsx` | Public manufacturer profile (kept for SEO/backlinks); full detail view with Liai CTA |
| `frontend/app/(marketing)/shop/*` | Blanks storefront, cart, orders |
| `frontend/app/(marketing)/use-cases/page.tsx` | Use cases index — grid by category |
| `frontend/app/(marketing)/use-cases/[slug]/page.tsx` | Individual use case landing — pain points, outcomes, product CTAs |
| `frontend/app/(dashboard)/layout.tsx` | Dashboard sidebar — **two sections**: Marketplace (Marketplace, Orders, Invoices) + Workspace (Products, Settings, Team) |
| `frontend/app/(dashboard)/dashboard/marketplace/page.tsx` | **Auth-gated manufacturer directory** — grid + list view, filters, search, card links to profile |
| `frontend/app/(dashboard)/dashboard/marketplace/[slug]/page.tsx` | **Auth-gated manufacturer profile** — full detail, contact info, Liai CTA |
| `frontend/app/(dashboard)/dashboard/orders/page.tsx` | **Orders list** — all orders, status filter, search, click to detail |
| `frontend/app/(dashboard)/dashboard/orders/[id]/page.tsx` | **Order detail** — line items, totals, status timeline, shipping address, documents download |
| `frontend/app/(dashboard)/dashboard/invoices/page.tsx` | **Invoices** — outstanding/overdue/paid summary cards, per-invoice pay + download actions |
| `frontend/app/(dashboard)/pim/page.tsx` | PIM product list |
| `frontend/app/(dashboard)/pim/products/new/page.tsx` | Create product form |
| `frontend/app/(dashboard)/pim/products/[id]/page.tsx` | Edit product — tabs: Details / Variants / Media |
| `frontend/app/(dashboard)/pim/settings/page.tsx` | PIM settings — Attributes schema + Team tab |
| `frontend/components/SiteHeader.tsx` | Public nav — Liai, Use Cases (dropdown), Shop, cart, auth. **Manufacturers removed.** |
| `frontend/components/pim/ProductForm.tsx` | Shared product form |
| `frontend/components/pim/MediaGallery.tsx` | Drag-and-drop image upload → Supabase Storage |
| `frontend/lib/useCases.ts` | USE_CASE_CATEGORIES + USE_CASES data. 13 use cases across 4 categories. Products: `"liai" \| "blanks"` only. Includes government-agencies + uniform-workwear-suppliers. |
| `frontend/lib/api.ts` | `apiGet/Post/Patch/Delete` — authenticated fetch wrappers |
| `frontend/types/index.ts` | Shared TS types |
| `agents/graph.py` | LangGraph — `build_bid_graph()` (Supply Co.) |
| `agents/nodes/` | `blanks_fulfillment`, `comms`, `compliance`, `partner_monitor` |
| `DEPLOY.md` | Deploy walkthrough (Vercel + Fly.io + Supabase) |

---

## Tech Stack

- **DB**: Supabase (Postgres + pgvector + Auth + Storage)
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims)
- **AI**: Anthropic SDK (`claude-sonnet-4-6`) — Liai chat synthesis + Supply Co. agents
- **API**: FastAPI (Python 3.11+)
- **Frontend**: Next.js 16 + Tailwind, Supabase JS client
- **Hosting**: Vercel (frontend), Fly.io (api), Supabase (db)

---

## Business Rules

1. Backend is invisible — no mention of Supabase, OpenAI, or Claude in UI.
2. Liai is the AI sourcing agent — it speaks plain English, never mentions embeddings or vector search.
3. Platform serves **fashion brands, government agencies, uniform suppliers, and wholesale buyers**.
4. Government compliance (Berry Amendment, TAA, Buy American) is surfaced prominently in Liai features and manufacturer profiles. NAICS 315/316/314 + PSC 84xx coverage.
5. PIM is multi-tenant — every product/category/attribute is scoped to `org_id`. RLS enforced via `is_org_member` / `is_org_admin`.
6. Shop / Blanks is drop-ship Phase 1: `tracks_inventory=false` on all variants.
7. Supply Co. is outbound only — SAM.gov bid monitoring, never user-facing.
8. Studio / PLM is removed from all public surfaces. The PIM dashboard persists as an e-commerce backend only.

---

## Env vars required

```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   # API + seeds
OPENAI_API_KEY                            # Liai embeddings
ANTHROPIC_API_KEY                         # Liai chat + agents
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET  # Shop checkout
NEXT_PUBLIC_SUPABASE_URL                  # Frontend
NEXT_PUBLIC_SUPABASE_ANON_KEY             # Frontend
NEXT_PUBLIC_API_URL                       # Frontend → API base URL
```

---

## Validation Loop

```bash
# Python syntax
find agents api -name "*.py" -exec python -m py_compile {} \;

# TypeScript
cd frontend && npx tsc --noEmit

# CLAUDE.md size
wc -l CLAUDE.md   # must stay under 300
```

---

## Pending Work

1. **Seed embeddings** — after applying migrations 003–005, run `python supabase/seeds/generate_manufacturer_embeddings.py` with `OPENAI_API_KEY` set.
2. **Manufacturer profile cards** — cards on `/manufacturers` link to `/manufacturers/[slug]`; `slug` column must be populated in DB for clean URLs (falls back to `id`).
3. **Saved briefs** — users can't save or revisit past sourcing sessions.
4. **Pricing page** — no `/pricing` page exists yet.
5. **PIM: attribute options UI** — `select` / `multi_select` attribute types need an options editor in settings.
6. **Deploy** — see `DEPLOY.md`. Add `OPENAI_API_KEY` to Fly.io secrets for Liai.
7. **Gmail MCP** — set `GMAIL_MCP_URL` + `GMAIL_MCP_TOKEN` for live email drafts (Supply Co.).
8. **Shipping rate engine** — replace flat $12 placeholder in `/checkout` with EasyPost/Shippo.

---

## Rules for Claude

- Read this file at the start of every session.
- Update File Map when files are added; update Pending Work when items ship.
- Prefer `Edit` over rewrites. Run the validation loop before marking work done.
- Keep this file under 300 lines.
