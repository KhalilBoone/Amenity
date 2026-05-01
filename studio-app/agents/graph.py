"""LangGraph wiring for the Amenity agent pipeline.

Two graphs live here:

  build_order_graph()   — Studio: intake → compliance → routing → fulfillment
                          → qa → comms → invoicing
  build_bid_graph()     — Supply Co.: partner_monitor → compliance → comms

Both share `AgentState` from `agents.state`.

The node functions are imported from `agents/nodes/<name>/<name>.py`. Each one
is a pure function `(state: AgentState) -> AgentState` (or partial dict).
"""
from __future__ import annotations

from typing import Callable

# LangGraph is the intended runtime, but we keep the import lazy so the file
# can be imported in environments that don't have it installed yet.
try:
    from langgraph.graph import StateGraph, END  # type: ignore
except Exception:  # pragma: no cover
    StateGraph = None  # type: ignore
    END = "END"        # type: ignore

from agents.state import AgentState
from agents.nodes.intake.intake import intake_node
from agents.nodes.compliance.compliance import compliance_node
from agents.nodes.routing.routing import routing_node
from agents.nodes.fulfillment.fulfillment import fulfillment_node
from agents.nodes.qa.qa import qa_node
from agents.nodes.comms.comms import comms_node
from agents.nodes.invoicing.invoicing import invoicing_node
from agents.nodes.partner_monitor.partner_monitor import partner_monitor_node


# ----------------------------------------------------------------------
# Order graph (Studio)
# ----------------------------------------------------------------------
def build_order_graph():
    """Build the Studio order pipeline graph.

    intake → compliance → routing → fulfillment → qa → comms → invoicing → END
    """
    if StateGraph is None:
        raise RuntimeError(
            "langgraph is not installed. `pip install langgraph` to run the graph."
        )

    g = StateGraph(AgentState)
    g.add_node("intake", intake_node)
    g.add_node("compliance", compliance_node)
    g.add_node("routing", routing_node)
    g.add_node("fulfillment", fulfillment_node)
    g.add_node("qa", qa_node)
    g.add_node("comms", comms_node)
    g.add_node("invoicing", invoicing_node)

    g.set_entry_point("intake")
    g.add_edge("intake", "compliance")
    g.add_edge("compliance", "routing")
    g.add_edge("routing", "fulfillment")
    g.add_edge("fulfillment", "qa")
    g.add_conditional_edges("qa", _qa_router, {"pass": "comms", "fail": "fulfillment"})
    g.add_edge("comms", "invoicing")
    g.add_edge("invoicing", END)

    return g.compile()


def _qa_router(state: AgentState) -> str:
    """If QA fails, loop back to fulfillment to rework."""
    return "pass" if state.get("qa_passed", False) else "fail"


# ----------------------------------------------------------------------
# Bid graph (Supply Co.)
# ----------------------------------------------------------------------
def build_bid_graph():
    """Build the Supply Co. bid pipeline graph.

    partner_monitor → compliance → comms → END
    """
    if StateGraph is None:
        raise RuntimeError(
            "langgraph is not installed. `pip install langgraph` to run the graph."
        )

    g = StateGraph(AgentState)
    g.add_node("partner_monitor", partner_monitor_node)
    g.add_node("compliance", compliance_node)
    g.add_node("comms", comms_node)

    g.set_entry_point("partner_monitor")
    g.add_edge("partner_monitor", "compliance")
    g.add_edge("compliance", "comms")
    g.add_edge("comms", END)

    return g.compile()


# ----------------------------------------------------------------------
# Convenience runners
# ----------------------------------------------------------------------
def run_order(initial: AgentState) -> AgentState:
    """One-shot helper for FastAPI routes."""
    graph = build_order_graph()
    return graph.invoke(initial)


def run_bid(initial: AgentState) -> AgentState:
    graph = build_bid_graph()
    return graph.invoke(initial)


__all__ = ["build_order_graph", "build_bid_graph", "run_order", "run_bid"]
