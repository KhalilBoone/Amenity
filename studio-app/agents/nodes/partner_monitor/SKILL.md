# partner_monitor

## Purpose
Daily watcher for SAM.gov apparel/footwear contracts. Drives the bid graph
(partner_monitor → compliance → comms) for Supply Co.

## When to use
- On a daily cron — pull yesterday's opportunities.
- On-demand — backfill (pass `raw_input.days = 30` for a one-off).

## Inputs
```python
{"raw_input": {"days": 1}}   # all keys optional
```

## Outputs
```python
{
  "bid_id":   "uuid",          # row in bids table
  "spec":     {"naics", "psc", "agency", "title", "response_due", "url",
               "required_certifications", "domestic_only"},
  "raw_input": {..., "discovered": int, "scored": int, "sam_payload": dict},
  "status":   "compliance",    # or "closed" if nothing qualifying
}
```

## Side effects
- Inserts new opportunities into `bids` (status='discovered'), idempotent on
  `solicitation`.
- Scores every `discovered` bid, persisting `score` + `score_reasons` and
  flipping to `scored` or `skipped` based on `bid_scoring.SKIP_THRESHOLD`.

## Implementation
- HTTP via `agents/services/sam_gov.py` — wraps the SAM.gov v2 search API
  (`https://api.sam.gov/opportunities/v2/search`). Auth via `SAM_API_KEY`.
- Apparel filter at the API layer: NAICS prefixes 314 / 315 / 316.
- Scoring via `agents/router/bid_scoring.py` — NAICS fit, PSC fit, response
  window, title keywords, Berry capacity in our network.
- Returns the highest-scoring `scored` bid as the next thing the graph should
  work on; if nothing qualifies, returns `status='closed'` and the graph
  terminates cleanly.
