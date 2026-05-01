# qa

## Purpose
Run quality checkpoints on production output. Pass → comms. Fail → loop back
to fulfillment for rework.

## When to use
After `fulfillment` reports the run is complete.

## Inputs
- `state.po_number`, `state.spec` (acceptance criteria).
- Inspection artifacts (photos, measurements, defect log) — fetched in-node.

## Outputs
- `state.qa_results` — `{checkpoints[], defect_rate, photos_received}`.
- `state.qa_passed` — bool.
- `state.status` — `"comms"` if passed, `"fulfillment"` if failed.

## Implementation notes
- Default-pass behavior is a placeholder — replace with real checks before any
  invoice goes out.
- Cap rework loops at 2 retries, then escalate via comms node.
