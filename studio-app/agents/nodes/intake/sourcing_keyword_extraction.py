"""
Sourcing-specific keyword extraction.

Converts free-text fabric / material inquiries into structured capability
tags that the routing node can match against supplier profiles.

All extraction is regex-only — zero external dependencies, zero latency.
"""
from __future__ import annotations

import re
from typing import Any


# ---------------------------------------------------------------------------
# Material type patterns → capability tags
# ---------------------------------------------------------------------------
_MATERIAL_PATTERNS: list[tuple[re.Pattern[str], list[str]]] = [
    # Knit fabrics
    (re.compile(r"\b(french\s+terry|french terry)\b", re.I),         ["french_terry"]),
    (re.compile(r"\bfleece\b", re.I),                                  ["fleece"]),
    (re.compile(r"\b(waffle|thermal)\s*knit\b", re.I),                 ["waffle_knit"]),
    (re.compile(r"\b(rib|ribbed)\s*(knit)?\b", re.I),                  ["rib_knit"]),
    (re.compile(r"\bjersey\b", re.I),                                   ["jersey"]),
    (re.compile(r"\binterlock\b", re.I),                                ["interlock"]),
    (re.compile(r"\bpique\b", re.I),                                    ["pique"]),
    # Woven fabrics
    (re.compile(r"\btwill\b", re.I),                                    ["twill"]),
    (re.compile(r"\bcanvas\b", re.I),                                   ["canvas"]),
    (re.compile(r"\bdenim\b", re.I),                                    ["denim"]),
    (re.compile(r"\b(oxford|chambray)\b", re.I),                        ["woven_cotton"]),
    (re.compile(r"\b(poplin|broadcloth)\b", re.I),                      ["woven_cotton"]),
    (re.compile(r"\b(gabardine|chino)\b", re.I),                        ["twill"]),
    (re.compile(r"\b(ripstop|nylon|taffeta)\b", re.I),                  ["technical_nylon"]),
    # Fibres
    (re.compile(r"\b(100\s*%\s*)?cotton\b", re.I),                     ["cotton"]),
    (re.compile(r"\bpolyester\b", re.I),                                ["polyester"]),
    (re.compile(r"\b(poly)\b", re.I),                                   ["polyester"]),
    (re.compile(r"\bwool\b", re.I),                                     ["wool"]),
    (re.compile(r"\bcashmere\b", re.I),                                 ["cashmere"]),
    (re.compile(r"\blinen\b", re.I),                                    ["linen"]),
    (re.compile(r"\bbamboo\b", re.I),                                   ["bamboo"]),
    (re.compile(r"\b(tencel|lyocell)\b", re.I),                        ["tencel"]),
    (re.compile(r"\b(modal)\b", re.I),                                  ["modal"]),
    (re.compile(r"\b(spandex|elastane|lycra)\b", re.I),                ["stretch"]),
    (re.compile(r"\b(merino)\b", re.I),                                 ["wool", "merino"]),
    # Sustainable / organic
    (re.compile(r"\borganic\b", re.I),                                  ["organic"]),
    (re.compile(r"\b(recycled|rPET|r\-PET)\b", re.I),                  ["recycled"]),
    (re.compile(r"\b(sustainable|eco[\s-]friendly)\b", re.I),           ["sustainable"]),
]

# ---------------------------------------------------------------------------
# Certification patterns → tags
# ---------------------------------------------------------------------------
_CERT_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bGOTS\b", re.I),                  "GOTS"),
    (re.compile(r"\bOEKO[\s\-]?TEX\b", re.I),        "OEKO-TEX"),
    (re.compile(r"\bBCI\b"),                          "BCI"),
    (re.compile(r"\bBluesign\b", re.I),               "Bluesign"),
    (re.compile(r"\bFair\s*Trade\b", re.I),           "Fair Trade"),
    (re.compile(r"\bGRS\b"),                          "GRS"),
    (re.compile(r"\bRCS\b"),                          "RCS"),
    (re.compile(r"\bCradle\s+to\s+Cradle\b", re.I),  "C2C"),
    (re.compile(r"\bISO\s*9001\b", re.I),             "ISO 9001"),
]

# ---------------------------------------------------------------------------
# Weight patterns  (e.g. "400gsm", "14 oz", "heavyweight", "midweight")
# ---------------------------------------------------------------------------
_WEIGHT_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(gsm|g/m2|g\/m2|oz)\b"
    r"|heavyweight|heavy\s+weight|midweight|mid[\s\-]weight|lightweight|light[\s\-]weight",
    re.I,
)

# ---------------------------------------------------------------------------
# Volume / quantity patterns
# ---------------------------------------------------------------------------
_QTY_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"(\d[\d,]*)\s*(?:metres?|meters?|m\b)", re.I),
    re.compile(r"(\d[\d,]*)\s*(?:yards?|yds?)\b", re.I),
    re.compile(r"(\d[\d,]*)\s*(?:rolls?)\b", re.I),
    re.compile(r"(\d[\d,]*)\s*(?:kg|kgs|kilograms?)\b", re.I),
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_materials(text: str) -> list[str]:
    """Return deduplicated capability tags matched from material patterns."""
    tags: list[str] = []
    for pattern, capabilities in _MATERIAL_PATTERNS:
        if pattern.search(text):
            for cap in capabilities:
                if cap not in tags:
                    tags.append(cap)
    return tags or ["general_fabric"]


def extract_certifications(text: str) -> list[str]:
    """Extract sustainability / quality certification names from text."""
    certs: list[str] = []
    for pattern, cert in _CERT_PATTERNS:
        if pattern.search(text):
            if cert not in certs:
                certs.append(cert)
    return certs


def extract_weight_hints(text: str) -> list[str]:
    """Extract weight specs like '400gsm', '14oz', 'heavyweight'."""
    return list(dict.fromkeys(m.group(0) for m in _WEIGHT_RE.finditer(text)))


def extract_volume(text: str) -> int | None:
    """Try to pull a numeric volume (metres / yards / rolls / kg) from text."""
    for pattern in _QTY_PATTERNS:
        m = pattern.search(text)
        if m:
            try:
                return int(m.group(1).replace(",", ""))
            except (ValueError, IndexError):
                pass
    return None


def extract_spec_from_inquiry(description: str) -> dict[str, Any]:
    """
    Top-level function: run all extractors over the inquiry description and
    return a unified spec dict ready to store in the order.spec column.
    """
    return {
        "materials":      extract_materials(description),
        "certifications": extract_certifications(description),
        "weight_hints":   extract_weight_hints(description),
        "volume":         extract_volume(description),
    }
