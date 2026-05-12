"""LangGraph wiring for the Amenity agent pipeline.

After Studio sunset, only one graph remains:

  build_bid_graph()  — Supply Co.: partner_monitor → compliance → comms

The Shop/Blanks `blanks_fulfillment` node is invoked directly from the Stripe
webhook in `api/main.py` and does not run through a graph (single-step), so it
is not wired here.

The node functions are imported from `agents/nodes/<name>/<name>.py`. Each one
is a pure function `(state: AgentState) -> AgentState` (or partial dict).
"""
from __future__ import annotations

# LangGraph is the intended runtime, but we keep the import lazy so the file
# can be imported in environments that don't have it installed yet.
try:
    from langgraph.graph import StateGraph, END  # type: ignore
except Exception:  # pragma: no cover
    StateGraph = None  # type: ignore
    END = "END"        # type: ignore

from agents.state import AgentState
from agents.nodes.compliance.compliance import compliance_node
from agents.nodes.comms.comms import comms_node
from agents.nodes.partner_monitor.partner_monitor import partner_monitor_node


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
def run_bid(initial: AgentState) -> AgentState:
    graph = build_bid_graph()
    return graph.invoke(initial)


__all__ = ["build_bid_graph", "run_bid"]
