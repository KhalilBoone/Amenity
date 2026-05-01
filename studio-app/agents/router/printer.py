"""Printer routing for customized Blanks orders.

Customization (`order_items.customization is not null`) means the order needs
to leg through a decorator before reaching the buyer:

    supplier ──ships blanks──► printer ──decorates + ships──► buyer

This module picks the printer. The supplier was chosen at product time
(``products.supplier_id``) — we don't re-pick it here.

Scoring is intentionally minimal: technique match dominates, then locality
(domestic vs. not), then MOQ fit. Tune ``WEIGHTS`` to retune.
"""
from __future__ import annotations

from typing import Any

from api.db import service_client


# Map our internal technique slugs to the capability tags carried in the
# manufacturers table. Add to this map whenever the load_manufacturers ETL
# learns a new tag.
TECHNIQUE_CAPABILITY = {
    "screen_print": "screen_print",
    "embroidery":   "embroidery",
    "dtg":          "screen_print",   # most printers do DTG on the same line
}


WEIGHTS = {
    "technique_match": 60,
    "domestic":        20,
    "moq_fit":         15,
    "brand_history":    5,
}


def score_printer(
    technique: str,
    quantity: int,
    buyer_country: str | None,
    p: dict[str, Any],
) -> tuple[float, list[str]]:
    """Return (score, reasons). Score is clamped to [0, 100]."""
    reasons: list[str] = []
    score = 0.0

    cap_tag = TECHNIQUE_CAPABILITY.get(technique, technique)
    has = set(p.get("capabilities") or [])

    # ---- technique match (gate) -------------------------------------
    if cap_tag in has:
        score += WEIGHTS["technique_match"]
        reasons.append(f"does {technique} (+{WEIGHTS['technique_match']})")
    else:
        reasons.append(f"missing {cap_tag} capability (+0)")
        return 0.0, reasons  # disqualify — can't run this technique

    # ---- domestic match ---------------------------------------------
    if buyer_country and buyer_country.upper() in {"US", "USA", "UNITED STATES"}:
        if p.get("domestic"):
            score += WEIGHTS["domestic"]
            reasons.append(f"domestic match (+{WEIGHTS['domestic']})")
    elif p.get("domestic"):
        # Buyer non-US, printer is US — still fine but not weighted.
        pass

    # ---- MOQ fit ----------------------------------------------------
    moq = p.get("moq") or 0
    if quantity and (not moq or quantity >= moq):
        score += WEIGHTS["moq_fit"]
        reasons.append(f"qty {quantity} clears MOQ {moq or 'n/a'} (+{WEIGHTS['moq_fit']})")
    elif quantity and moq:
        reasons.append(f"qty {quantity} below MOQ {moq} (+0)")

    # ---- brand history bonus ----------------------------------------
    if p.get("brands"):
        score += WEIGHTS["brand_history"]
        reasons.append(f"prior brand work (+{WEIGHTS['brand_history']})")

    return max(0.0, min(100.0, score)), reasons


def pick_printer(
    technique: str,
    quantity: int,
    buyer_country: str | None = "US",
) -> dict[str, Any] | None:
    """Return the best-scoring printer row, or None if no qualifier exists.

    The returned dict carries an extra ``score`` and ``reasons`` for audit.
    """
    db = service_client()

    # Filter narrowly at the DB level — every other partner role is not a
    # candidate.
    rows = (
        db.table("manufacturers")
        .select("*")
        .eq("role", "printer")
        .execute()
        .data
        or []
    )
    if not rows:
        return None

    scored: list[dict[str, Any]] = []
    for p in rows:
        s, r = score_printer(technique, quantity, buyer_country, p)
        if s <= 0:
            continue   # disqualified
        scored.append({**p, "score": s, "reasons": r})

    if not scored:
        return None
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[0]
