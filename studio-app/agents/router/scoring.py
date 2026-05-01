"""Manufacturer scoring for the routing node.

`score_manufacturer(spec, manufacturer)` returns a 0–100 score plus reasons.
The routing node calls this for every candidate and picks the highest.

Weights are intentionally simple — tune by editing WEIGHTS.
"""
from __future__ import annotations

from typing import Any


WEIGHTS = {
    "capability_match": 40,   # does the partner do what the order needs?
    "moq_fit":          15,   # is order quantity within their MOQ?
    "lead_time":        15,   # can they hit the due date?
    "certifications":   15,   # Berry / TAA / domestic
    "brand_history":    10,   # have they made similar brands before?
    "domestic":          5,
}


def score_manufacturer(spec: dict[str, Any], m: dict[str, Any]) -> tuple[float, list[str]]:
    """Return (score, reasons). Score is clamped to [0, 100]."""
    reasons: list[str] = []
    score = 0.0

    # --- capability match ---
    needs = set(spec.get("capabilities", []))
    has = set(m.get("capabilities", []))
    if needs:
        overlap = len(needs & has) / len(needs)
        pts = WEIGHTS["capability_match"] * overlap
        score += pts
        reasons.append(f"capability match {overlap:.0%} (+{pts:.0f})")

    # --- MOQ fit ---
    qty = spec.get("quantity") or 0
    moq = m.get("moq") or 0
    if qty and moq and qty >= moq:
        score += WEIGHTS["moq_fit"]
        reasons.append(f"qty {qty} >= MOQ {moq} (+{WEIGHTS['moq_fit']})")
    elif qty and moq:
        reasons.append(f"qty {qty} below MOQ {moq} (+0)")

    # --- lead time ---
    needed_weeks = spec.get("lead_time_weeks")
    partner_weeks = m.get("lead_time_weeks")
    if needed_weeks and partner_weeks and partner_weeks <= needed_weeks:
        score += WEIGHTS["lead_time"]
        reasons.append(f"lead time {partner_weeks}w fits (+{WEIGHTS['lead_time']})")

    # --- certifications ---
    required_certs = set(spec.get("required_certifications", []))
    has_certs = set(m.get("certifications", []))
    if required_certs:
        if required_certs.issubset(has_certs):
            score += WEIGHTS["certifications"]
            reasons.append(f"all required certs (+{WEIGHTS['certifications']})")
        else:
            missing = required_certs - has_certs
            reasons.append(f"missing certs {sorted(missing)} (+0)")

    # --- brand history ---
    target_brands = set(spec.get("similar_brands", []))
    partner_brands = set(m.get("brands", []))
    if target_brands and target_brands & partner_brands:
        score += WEIGHTS["brand_history"]
        reasons.append(f"prior brand work (+{WEIGHTS['brand_history']})")

    # --- domestic ---
    if m.get("domestic", False):
        score += WEIGHTS["domestic"]
        reasons.append(f"domestic (+{WEIGHTS['domestic']})")

    return max(0.0, min(100.0, score)), reasons


def rank(spec: dict[str, Any], manufacturers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Score every manufacturer, return list sorted high→low with score+reasons attached."""
    scored = []
    for m in manufacturers:
        s, r = score_manufacturer(spec, m)
        scored.append({**m, "score": s, "reasons": r})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
