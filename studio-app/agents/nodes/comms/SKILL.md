# comms

## Purpose
Single chokepoint for outbound messaging — clients, partners, ops, government
agencies. Every message is logged to `comms_log`.

## When to use
After QA passes (orders), after bid is drafted (Supply Co.), or any time a
human needs to be looped in.

## Inputs
- Full `state` — branch on `status` / presence of `bid_id` to pick template.

## Outputs
- `state.last_comm_id` — UUID of the `comms_log` row.
- `state.status` advanced to the next stage.

## Implementation notes
- All copy goes through the Amenity-IS-the-manufacturer brand rule. Never
  reveal partner names to clients.
- Default to `create_draft` for first-touch external comms; `send_message`
  only for templated notifications (shipping confirmations, etc.).
