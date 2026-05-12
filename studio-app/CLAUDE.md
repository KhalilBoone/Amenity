# studio-app — Project Context

## What This Is
Amenity on Supabase + a LangGraph-style agent backend.

Amenity has **two user-facing surfaces** plus one outbound surface:
- **Liai** — AI sourcing agent for fashion / CPG brands. Brief → ranked manufacturer + mill shortlist. The agent runtime lives in a separate `liai` repo; the homepage hosts Liai's chat preview + marketing surface. `/sourcing` 301-redirects to `/`.
- **Shop / Blanks** — e-commerce store selling premium blank apparel B2B (drop-ship Phase 1, private-label Phase 2). Lives under `/shop/*`.
- **Supply Co.** — outbound SAM.gov bidding (backend-only `bids` flow, never user-facing).

Layers:
- **Frontend** (`frontend/`) — Next.js app, Supabase client, shared TS types.
- **API** (`api/main.py`) — FastAPI gateway for the Shop side and webhook receivers (SAM.gov, Stripe).
- **Agents** (`agents/`) — Supply Co. bid graph + Shop drop-ship fulfillment node. The Sourcing Agent itself lives in the separate `liai` project.
- **Supabase** (`supabase/schema.sql`) — Postgres schema: orders, manufacturers, products + variants, carts, shipping_addresses, bids, comms, invoices, agent_runs.

Manufacturer data from the old setup is preserved at `supabase/seeds/manufacturers.csv` (305 rows) and is loaded into the new schema by `seeds/load_manufacturers.py`.

---

## Agent Graph

The Studio (custom manufacturing) graph has been retired. What remains:

```
   build_bid_graph()  — Supply Co.

   partner_monitor ──► compliance ──► comms ──► END
       (SAM.gov          (Berry/TAA)    (Gmail MCP draft)
        watch)

   blanks_fulfillment   — Shop drop-ship PO
       fired directly from /webhooks/stripe; not a graph (single step).
```

---

