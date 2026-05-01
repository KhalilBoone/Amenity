# fulfillment

## Purpose
Open a purchase order with the routed manufacturer and kick off production.

## When to use
After `routing` selects a winner.

## Inputs
- `state.manufacturer_id`, `state.spec`, `state.quantity`, `state.target_price`,
  `state.due_date`.

## Outputs
- `state.po_number` — generated PO ID, also persisted on the `orders` row.
- `state.fulfillment_notes` — brief log of what was done.
- `state.status = "qa"`.

## Implementation notes
- Draft the partner email via Gmail MCP `create_draft` (do not auto-send) so a
  human can review before production starts on big orders.
- Cap auto-send at orders under a configurable dollar threshold.
- The QA node may loop back here — make this idempotent on `po_number`.
