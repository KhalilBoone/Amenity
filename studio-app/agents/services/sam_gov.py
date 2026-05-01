"""SAM.gov Opportunities API v2 client.

Thin wrapper around https://api.sam.gov/opportunities/v2/search. Auth is
via the ``SAM_API_KEY`` env var (a non-public registered API key — get
one at https://sam.gov → Account → API Keys).

We expose two functions:

* ``search`` — generic paginated search; returns the raw opportunity dicts.
* ``search_apparel`` — narrowed to clothing-relevant NAICS codes.

Idempotency at the bids table layer is the caller's responsibility.

Tested against the live API. The response shape is:
    {
      "totalRecords": int,
      "limit": int,
      "offset": int,
      "opportunitiesData": [ ... ],
      "links": { "self": "...", "next": "..." }
    }
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable


SAM_BASE = "https://api.sam.gov/opportunities/v2/search"


# Clothing-relevant NAICS codes. References:
#   315 — apparel manufacturing (cut & sew, knitting mills, etc.)
#   314 — textile product mills (curtains, linens, household textiles)
#   316 — leather + allied products (footwear, gloves)
# Inside 315 the most relevant for Amenity:
#   315210, 315220, 315240, 315250, 315990, etc.
APPAREL_NAICS = [
    "315",       # all of apparel manufacturing
    "314",       # textile product mills (relevant for some uniforms)
    "316",       # leather + allied (footwear)
]


# PSC codes that overlap with apparel/uniforms. The federal PSC system
# bundles clothing into 84xx. The most useful subgroups:
#   8405 — outerwear
#   8410 — women's clothing
#   8415 — men's clothing
#   8420 — underwear & nightwear
#   8430 — footwear, men's
#   8435 — footwear, women's
#   8440 — hosiery, handwear, clothing accessories
#   8445 — footwear, athletic
APPAREL_PSC = ["8405", "8410", "8415", "8420", "8430", "8435", "8440", "8445"]


class SamGovError(RuntimeError):
    pass


def _api_key() -> str:
    key = os.getenv("SAM_API_KEY")
    if not key:
        raise SamGovError(
            "SAM_API_KEY is not set. Register at https://sam.gov → Account → API Keys."
        )
    return key


def _format_date(d: datetime | str) -> str:
    """SAM.gov accepts MM/DD/YYYY for postedFrom/postedTo."""
    if isinstance(d, str):
        return d
    return d.strftime("%m/%d/%Y")


def search(
    *,
    posted_from: datetime | str | None = None,
    posted_to: datetime | str | None = None,
    naics: Iterable[str] | None = None,
    ptype: str = "o,k",     # o = solicitation, k = combined synopsis/solicitation
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Single-page search. Returns the ``opportunitiesData`` list.

    Caller is responsible for paging via ``offset`` if more than ``limit``
    rows match.
    """
    try:
        import httpx  # type: ignore
    except ImportError as e:           # pragma: no cover
        raise SamGovError("httpx not installed. `pip install httpx`.") from e

    if posted_from is None:
        posted_from = datetime.now(timezone.utc) - timedelta(days=1)
    if posted_to is None:
        posted_to = datetime.now(timezone.utc)

    params: dict[str, str] = {
        "api_key":    _api_key(),
        "postedFrom": _format_date(posted_from),
        "postedTo":   _format_date(posted_to),
        "limit":      str(limit),
        "offset":     str(offset),
        "ptype":      ptype,
    }
    if naics:
        # Comma-separated list; SAM.gov matches on prefix when 3 digits.
        params["ncode"] = ",".join(naics)

    try:
        resp = httpx.get(SAM_BASE, params=params, timeout=30.0)
        resp.raise_for_status()
    except Exception as e:
        raise SamGovError(f"SAM.gov search failed: {e}") from e

    data = resp.json() or {}
    return list(data.get("opportunitiesData") or [])


def search_apparel(
    *,
    days: int = 1,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Convenience wrapper — pulls the last ``days`` days for apparel NAICS."""
    posted_from = datetime.now(timezone.utc) - timedelta(days=days)
    return search(
        posted_from=posted_from,
        naics=APPAREL_NAICS,
        limit=limit,
    )


def normalize(opp: dict[str, Any]) -> dict[str, Any]:
    """Coerce a SAM.gov v2 record into the shape the bids table wants."""
    return {
        "solicitation": opp.get("solicitationNumber") or opp.get("noticeId") or "",
        "title":        opp.get("title"),
        "agency":       opp.get("departmentName") or opp.get("subTier") or opp.get("officeAddress", {}).get("name"),
        "naics":        opp.get("naicsCode"),
        "psc":          opp.get("classificationCode"),
        "posted_at":    opp.get("postedDate"),
        "response_due": opp.get("responseDeadLine"),
        "url":          opp.get("uiLink"),
        "raw":          opp,
    }