## File Map

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Postgres DDL — orders, manufacturers, products + variants, shipping_addresses, carts + cart_items, order_items, **artwork_uploads, customization_pricing**, bids, comms, invoices, agent_runs. Storage bucket `artwork` + RLS. |
| `supabase/reset.sql` | One-time destructive reset — drops studio-app tables/enums when applying onto a project with leftover tables from a previous setup |
| `supabase/seeds/load_manufacturers.py` | ETL: `manufacturers.csv` → `manufacturers_seed.sql` |
| `supabase/seeds/manufacturers_seed.sql` | Generated seed (301 manufacturer rows) |
| `supabase/seeds/products_seed_template.sql` | Starter blanks catalog: 6 products × size/color variants for LA Apparel, House of Blanks, AS Colour |
| `supabase/seeds/customization_pricing_seed.sql` | Decoration pricing bands (screen print / embroidery / DTG) — read by the customize page for live pricing |
| `agents/state.py` | `AgentState` TypedDict shared across nodes |
| `agents/graph.py` | LangGraph wiring — only `build_bid_graph()` after Studio sunset |
| `agents/router/printer.py` | Printer scoring + selection — picks the right decorator for customized order_items (Shop) |
| `agents/router/bid_scoring.py` | SAM.gov bid scoring — NAICS/PSC fit, response window, Berry capacity, title heuristics |
| `agents/services/sam_gov.py` | SAM.gov Opportunities v2 API client — apparel-filtered search + response normalisation |
| `agents/services/gmail_mcp.py` | Gmail MCP HTTP client — `create_draft` / `send_message`, falls back to synthetic ids if `GMAIL_MCP_URL` unset |
| `Dockerfile` / `fly.toml` / `.dockerignore` | Fly.io deploy config for the API |
| `frontend/vercel.json` | Vercel deploy config for the frontend |
| `DEPLOY.md` | End-to-end deploy walkthrough |
| `.github/workflows/partner-monitor-cron.yml` | Daily cron trigger for partner_monitor |
| `supabase/functions/partner-monitor-cron/` | Optional Supabase Edge Function alternative for cron |
| `supabase/migrations/0001_partner_monitor_cron.sql` | pg_cron schedule for the Edge Function path |
| `agents/runlog.py` | `@run_logged(node)` decorator — every node writes one `agent_runs` row per invocation |
| `agents/nodes/<name>/<name>.py` | One agent node per folder. Remaining: `blanks_fulfillment`, `comms`, `compliance`, `partner_monitor` |
| `agents/nodes/<name>/SKILL.md` | Intent, inputs, outputs for that node |
| `api/main.py` | FastAPI app — Orders read (`GET /orders`, `GET /orders/{id}`), Shop (`/products`, `/cart`, `/addresses`, `/checkout`, `/customization/pricing`, `/uploads/artwork[/intent]`), webhooks (`/webhooks/sam`, `/webhooks/stripe`) |
| `api/db.py` | Supabase client factory — `service_client()` (bypasses RLS) and `user_client(jwt)` (per-request, RLS-respecting) |
| `api/auth.py` | `require_user` / `optional_user` deps — pull JWT from `Authorization` header |
| `api/storage.py` | Supabase Storage helpers for the `artwork` bucket — path conventions + signed URLs for printers |
| `api/stripe_client.py` | Stripe SDK wrapper — Checkout sessions + webhook signature verification |
| `agents/nodes/blanks_fulfillment/blanks_fulfillment.py` | Drop-ship PO node — fires from Stripe webhook, drafts one supplier email per order |
| `requirements.txt` | Pinned Python deps |
| `frontend/package.json` / `tsconfig.json` / `tailwind.config.ts` | Next.js 16 + Tailwind scaffold |
| `frontend/app/page.tsx` | Home landing — olive anchor hero (marquee product columns) + Liai chat preview + Featured Manufacturers grid (4 rows from Supabase) + 3-step how-it-works + Individual/Wholesale shop CTAs |
| `frontend/app/shop/page.tsx` | Shop umbrella — Featured Products + Top Sellers (6-up product grids reading `/products` with placeholders) + Cart/Orders quick links |
| `frontend/app/shop/orders/page.tsx` | Orders list (Shop orders, with status pills) |
| `frontend/app/shop/blanks/page.tsx` | Blanks storefront — hero, category tiles, featured products |
| `frontend/app/shop/blanks/category/[name]/page.tsx` | PLP — server-rendered grid for `tees` / `hoodies` / `sweats` |
| `frontend/app/shop/blanks/[slug]/page.tsx` | PDP — variant picker + stacked Customize/Add-blank CTAs |
| `frontend/app/shop/blanks/[slug]/customize/page.tsx` | Customize page — upload, placement, technique, live price |
| `frontend/app/shop/cart/page.tsx` | Cart — line items, customization summary, address picker, checkout button |
| `frontend/app/orders/[id]/success/page.tsx` | Stripe redirect target — order summary + status polling |
| `frontend/app/sign-in/page.tsx` | Google OAuth sign-in (auth-gates cart + checkout) |
| `frontend/next.config.mjs` | Next config; permanent 301 redirects: old `/blanks`, `/cart`, `/account/orders` → `/shop/*`, and `/sourcing` → `/` (folded into homepage) |
| `frontend/components/SiteHeader.tsx` | Persistent nav — Shop / cart count / sign-in/out (Sourcing nav removed; the homepage IS Liai's surface) |
| `frontend/components/PlacementPicker.tsx` | Mannequin SVG with selectable placement hotspots |
| `frontend/lib/api.ts` | Authenticated fetch wrapper used by all pages |
| `frontend/lib/pricing.ts` | Customization price calculator (band lookup + total) |
| `frontend/lib/supabase.ts` | Supabase JS client init |
| `frontend/types/index.ts` | Shared TS types matching SQL schema |
| `.env.example` | All env vars required to run the stack |

---

## Tech Stack

- **DB**: Supabase (Postgres + Auth + Storage)
- **Agents**: LangGraph + Anthropic SDK (`claude-sonnet-4-6`)
- **API**: FastAPI (Python 3.11+)
- **Frontend**: Next.js 16 + Tailwind, Supabase JS client
- **Email**: Gmail MCP (`create_draft`, `send_message`)
- **Gov contracts**: SAM.gov Opportunities API v2 (driven by `partner_monitor` node)
- **Hosting**: Vercel (frontend), Fly.io (api), Supabase (db). Cron via GitHub Actions. See `DEPLOY.md`.

---

## Business Rules

1. Backend is invisible — no mention of Supabase, Gmail, or Claude in UI.
2. Supply Co. is outbound — we bid on agency contracts; they don't RFQ us.
3. The Sourcing Agent itself lives in the separate `liai` project; this app only hosts the marketing surface and waitlist form at `/sourcing`. Studio (custom manufacturing) was retired.
4. Shop / Blanks Phase 1 is drop-ship: supplier ships direct, we never touch inventory. `tracks_inventory=false` on all variants until private-label launches.
5. Studio-flavoured columns (`product_type`, `quantity`, `target_price`, `due_date`, `qa_results`, `manufacturer_id` on orders; the `bids → studio` linkage; the `invoices` table) remain in the schema for historical orders but no code path creates new Studio rows.

---

## Validation Loop

```bash
# Python syntax
find agents api -name "*.py" -exec python -m py_compile {} \;

# TypeScript
cd frontend && npx tsc --noEmit

# SQL
# (apply via supabase CLI: supabase db reset --local)

# CLAUDE.md size
wc -l CLAUDE.md   # must stay under 300
```

---

## Pending Work

1. **Wire `/sourcing` waitlist form** to a real backend (Loops / Resend / Mailchimp). Currently the submit handler just simulates a 600 ms delay and shows the success state.
2. **Hook the Sourcing Agent itself** — when the `liai` runtime is reachable, decide whether `/sourcing` embeds a chat surface, deep-links to a separate app, or stays as a waitlist landing.
3. **Deploy** — see `DEPLOY.md`. API → Fly.io, frontend → Vercel, cron via GitHub Actions, DB on Supabase. Configure Google OAuth in Supabase Auth → Providers and the Stripe webhook → Fly.io URL during first deploy.
4. **Run a Gmail MCP server** somewhere reachable from the API (set `GMAIL_MCP_URL` + `GMAIL_MCP_TOKEN`). Until that's live, the email paths log to `comms_log` but produce synthetic ids — no actual Gmail drafts.
5. **Replace the flat $12 shipping placeholder** in `/checkout` with a real rate engine (EasyPost / Shippo) once volume warrants.
6. **Drop dormant Studio columns** from `orders` (and the `invoices` table) once historical rows are exported or deemed expendable. Currently they sit unused but the schema still references them.

---

## Rules for Claude

- Read this file at the start of every session.
- Update File Map when files are added; update Pending Work when items ship.
- Prefer `Edit` over rewrites. Run the validation loop before marking work done.
- Keep this file under 300 lines.
