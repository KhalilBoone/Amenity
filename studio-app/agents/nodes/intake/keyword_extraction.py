"""
Keyword extraction for production requests.

Parses free-text descriptions (e.g. "I want 24 hoodies, 800gsm, in Red")
into structured spec fields that the routing node can match against
manufacturer capabilities.

Intentionally dependency-free (no LLM required) — pure regex + lookup tables.
This runs inside the /production/inquire intake path before the graph fires.
"""
from __future__ import annotations

import re
from typing import Any


# ── Keyword → capability tag map ─────────────────────────────────────────────
# Each regex maps to one or more routing capability tags.
_CAPABILITY_PATTERNS: list[tuple[str, list[str]]] = [
    # Knitwear — plurals handled with s?
    (r"\btees?\b|t-shirts?|tshirts?|crew.?neck",             ["knitwear"]),
    (r"\bhoodies?\b|hooded.?sweatshirt|pullovers?",           ["knitwear"]),
    (r"\bsweatshirts?|crewnecks?|sweaters?|jumpers?|fleeces?",["knitwear"]),
    (r"\bpolos?\b|rugby.?shirt",                              ["knitwear"]),
    (r"\btank.?tops?|singlets?|muscle.?tees?",                ["knitwear"]),
    (r"\bshorts?\b|sweatshorts?",                             ["knitwear"]),
    (r"\bjoggers?|sweatpants?|trackpants?",                   ["knitwear"]),
    # Wovens
    (r"\bbutton.?up|button.?down|dress.?shirt|oxford",        ["wovens"]),
    (r"\bchinos?|trousers?|slacks\b",                         ["wovens"]),
    (r"\bwoven.?shirt|linen.?shirt",                          ["wovens"]),
    (r"\bdresses?|skirts?\b",                                 ["wovens"]),
    # Outerwear
    (r"\bjackets?|coats?\b|parkas?|anoraks?|windbreakers?",   ["outerwear"]),
    (r"\bbombers?|varsity|track.?jacket",                     ["outerwear"]),
    (r"\bvests?\b|gilets?|puffers?",                          ["outerwear"]),
    # Denim
    (r"\bdenim|jeans?\b",                                     ["denim"]),
    (r"\bdenim.?jacket|trucker.?jacket",                      ["denim"]),
    # Activewear / Performance
    (r"\bactive.?wear|athletic|gym.?wear|performance",        ["activewear"]),
    (r"\bleggings?|sports.?bra|biker.?shorts?",               ["activewear"]),
    (r"\bcompression|moisture.?wicking",                      ["activewear"]),
    # Footwear
    (r"\bcowboy.?boots?|chelsea.?boots?",                     ["footwear"]),
    (r"\bsneakers?|trainers?|running.?shoes?|athletic.?shoes?",["footwear"]),
    (r"\bloafers?|mules?\b|sandals?|slippers?|heels?\b|pumps?\b",["footwear"]),
    (r"\bboots?\b|shoes?\b",                                  ["footwear"]),
    # Headwear
    (r"\bhats?\b|caps?\b|beanies?|snapbacks?|bucket.?hats?|dad.?hats?",["headwear"]),
    (r"\bberets?|trucker.?hats?|fitted.?caps?",               ["headwear"]),
    # Accessories
    (r"\btotes?\b|bags?\b|backpacks?|pouches?|clutches?|crossbodys?",["accessories"]),
    (r"\bbelts?\b|lanyards?|scarves?|gloves?",                ["accessories"]),
    (r"\bwallets?|card.?holders?",                            ["accessories"]),
    # Loungewear
    (r"\brobes?\b|lounge.?wear|loungewear|pyjamas?|pajamas?", ["loungewear"]),
    (r"\bsleep.?sets?|sleep.?wear",                           ["loungewear"]),
    # Decoration
    (r"\bscreen.?prints?|silk.?screen",                       ["screen_print"]),
    (r"\bembroidery|embroidered",                             ["embroidery"]),
    (r"\bdtg|direct.?to.?garment",                            ["dtg"]),
    # Cut & Sew (explicit)
    (r"\bcut.?and.?sew|cut.?&.?sew|full.?package",           ["cut_sew"]),
]

# ── Color extraction ──────────────────────────────────────────────────────────
_COLOR_PATTERN = re.compile(
    r"\b(red|blue|green|black|white|grey|gray|navy|olive|tan|brown|yellow|"
    r"orange|purple|pink|cream|stone|charcoal|forest|sage|slate|burgundy|"
    r"mustard|teal|cobalt|mauve|off.?white|ivory)\b",
    re.IGNORECASE,
)

# ── Quantity extraction ───────────────────────────────────────────────────────
_QTY_PATTERNS: list[str] = [
    r"\b(\d[\d,]*)\s*(?:pieces?|units?|pcs?|items?)\b",
    # number immediately before a product noun
    r"\b(\d[\d,]*)\s+(?:tees?|t.shirts?|shirts?|hoodies?|jackets?|caps?|hats?|"
    r"jeans?|boots?|shoes?|pairs?|shorts?|sweater|sweatshirt|pullover)\b",
    r"(?:qty|quantity)[:\s]+(\d[\d,]*)",
    r"(?:make|order|get|need|want|produce|manufacture)\s+(\d[\d,]*)",
    r"(\d[\d,]*)\s+(?:of\s+the|custom|branded)",
]

# ── Material / weight extraction ──────────────────────────────────────────────
_GSM_PATTERN = re.compile(r"\b(\d+)\s*gsm\b", re.IGNORECASE)
_OZ_PATTERN  = re.compile(r"\b(\d+(?:\.\d+)?)\s*oz\b", re.IGNORECASE)


# ── Public helpers ────────────────────────────────────────────────────────────

def extract_capabilities(text: str) -> list[str]:
    """Return sorted unique capability tags inferred from ``text``."""
    caps: set[str] = set()
    for pattern, tags in _CAPABILITY_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            caps.update(tags)
    # Default: if nothing specific matched, assume general cut-and-sew intent.
    if not caps:
        caps.add("cut_sew")
    return sorted(caps)


def extract_quantity(text: str) -> int | None:
    """Return the first quantity number found in ``text``, or None."""
    for pattern in _QTY_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                return int(raw)
            except ValueError:
                continue
    return None


def extract_colors(text: str) -> list[str]:
    """Return all color names mentioned in ``text`` (lowercase, deduped)."""
    found = _COLOR_PATTERN.findall(text)
    seen: set[str] = set()
    result: list[str] = []
    for c in found:
        c_norm = c.lower().replace("-", "").replace(" ", "")
        if c_norm not in seen:
            seen.add(c_norm)
            result.append(c.lower())
    return result


def extract_material_hints(text: str) -> list[str]:
    """Return any fabric weight hints like '400gsm' or '14oz'."""
    hints: list[str] = []
    for m in _GSM_PATTERN.finditer(text):
        hints.append(f"{m.group(1)}gsm")
    for m in _OZ_PATTERN.finditer(text):
        hints.append(f"{m.group(1)}oz")
    return hints


def extract_spec_from_description(description: str) -> dict[str, Any]:
    """
    Main entry point.  Given a free-text description, return a spec dict
    with ``capabilities``, ``quantity``, ``colors``, and ``material_hints``
    populated — ready to be merged into the agent state.
    """
    return {
        "capabilities":    extract_capabilities(description),
        "quantity":        extract_quantity(description),
        "colors":          extract_colors(description),
        "material_hints":  extract_material_hints(description),
        "description":     description,
    }
