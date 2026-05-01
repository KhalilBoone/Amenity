# Amenity

Apparel manufacturing platform for modern brands. Three surfaces share
one codebase:

- **Blanks** — premium B2B blank apparel e-commerce. Drop-ship in
  Phase 1; private-label inventory in Phase 2. Per-PDP customization
  flow (logo upload, placement, screen-print / embroidery / DTG).
- **Studio** — full-package custom production. RFQ in, sample out,
  full run, QA, invoice. Driven by a LangGraph multi-agent pipeline.
- **Supply Co.** — outbound federal contract bidding. Daily cron
  pulls SAM.gov apparel opportunities, scores them, surfaces the
  best for human review.

## Architecture at a glance

```
              ┌──────────────────────────────┐
              │  Next.js 16 frontend         │  ← Vercel
              │  (Tailwind, TS, shared types)│
              └──────────────┬───────────────┘
                             │
              ┌──────────────▼───────────────┐
              │  FastAPI                     │  ← Fly.io
              │  + LangGraph agent graph     │
              └──────┬─────────┬─────────────┘
                     │         │
       ┌─────────────┘         └──────────────┐
       ▼                                      ▼
┌──────────────┐                   ┌────────────────────┐
│  Supabase    │                   │  External services │
│  Postgres    │                   │  · Stripe          │
│  Auth (OAuth)│                   │  · Anthropic       │
│  Storage     │                   │  · Gmail MCP       │
└──────────────┘                   │  · SAM.gov v2      │
                                   └────────────────────┘
```

Daily cron: GitHub Actions → POST `/webhooks/sam` → bid graph runs.

## Repo layout

```
api/                  FastAPI gateway + Stripe + storage helpers
agents/               LangGraph nodes, scoring, services
  router/             scoring (manufacturer / printer / bid)
  services/           external API wrappers (SAM.gov, Gmail MCP)
  nodes/              one folder per graph node
frontend/             Next.js 16 app (Blanks shop + Studio + account)
supabase/             schema.sql, seeds, Edge Functions, migrations
.github/workflows/    cron triggers
Dockerfile            API container for Fly.io
fly.toml              Fly.io app config
```

## Local dev — quick start

```bash
# 1. Database
# Apply supabase/schema.sql via the Supabase dashboard SQL editor.
# Then load the three seed files (manufacturers, products, customization_pricing).

# 2. API
cp .env.example .env
# fill in SUPABASE_*, ANTHROPIC_API_KEY, etc.
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# 3. Frontend
cd frontend
cp ../.env.example .env.local
# fill in NEXT_PUBLIC_*
npm install
npm run dev
# → http://localhost:3000
```

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — project context, architecture, business
  rules, agent graph, file map. Read this first when picking up the
  codebase.
- [`DEPLOY.md`](DEPLOY.md) — full deploy walkthrough (Fly.io for the
  API, Vercel for the frontend, Supabase for the DB, GitHub Actions
  for cron).
- [`frontend/README.md`](frontend/README.md) — Next.js dev notes and
  route map.

## Validation

Before commits or PRs:

```bash
# Python
find agents api -name "*.py" -exec python -m py_compile {} \;

# TypeScript (strict mode)
cd frontend && npm run typecheck

# SQL (uses pglast)
python -c "import pglast; \
  [pglast.parse_sql(open(f).read()) for f in ['supabase/schema.sql', \
    'supabase/reset.sql', 'supabase/seeds/manufacturers_seed.sql', \
    'supabase/seeds/products_seed_template.sql', \
    'supabase/seeds/customization_pricing_seed.sql']]"
```

## License

All rights reserved. Internal Amenity codebase.
