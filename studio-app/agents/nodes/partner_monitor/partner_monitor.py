"""partner_monitor — daily watcher for SAM.gov apparel opportunities.

Drives the bid graph. Designed to run on a schedule (Supabase Edge
Function cron, GitHub Actions, etc.). Each invocation:

1. Pulls new opportunities from SAM.gov over a configurable window.
2. Persists each one to the ``bids`` table idempotently (on
   ``solicitation``).
3. Scores every bid currently in ``status='discovered'``, persisting
   ``score`` + ``score_reasons`` and flipping the row to ``scored`` or
   ``skipped`` based on ``SKIP_THRESHOLD``.
4. Returns the highest-scoring ``scored`` bid as the next thing the
   bid graph (compliance → comms) should work on. If nothing qualifies,
   returns ``status='closed'`` and the graph terminates cleanly.

State contract:
    Input:  state["raw_input"]  — optional {"days": int}
    Output: state["bid_id"], state["spec"], state["status"]="compliance"
            (or status="closed" if no qualifying bid)
"""
from __future__ import annotations

from typing import Any

from agents.router.bid_scoring import score_bid, should_skip
from agents.runlog import run_logged
from agents.services import sam_gov
from agents.state import AgentState
from api.db import service_client


@run_logged("partner_monitor")
def partner_monitor_node(state: AgentState) -> AgentState:
    raw = state.get("raw_input", {}) or {}
    days = int(raw.get("days", 1) or 1)

    discovered_count = _ingest_new_opportunities(days=days)
    scored_count = _score_pending()

    next_bid = _next_qualifying_bid()
    if not next_bid:
        return {
            **state,
            "status": "closed",
            "raw_input": {**raw, "discovered": discovered_count, "scored": scored_count},
        }

    spec: dict[str, Any] = {
        "naics":         next_bid.get("naics"),
        "psc":           next_bid.get("psc"),
        "agency":        next_bid.get("agency"),
        "title":         next_bid.get("title"),
        "response_due":  next_bid.get("response_due"),
        "url":           next_bid.get("url"),
        # Apparel federal bids are almost always Berry-required.
        "required_certifications": ["berry_compliant"],
        "domestic_only": True,
    }

    return {
        **state,
        "bid_id":     next_bid["id"],
        "spec":       spec,
        "raw_input":  {**raw, "sam_payload": next_bid.get("raw"), "discovered": discovered_count, "scored": scored_count},
        "status":     "compliance",
    }


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------
def _ingest_new_opportunities(*, days: int) -> int:
    """Fetch SAM.gov apparel opportunities and upsert into ``bids``.

    Idempotent on ``solicitation`` — re-running on the same window
    inserts no duplicates.
    """
    try:
        opps = sam_gov.search_apparel(days=days, limit=100)
    except sam_gov.SamGovError:
        return 0

    if not opps:
        return 0

    db = service_client()
    rows = [sam_gov.normalize(o) for o in opps]
    rows = [r for r in rows if r.get("solicitation")]

    # Look up which solicitations we already have so we only insert new ones.
    existing: set[str] = set()
    if rows:
        try:
            sol_ids = list({r["solicitation"] for r in rows})
            res = (
                db.table("bids")
                .select("solicitation")
                .in_("solicitation", sol_ids)
                .execute()
                .data
                or []
            )
            existing = {r["solicitation"] for r in res}
        except Exception:
            existing = set()

    new_rows = [
        {**r, "status": "discovered"}
        for r in rows
        if r["solicitation"] not in existing
    ]
    if not new_rows:
        return 0

    try:
        db.table("bids").insert(new_rows).execute()
    except Exception:
        return 0
    return len(new_rows)


# ---------------------------------------------------------------------------
# Scoring sweep
# ---------------------------------------------------------------------------
def _score_pending() -> int:
    """Score every bid currently at ``status='discovered'``.

    Updates each row with ``score``, ``score_reasons``, and either
    ``status='scored'`` or ``status='skipped'`` depending on the threshold.
    """
    db = service_client()
    try:
        pending = (
            db.table("bids")
            .select("*")
            .eq("status", "discovered")
            .limit(200)
            .execute()
            .data
            or []
        )
    except Exception:
        return 0

    have_berry = _have_berry_capacity(db)
    n = 0
    for b in pending:
        score, reasons = score_bid(b, have_berry_capacity=have_berry)
        next_status = "skipped" if should_skip(score) else "scored"
        try:
            db.table("bids").update(
                {
                    "score":         round(score, 1),
                    "score_reasons": {"reasons": reasons},
                    "status":        next_status,
                }
            ).eq("id", b["id"]).execute()
            n += 1
        except Exception:
            continue
    return n


def _have_berry_capacity(db: Any) -> bool:
    """Cheap check — do we have at least one Berry-compliant manufacturer?"""
    try:
        rows = (
            db.table("manufacturers")
            .select("id")
            .contains("certifications", ["berry_compliant"])
            .limit(1)
            .execute()
            .data
        )
        return bool(rows)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Next-bid pick
# ---------------------------------------------------------------------------
def _next_qualifying_bid() -> dict[str, Any] | None:
    db = service_client()
    try:
        rows = (
            db.table("bids")
            .select("*")
            .eq("status", "scored")
            .order("score", desc=True)
            .order("response_due")
            .limit(1)
            .execute()
            .data
            or []
        )
    except Exception:
        return None
    return rows[0] if rows else None
