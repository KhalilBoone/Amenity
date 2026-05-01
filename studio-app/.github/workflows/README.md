# GitHub Actions — Amenity workflows

## partner-monitor-cron

Daily SAM.gov sweep + scoring. Posts to `/webhooks/sam` on the deployed
API; the API runs the bid graph (`partner_monitor → compliance → comms`).

### One-time setup

1. **Set repo secrets** (Settings → Secrets and variables → Actions → New
   repository secret):

   | Secret                   | Value                                       |
   |--------------------------|---------------------------------------------|
   | `AMENITY_API_URL`        | e.g. `https://api.amenity.studio`           |
   | `PARTNER_MONITOR_TOKEN`  | shared secret the API checks                |

   The API does not currently enforce `PARTNER_MONITOR_TOKEN` — that's a
   small follow-up: have `/webhooks/sam` reject requests whose
   `X-Cron-Token` header doesn't match the env var. Until then the
   header is harmless to include.

2. **Confirm the schedule** in `partner-monitor-cron.yml`:

   ```yaml
   on:
     schedule:
       - cron: "0 13 * * *"   # 13:00 UTC daily
   ```

   GitHub cron uses UTC. 13:00 UTC = 08:00 ET / 06:00 PT in winter,
   09:00 ET / 06:00 PT in summer. Edit if you want a different window.

3. **Enable workflows** if your repo is forked or new — Actions →
   "I understand my workflows, go ahead and enable them."

### Manual run

Actions tab → `partner-monitor-cron` → "Run workflow." There's an
optional `days` input that overrides the lookback window for backfills.

### Observability

Each run shows:

- the HTTP status it got back from `/webhooks/sam`
- the JSON response (which includes `discovered`, `scored`, and the
  `next_bid` if one qualifies)
- any error string

For deeper debugging, check the API's `agent_runs` table — every
`partner_monitor_node` invocation lands one row there with full input,
output, duration, and error if any.

### Rollback

Disable the workflow without deleting the file:

```
Actions → partner-monitor-cron → ⋯ menu → "Disable workflow"
```

Re-enable from the same menu.

---

## Alternative: Supabase Edge Function + pg_cron

The repo also includes `supabase/functions/partner-monitor-cron/` and
`supabase/migrations/0001_partner_monitor_cron.sql` for a pg_cron-driven
version that runs from inside Supabase. It's strictly an alternative —
pick one or the other, not both, or the same job will fire twice a day.

When to consider switching:
- You want cron and data in the same observability plane.
- You add many more scheduled jobs and want them all under one roof.
- You move off GitHub Actions for some reason.
