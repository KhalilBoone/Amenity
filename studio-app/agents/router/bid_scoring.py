"""Bid scoring for SAM.gov opportunities.

Returns a 0–100 score plus reasons. Below ``SKIP_THRESHOLD`` we mark
the bid ``skipped`` and don't surface it to operators; above it the bid
flows into the comms node for human review and proposal drafting.

Scoring axes:

* **NAICS fit** — exact match on Amenity-strong codes scores high; merely
  in-family scores moderate.
* **PSC fit** — same idea against clothing PSC.
* **Response window** — favour bids with ≥ 14 days to respond. Anything
  under 7 is borderline.
* **Berry implication** — most clothing federal bids require Berry. Score
  up if our network has Berry-compliant capacity, score down otherwise.
* **Title heuristic** — keywords like "uniform", "tee", "jacket", etc.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any


SKIP_THRESHOLD = 35

# NAICS codes Amenity is unusually well-positioned for. Exact match → +25.
PRIMARY_NAICS = {
    "315210",   # cut and sew apparel contractors
    "315220",   # men's and boys' cut and sew (excl. underwear and nightwear)
    "315240",   # women's, girls' and infants' cut and sew
    "315250",   # outerwear cut and sew (jackets, coats, parkas)
    "315990",   # other apparel knitting mills
}

# In-family NAICS (still apparel/textile but not core). Family match → +12.
FAMILY_NAICS = {"315", "314", "316"}

PRIMARY_PSC = {"8405", "8410", "8415"}             # outerwear + men's + women's
FAMILY_PSC  = {"8420", "8430", "8435", "8440", "8445"}

TITLE_KEYWORDS_POS = re.compile(
    r"\b(tee|t-shirt|shirt|polo|hoodie|sweatshirt|jacket|coat|uniform|"
    r"trouser|pant|short|jersey|cap|hat|outerwear|fleece|knit)\b",
    re.IGNORECASE,
)
TITLE_KEYWORDS_NEG = re.compile(
    r"\b(footwear|boot|shoe|cleaning|laundry|alteration|repair|rental)\b",
    re.IGNORECASE,
)


WEIGHTS = {
    "naics_primary":    25,
    "naics_family":     12,
    "psc_primary":      15,
    "psc_family":        7,
    "response_ample":   15,    # ≥14 days
    "response_tight":    5,    # 7–13 days
    "title_positive":   10,
    "title_negative":  -10,
    "berry_compliant":  15,    # we have Berry partners → +15
    "berry_required_no_capacity": -20,
}


def _days_to_due(response_due: str | None) -> int | None:
    if not response_due:
        return None
    try:
        # SAM.gov returns ISO 8601 with offset, e.g. '2025-10-15T15:00:00-04:00'.
        due = datetime.fromisoformat(response_due.replace("Z", "+00:00"))
        delta = due - datetime.now(timezone.utc)
        return int(delta.total_seconds() // 86400)
    except Exception:
        return None


def score_bid(
    bid: dict[str, Any],
    *,
    have_berry_capacity: bool = True,
) -> tuple[float, list[str]]:
    """Return (score, reasons). ``bid`` is in the bids-table shape."""
    reasons: list[str] = []
    score = 0.0

    naics = (bid.get("naics") or "").strip()
    psc   = (bid.get("psc")   or "").strip()
    title = bid.get("title")  or ""

    # ---- NAICS ------------------------------------------------------
    if naics in PRIMARY_NAICS:
        score += WEIGHTS["naics_primary"]
        reasons.append(f"NAICS {naics} primary fit (+{WEIGHTS['naics_primary']})")
    elif naics[:3] in FAMILY_NAICS:
        score += WEIGHTS["naics_family"]
        reasons.append(f"NAICS {naics} family fit (+{WEIGHTS['naics_family']})")
    else:
        reasons.append(f"NAICS {naics or '—'} not apparel (+0)")

    # ---- PSC --------------------------------------------------------
    if psc in PRIMARY_PSC:
        score += WEIGHTS["psc_primary"]
        reasons.append(f"PSC {psc} primary fit (+{WEIGHTS['psc_primary']})")
    elif psc in FAMILY_PSC:
        score += WEIGHTS["psc_family"]
        reasons.append(f"PSC {psc} family fit (+{WEIGHTS['psc_family']})")

    # ---- Response window -------------------------------------------
    days = _days_to_due(bid.get("response_due"))
    if days is None:
        reasons.append("response window unknown (+0)")
    elif days >= 14:
        score += WEIGHTS["response_ample"]
        reasons.append(f"{days}d to respond, ample (+{WEIGHTS['response_ample']})")
    elif days >= 7:
        score += WEIGHTS["response_tight"]
        reasons.append(f"{days}d to respond, tight (+{WEIGHTS['response_tight']})")
    else:
        reasons.append(f"{days}d to respond, too tight (+0)")

    # ---- Title heuristic -------------------------------------------
    if TITLE_KEYWORDS_POS.search(title):
        score += WEIGHTS["title_positive"]
        reasons.append(f"title keyword fit (+{WEIGHTS['title_positive']})")
    if TITLE_KEYWORDS_NEG.search(title):
        score += WEIGHTS["title_negative"]
        reasons.append(f"title keyword penalty ({WEIGHTS['title_negative']})")

    # ---- Berry capacity --------------------------------------------
    # Most apparel federal bids require Berry. If we don't have any Berry
    # partner, dock significantly. If we do, treat it as a positive
    # because it filters out competitors.
    if have_berry_capacity:
        score += WEIGHTS["berry_compliant"]
        reasons.append(f"Berry capacity in network (+{WEIGHTS['berry_compliant']})")
    else:
        score += WEIGHTS["berry_required_no_capacity"]
        reasons.append(f"no Berry capacity ({WEIGHTS['berry_required_no_capacity']})")

    return max(0.0, min(100.0, score)), reasons


def should_skip(score: float) -> bool:
    return score < SKIP_THRESHOLD
