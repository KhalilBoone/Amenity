# Deployment

Two halves of the stack ship to two hosts. Pick one of each and follow
the steps in order.

```
                     ┌──────────────────────────┐
                     │  Vercel  ──  frontend/   │
                     └──────────────┬───────────┘
                                    │  fetch
                                    ▼
                     ┌──────────────────────────┐
                     │  Fly.io  ──  api/        │  ← FastAPI + LangGraph
                     └──────────────┬───────────┘
                                    │
                                    ▼
                     ┌──────────────────────────┐
                     │  Supabase                │  ← Postgres + Auth + Storage
                     └──────────────────────────┘

GitHub Actions (cron) ─POST─► Fly.io /webhooks/sam   (daily)
Stripe (Checkout)    ─POST─► Fly.io /webhooks/stripe
```

---

## API → Fly.io

The API ships as a Docker image. The repo root has `Dockerfile`,
`fly.toml`, and `.dockerignore`. The image is intentionally small
(Python 3.11-slim, ~200MB final).

### One-time setup

1. **Install the CLI** (skip if you already have it):

   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth signup        # or `fly auth login` if you have an account
   ```

2. **Create the app and copy the config in:**

   ```bash
   fly launch --no-deploy --copy-config --name amenity-api
   ```

   Pick `iad` (Washington DC) as the region — it's the closest to
   Supabase's US-East primary. Decline when it asks about a Postgres
   or Redis cluster (you have Supabase).

3. **Set secrets** (one command, all at once — Fly.io stores them
   encrypted, mounts them as env vars):

   ```bash
   fly secrets set \
     SUPABASE_URL="https://YOUR-PROJECT.supabase.co" \
     SUPABASE_SERVICE_ROLE_KEY="..." \
     SUPABASE_ANON_KEY="..." \
     SUPABASE_JWT_SECRET="..." \
     ANTHROPIC_API_KEY="..." \
     STRIPE_SECRET_KEY="..." \
     STRIPE_WEBHOOK_SECRET="placeholder-set-after-step-5" \
     SAM_API_KEY="..." \
     PARTNER_MONITOR_TOKEN="$(openssl rand -hex 32)" \
     AMENITY_OPS_EMAIL="ops@amenity.studio" \
     API_CORS_ORIGINS="placeholder-set-after-vercel-deploys"
   ```

   The Supabase keys come from Supabase → Settings → API. The Stripe
   keys come from Stripe → Developers → API keys. Anthropic from
   console.anthropic.com. SAM.gov from sam.gov → Account → API Keys.

4. **Deploy**:

   ```bash
   fly deploy
   ```

   First deploy takes 2–3 minutes (build + push + boot). Subsequent
   deploys are ~30 seconds. The output ends with your public URL,
   typically `https://amenity-api.fly.dev`. Save that — that's your
   `AMENITY_API_URL` everywhere else.

5. **Smoke-test it**:

   ```bash
   curl https://amenity-api.fly.dev/health
   # {"ok":true}
   ```

6. **Configure the Stripe webhook**: Stripe → Developers → Webhooks →
   Add endpoint, URL `https://amenity-api.fly.dev/webhooks/stripe`,
   listen for `checkout.session.completed`. Copy the signing secret.
   Update Fly:

   ```bash
   fly secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

   This automatically restarts the machine with the new value.

### Updates

```bash
fly deploy
```

That's the whole loop. Roll back via `fly releases list` →
`fly releases rollback <version>`.

### Logs + status

```bash
fly logs                    # tail
fly status                  # which machines, where, healthy?
fly ssh console             # shell into a running machine
fly secrets list            # without values
fly scale show              # current sizing
```

### Cost

- Default config uses one shared-CPU 512MB machine.
- `auto_stop_machines = "stop"` in `fly.toml` means the machine sleeps
  when idle and wakes on first request (~1s cold start).
- Real bill at low traffic: ~$2–4/mo on hobby usage. The free tier
  covers up to 3 small VMs across an account, so this often runs free.

---

## Frontend → Vercel

Next.js 16 → Vercel. Zero-config besides env vars; Vercel detects
everything via `frontend/vercel.json`.

### One-time setup

1. **New project on Vercel**: <https://vercel.com> → Add New → Project →
   pick the studio-app repo.

2. **Root directory**: `frontend/`. Vercel will auto-detect Next.js.

3. **Environment variables** (Settings → Environment Variables —
   add for Production, Preview, and Development):

   | Variable                          | Value                            |
   |-----------------------------------|----------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`        | same as `SUPABASE_URL` on Fly.io |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | same as `SUPABASE_ANON_KEY`      |
   | `NEXT_PUBLIC_API_URL`             | your Fly.io URL (no trailing /)  |

