# routing

## Purpose
Pick the best manufacturer for an order from the Supabase `manufacturers`
table, using `agents/router/scoring.py`.

## When to use
After `compliance` passes. Skipped for bids.

## Inputs
- `state.spec` — capability needs, MOQ, lead time, certs, similar brands.

## Outputs
- `state.candidates` — top 5 ranked partners with `{score, reasons, ...}`.
- `state.manufacturer_id` — winner.
- `state.routing_score`, `state.routing_reasons`.

## Implementation notes
- Pre-filter at the SQL layer: `domestic = true`, capability overlap > 0,
  Berry-compliant if required. Then score in Python.
- Ties broken by lowest MOQ then shortest lead time.
- Persist the candidates blob to `orders.routing_reasons` for auditability.
