"""Shared agent state.

`AgentState` is the single dict that flows through every node in the LangGraph.
Each node reads from it and returns a partial dict that LangGraph merges in.

Keep this small — only fields multiple nodes need belong here. Node-local
scratch should stay inside the node.
"""
from __future__ import annotations

from typing import Any, Literal, TypedDict


OrderStatus = Literal[
    "intake", "compliance", "routing", "fulfillment",
    "qa", "shipped", "invoiced", "closed", "cancelled",
]

BidStatus = Literal[
    "discovered", "scored", "drafted", "submitted",
    "won", "lost", "skipped",
]


class AgentState(TypedDict, total=False):
    # --- Identifiers ---
    order_id: str | None
    bid_id: str | None
    brand_id: str | None

    # --- Inbound payload (raw user/webhook input) ---
    raw_input: dict[str, Any]

    # --- Intake output ---
    spec: dict[str, Any]              # structured product spec
    quantity: int
    product_type: str
    target_price: float | None
    due_date: str | None              # ISO date

    # --- Compliance output ---
    compliance: dict[str, Any]        # {"berry_ok": bool, "taa_ok": bool, "notes": ...}

    # --- Routing output ---
    manufacturer_id: str | None
    routing_score: float | None
    routing_reasons: list[str]
    candidates: list[dict[str, Any]]  # ranked manufacturer candidates

    # --- Fulfillment output ---
    po_number: str | None
    fulfillment_notes: str

    # --- QA output ---
    qa_results: dict[str, Any]
    qa_passed: bool

    # --- Comms output ---
    last_comm_id: str | None

    # --- Invoicing output ---
    invoice_id: str | None
    invoice_amount: float | None

    # --- Status / control flow ---
    status: OrderStatus | BidStatus
    errors: list[str]
    next_node: str | None             # optional override for routing
