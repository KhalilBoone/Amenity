# blanks_fulfillment

Triggered by Stripe `checkout.session.completed` for blanks orders.

## Intent
Forward each paid order to its drop-ship supplier(s) — one email per supplier
with the relevant line items, the buyer's shipping address, and an order
reference. Mark `order_items.fulfillment_status='forwarded'` so the Studio
dashboard reflects state.

## Inputs
```python
{"order_id": "uuid"}
```

## Outputs
```python
{
  "order_id": "uuid",
  "suppliers_emailed": int,      # how many distinct partners we contacted
  "items_forwarded": int,        # how many order_items we marked forwarded
  "drafts": [{"to": "...", "subject": "...", "snippet": "..."}],
  "errors": list[str],
}
```

## Side effects
- One Gmail MCP `create_draft` call per supplier (or `send_message` when
  `BLANKS_AUTO_SEND=1`).
- Updates `order_items.fulfillment_status` and `forwarded_at`.
- Inserts a row into `comms_log` for each draft.

## Failure modes
- Missing supplier email → skip that supplier, list in `errors`, leave
  items as `pending`.
- Gmail MCP unreachable → return error but don't raise — Stripe will
  retry the webhook and we can fire it manually too.