4. **Deploy**. First deploy takes a minute. Note the production URL
   (e.g. `amenity-studio.vercel.app`).

5. **Update CORS on Fly.io** to include the Vercel URL:

   ```bash
   fly secrets set \
     API_CORS_ORIGINS="https://amenity-studio.vercel.app,https://amenity.studio"
   ```

6. **Wire your custom domain** (optional but recommended) under
   Settings → Domains. Add the apex domain to `API_CORS_ORIGINS` too.

7. **Enable Google OAuth in Supabase**: Authentication → Providers →
   Google. You need a Google Cloud OAuth client (APIs & Services →
   Credentials → Create OAuth client ID → Web application). Add
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback` as an
   authorized redirect URI in Google. Paste the client ID + secret
   into Supabase. Then in Supabase Auth → URL Configuration, set
   Site URL to your production frontend URL.

### Updates

Push to `main` → Vercel deploys. Pull request previews are automatic
and get their own throwaway URLs.

---

## Database → Supabase

You already applied the schema. For new environments:

```
1. Paste supabase/reset.sql      → Run    (only on existing DBs with leftover tables)
2. Paste supabase/schema.sql     → Run
3. Paste supabase/seeds/manufacturers_seed.sql      → Run
4. Paste supabase/seeds/products_seed_template.sql  → Run
5. Paste supabase/seeds/customization_pricing_seed.sql → Run
```

Storage bucket `artwork` is created by `schema.sql`; nothing else
needed there.

---

## Cron — GitHub Actions

Already wired in `.github/workflows/partner-monitor-cron.yml`. After
the API is on Fly.io and you've set repo secrets:

- `AMENITY_API_URL` = your Fly.io URL (e.g. `https://amenity-api.fly.dev`)
- `PARTNER_MONITOR_TOKEN` = same value you set on Fly.io

The cron runs daily at 13:00 UTC. Manual run: Actions tab →
`partner-monitor-cron` → "Run workflow."

---

## Smoke test (full stack, end-to-end)

1. `curl https://amenity-api.fly.dev/health` → `{"ok": true}`
2. Open the Vercel URL → home page renders.
3. Sign in with Google.
4. Add a blank tee to the cart from `/blanks/...`.
5. Try a customized variant via the customize page.
6. Checkout (use Stripe test card `4242 4242 4242 4242`).
7. Confirm Stripe webhook fired (Fly logs → `webhooks.stripe`).
8. Confirm `order_items.fulfillment_status='forwarded'` for the line(s).
9. Trigger partner-monitor manually from GitHub Actions.
10. Confirm one row landed in Supabase `agent_runs` with
    `node = 'partner_monitor'`.

---

## Troubleshooting

**Vercel page can't talk to the API.** Check `API_CORS_ORIGINS` on
Fly.io includes your exact Vercel URL (no trailing slash). Run
`fly logs` and watch for the failed request — you'll see CORS preflight
hits before the actual call.

**Stripe webhook returns 400.** `STRIPE_WEBHOOK_SECRET` doesn't match
the one Stripe generated for this endpoint. Re-copy it from Stripe →
Webhooks → your endpoint → "Reveal" → paste into
`fly secrets set STRIPE_WEBHOOK_SECRET=...`.

**Cold start is too slow.** Edit `fly.toml` and change
`min_machines_running = 0` to `1`. Costs ~$2/mo more, eliminates the
first-request 1s wait.

**OOM kills.** Check `fly logs` — if you see "OOMKilled," bump
`memory` in `fly.toml` from `512mb` to `1024mb` and re-deploy.

**Google sign-in redirects to localhost.** Supabase Auth → URL
Configuration → Site URL is still `http://localhost:3000`. Change to
your Vercel production URL.
