# studio-app — Project Context

## What This Is
Replatform of Amenity onto Supabase + a LangGraph-style multi-agent backend.

Amenity has **two product surfaces** sharing one stack:
- **Studio** — custom manufacturing for clothing brands (RFQ → quote → produce → invoice).
- **Blanks** — e-commerce store selling premium blank apparel B2B (drop-ship Phase 1, private-label Phase 2). Same `orders` table, `order_type` discriminator.
- **Supply Co.** — outbound SAM.gov bidding (separate `bids` flow).

Layers:
- **Frontend** (`frontend/`) — Next.js app, Supabase client, shared TS types.
- **API** (`api/main.py`) — FastAPI gateway. Receives requests from the frontend and from external webhooks (SAM.gov, Stripe, email), invokes the agent graph, returns JSON.
- **Agents** (`agents/`) — LangGraph `StateGraph` of 8 nodes that move an order/bid through its lifecycle. Each node has its own folder with a `*.py` implementation and a `SKILL.md` describing intent.
- **Supabase** (`supabase/schema.sql`) — Postgres schema: orders, manufacturers, products + variants, carts, shipping_addresses, bids, comms, invoices.

This replaces the previous Firebase + ad-hoc Python setup. Only `.env.local` and `.git` survive at the workspace root. Manufacturer data from the old setup is preserved at `supabase/seeds/manufacturers.csv` (305 rows) and is loaded into the new schema by `seeds/load_manufacturers.py`.

---

## Agent Graph

