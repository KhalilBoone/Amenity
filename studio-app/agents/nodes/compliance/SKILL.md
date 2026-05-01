# compliance

## Purpose
Gate every order/bid through compliance rules — Berry Amendment, TAA, domestic
sourcing, agency-specific NAICS/PSC requirements — before routing.

## When to use
Runs after `intake` (orders) or after `partner_monitor` (bids).

## Inputs
- `state.spec` — needs `required_certifications`, `domestic_only`.
- For bids: `state.raw_input` should include `naics`, `psc`, agency.

## Outputs
- `state.compliance` — `{berry_required, taa_required, domestic_only, notes, blocking}`
- `state.status` — `"routing"` if clean, `"cancelled"` if `blocking`.

## Implementation notes
- Hard-block only when a requirement cannot be met by any partner in the DB
  (e.g. order needs Berry but zero Berry-compliant manufacturers exist).
- Soft warnings go in `notes` and surface in the comms node.
