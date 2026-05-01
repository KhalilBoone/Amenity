// Supabase Edge Function — partner-monitor-cron
// ----------------------------------------------------------------------
// Invoked daily by pg_cron via the schedule defined in
// supabase/migrations/0001_partner_monitor_cron.sql. POSTs to the
// Amenity API's /webhooks/sam endpoint, which runs the bid graph
// (partner_monitor → compliance → comms).
//
// Required secrets (set with `supabase secrets set ...`):
//   AMENITY_API_URL    e.g. https://api.amenity.studio
//   PARTNER_MONITOR_TOKEN  shared secret the API checks before running
//
// Deploy:
//   supabase functions deploy partner-monitor-cron --no-verify-jwt
//   supabase secrets set AMENITY_API_URL=... PARTNER_MONITOR_TOKEN=...
//   psql $DATABASE_URL -f supabase/migrations/0001_partner_monitor_cron.sql
//
// Manual run:
//   curl -X POST "$SUPABASE_URL/functions/v1/partner-monitor-cron" \
//     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"days": 1}'

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface Body {
  days?: number;
}

Deno.serve(async (req: Request) => {
  const apiUrl = Deno.env.get("AMENITY_API_URL");
  const token  = Deno.env.get("PARTNER_MONITOR_TOKEN");
  if (!apiUrl) {
    return json({ ok: false, error: "AMENITY_API_URL not set" }, 500);
  }

  let body: Body = { days: 1 };
  try {
    if (req.method === "POST") {
      body = (await req.json()) as Body;
    }
  } catch {
    // Empty body is fine — defaults will kick in.
  }

  const t0 = Date.now();
  let resp: Response;
  try {
    resp = await fetch(`${apiUrl}/webhooks/sam`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Cron-Token": token } : {}),
      },
      body: JSON.stringify({
        source: "partner-monitor-cron",
        days: body.days ?? 1,
      }),
    });
  } catch (e) {
    return json({ ok: false, error: `fetch failed: ${e}` }, 502);
  }

  const text = await resp.text();
  return json({
    ok:        resp.ok,
    status:    resp.status,
    duration_ms: Date.now() - t0,
    api_response: safeJson(text),
  }, resp.ok ? 200 : 502);
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
