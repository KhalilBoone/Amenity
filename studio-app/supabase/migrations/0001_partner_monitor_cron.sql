-- partner_monitor cron schedule
-- ----------------------------------------------------------------
-- Runs the partner-monitor-cron Edge Function once a day at 13:00 UTC
-- (08:00 ET). Uses pg_cron + pg_net (both available on Supabase).
--
-- Apply once after deploying the function:
--   supabase functions deploy partner-monitor-cron --no-verify-jwt
--   psql $DATABASE_URL -f supabase/migrations/0001_partner_monitor_cron.sql
--
-- Re-running this file is safe: schedules with the same name are
-- replaced via cron.unschedule + cron.schedule.
-- ================================================================

-- Required extensions. Both are pre-installed on every Supabase project,
-- but we 'create extension if not exists' for completeness.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Drop any prior schedule with the same name so this file is idempotent.
do $$
begin
  perform cron.unschedule('partner-monitor-daily');
exception when others then
  null;
end $$;

-- Schedule: 13:00 UTC every day (08:00 ET / 06:00 PT). Adjust to taste.
-- ``net.http_post`` from pg_net invokes the edge function asynchronously;
-- it queues the request and returns immediately, so cron is non-blocking.
select cron.schedule(
  'partner-monitor-daily',
  '0 13 * * *',
  $cron$
    select net.http_post(
      url     := current_setting('app.functions_url') || '/partner-monitor-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.anon_key'),
        'Content-Type',  'application/json'
      ),
      body    := jsonb_build_object('days', 1)
    );
  $cron$
);

-- ----------------------------------------------------------------
-- One-time setup of the GUCs the schedule reads.
-- These are project-scoped settings; replace with your actual values
-- before applying. They live in the Supabase dashboard at
--   Project Settings → Database → Custom config (or via psql ALTER DATABASE).
-- ----------------------------------------------------------------
-- Example (run once, replace with your values):
--   alter database postgres set app.functions_url = 'https://YOUR-PROJECT.functions.supabase.co';
--   alter database postgres set app.anon_key       = 'YOUR_SUPABASE_ANON_KEY';