```
        ┌────────┐
        │ intake │  parse user input → structured order
        └───┬────┘
            ▼
       ┌────────────┐
       │ compliance │  Berry / TAA / domestic checks
       └─────┬──────┘
             ▼
        ┌─────────┐
        │ routing │  pick best manufacturer (router/scoring.py)
        └────┬────┘
             ▼
       ┌─────────────┐
       │ fulfillment │  draft PO, kick off production
       └──────┬──────┘
              ▼
           ┌────┐
           │ qa │  inspection checkpoints
           └─┬──┘
             ▼
         ┌───────┐
         │ comms │  client + partner updates (Gmail MCP)
         └───┬───┘
             ▼
        ┌───────────┐
        │ invoicing │  Stripe / NET-30 invoice
        └───────────┘

     partner_monitor ──► runs daily, watches SAM.gov + partner health
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
| `agents/state.py` | `AgentState` TypedDict shared across all nodes |
| `agents/graph.py` | LangGraph `StateGraph` wiring + entry points |
| `agents/router/scoring.py` | Manufacturer scoring (capability, MOQ, certs, lead time) |
| `agents/router/printer.py` | Printer scoring + selection — picks the right decorator for customized order_items |
| `agents/router/bid_scoring.py` | SAM.gov bid scoring — NAICS/PSC fit, response window, Berry capacity, title heuristics |
| `agents/services/sam_gov.py` | SAM.gov Opportunities v2 API client — apparel-filtered search + response normalisation |
| `agents/services/gmail_mcp.py` | Gmail MCP HTTP client — `create_draft` / `send_message`, falls back to synthetic ids if `GMAIL_MCP_URL` unset |
| `Dockerfile` / `fly.toml` / `.dockerignore` | Fly.io deploy config for the API |
| `frontend/vercel.json` | Vercel deploy config for the frontend |
| `DEPLOY.md` | End-to-end deploy walkthrough |
| `.github/workflows/partner-monitor-cron.yml` | Daily cron trigger for partner_monitor |
| `supabase/functions/partner-monitor-cron/` | Optional Supabase Edge Function alternative for cron |
| `supabase/migrations/0001_partner_monitor_cron.sql` | pg_cron schedule for the Edge Function path |
| `agents/runlog.py` | `@run_logged(node)` decorator — every Studio node writes one `agent_runs` row per invocation |
| `agents/nodes/<name>/<name>.py` | One agent node per folder |
| `agents/nodes/<name>/SKILL.md` | Intent, inputs, outputs for that node |
| `api/main.py` | FastAPI app — Studio (`/chat`, `/orders`, `/orders/{id}`, `/studio/rfq`), Blanks (`/products`, `/cart`, `/addresses`, `/checkout`, `/customization/pricing`, `/uploads/artwork[/intent]`), webhooks |
| `api/db.py` | Supabase client factory — `service_client()` (bypasses RLS) and `user_client(jwt)` (per-request, RLS-respecting) |
| `api/auth.py` | `require_user` / `optional_user` deps — pull JWT from `Authorization` header |
| `api/storage.py` | Supabase Storage helpers for the `artwork` bucket — path conventions + signed URLs for printers |
| `api/stripe_client.py` | Stripe SDK wrapper — Checkout sessions + webhook signature verification |
| `agents/nodes/blanks_fulfillment/blanks_fulfillment.py` | Drop-ship PO node — fires from Stripe webhook, drafts one supplier email per order |
| `requirements.txt` | Pinned Python deps |
| `frontend/package.json` / `tsconfig.json` / `tailwind.config.ts` | Next.js 16 + Tailwind scaffold |
| `frontend/app/page.tsx` | Home landing — hero, Blanks-vs-Studio split, services grid |
| `frontend/app/studio/page.tsx` | Studio landing — hero, 3-step "how it works", capabilities, CTA to RFQ |
| `frontend/app/studio/quote/page.tsx` | Studio RFQ form — brand, product, qty, capabilities, certs, notes |
| `frontend/app/studio/quote/[id]/submitted/page.tsx` | RFQ confirmation page |
| `frontend/app/account/orders/page.tsx` | Combined orders list — Blanks + Studio, filterable, with status pills |
| `frontend/app/blanks/page.tsx` | Blanks storefront — hero, category tiles, featured products |
| `frontend/app/blanks/category/[name]/page.tsx` | PLP — server-rendered grid for `tees` / `hoodies` / `sweats` |
| `frontend/app/blanks/[slug]/page.tsx` | PDP — variant picker + stacked Customize/Add-blank CTAs |
| `frontend/app/blanks/[slug]/customize/page.tsx` | Customize page — upload, placement, technique, live price |
| `frontend/app/cart/page.tsx` | Cart — line items, customization summary, address picker, checkout button |
| `frontend/app/orders/[id]/success/page.tsx` | Stripe redirect target — order summary + status polling |
| `frontend/app/sign-in/page.tsx` | Google OAuth sign-in (auth-gates cart + checkout) |
| `frontend/components/SiteHeader.tsx` | Persistent nav — Blanks / Studio / cart count / sign-in/out |
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

## Business Rules (preserved from old CLAUDE.md)

1. Amenity IS the manufacturer to clients — never expose third-party partners.
2. Backend is invisible — no mention of Supabase, Gmail, or Claude in UI.
3. Supply Co. is outbound — we bid on agency contracts; they don't RFQ us.
4. One legal entity, three branded surfaces (Studio + Blanks + Supply Co.).
5. Blanks Phase 1 is drop-ship: supplier ships direct, we never touch inventory. `tracks_inventory=false` on all variants until private-label launches.

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

1. **Deploy** — see `DEPLOY.md`. API → Fly.io, frontend → Vercel, cron via GitHub Actions, DB on Supabase. Configure Google OAuth in Supabase Auth → Providers and the Stripe webhook → Fly.io URL during first deploy.
2. **Run a Gmail MCP server** somewhere reachable from the API (set `GMAIL_MCP_URL` + `GMAIL_MCP_TOKEN`). Until that's live, the email paths log to `comms_log` but produce synthetic ids — no actual Gmail drafts.
3. **Replace the flat $12 shipping placeholder** in `/checkout` with a real rate engine (EasyPost / Shippo) once volume warrants.

---

## Rules for Claude

- Read this file at the start of every session.
- Update File Map when files are added; update Pending Work when items ship.
- Prefer `Edit` over rewrites. Run the validation loop before marking work done.
- Keep this file under 300 lines.
