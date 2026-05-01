# invoicing

## Purpose
Final node in the order graph — issue the invoice and close the order.

## When to use
After comms confirms the client has been notified of shipment.

## Inputs
- `state.order_id`, `state.quantity`, `state.target_price` (or computed total).

## Outputs
- `state.invoice_id` — Stripe invoice ID.
- `state.invoice_amount`.
- `state.status = "closed"`.

## Implementation notes
- Default terms: NET-30 for repeat clients, prepay for first-time orders.
- Stripe webhook (`/webhooks/stripe`) flips `invoices.paid_at` and `orders.status` → `closed` on payment.
