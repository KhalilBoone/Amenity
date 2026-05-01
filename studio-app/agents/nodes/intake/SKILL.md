# intake

## Purpose
Convert raw client input — a chat message, a quote-form payload, or a SAM.gov
opportunity blob — into a structured `spec` the rest of the graph can route on.

## When to use
First node in the order graph. Always runs.

## Inputs
- `state.raw_input` — dict; either chat transcript + extracted fields, or the
  raw quote-form body.

## Outputs
- `state.spec` — `{capabilities, required_certifications, similar_brands,
  lead_time_weeks, quantity, notes}`
- `state.product_type`, `state.quantity`, `state.target_price`, `state.due_date`
- `state.status` set to `"compliance"`.

## Implementation notes
- Use Claude (`claude-sonnet-4-6`) with a JSON-only response prompt to extract
  fields. Validate with Pydantic before returning.
- If input is ambiguous, leave fields empty rather than guessing — downstream
  nodes will surface the gap.
