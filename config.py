"""
config.py — SAM.gov Contract Agent Configuration
--------------------------------------------------
Fill in all values below before running the agent.
Never commit this file to a public repository.
"""

# ── API Keys ───────────────────────────────────────────────────────────────────

# Get your free SAM.gov API key at: https://sam.gov/profile/details
SAM_API_KEY = "YOUR_SAM_GOV_API_KEY"

# Get your Anthropic API key at: https://console.anthropic.com
ANTHROPIC_API_KEY = "YOUR_ANTHROPIC_API_KEY"


# ── Bid Scoring Threshold ──────────────────────────────────────────────────────
# Opportunities scoring AT OR ABOVE this number will trigger a bid draft.
# Recommended: 65 (adjust up to be more selective, down to cast wider net)
BID_SCORE_THRESHOLD = 65


# ── Your Agency Profile ────────────────────────────────────────────────────────
# Used by Claude when writing bid packages. Be specific — the more detail
# you provide here, the stronger your proposals will be.
AGENCY_PROFILE = """
Company Name:    [YOUR COMPANY NAME]
Entity Type:     [LLC / Corporation / etc.]
UEI Number:      [YOUR SAM.gov UEI]
CAGE Code:       [YOUR CAGE CODE]
Address:         [STREET, CITY, STATE, ZIP]
Primary POC:     [YOUR NAME], [YOUR TITLE]
Email:           [YOUR EMAIL]
Phone:           [YOUR PHONE]

Business Description:
  [YOUR COMPANY NAME] is an AI-powered manufacturing consulting agency
  connecting government buyers with a vetted network of 300+ domestic and
  international apparel and footwear manufacturers. We specialize in
  sourcing, production management, and supply chain optimization for
  clothing, uniforms, and footwear at all scales.

Certifications:
  - [e.g., 8(a) Certified, SDVOSB, HUBZone, Woman-Owned — add yours here]

Years in Business: [X]
Primary NAICS:   315210
Additional NAICS: 315220, 315240, 315280, 316210
"""


# ── Manufacturer Network Capabilities ─────────────────────────────────────────
# This is what Claude uses to score contract fit. Be as specific as possible.
# List product types, quantities, certifications, locations, and lead times.
MANUFACTURER_CAPABILITIES = """
Network Size: 300+ vetted manufacturers

PRODUCT CAPABILITIES:
  - Cut & Sew Apparel: T-shirts, hoodies, sweatshirts, polos, jackets,
    trousers, shorts, activewear, outerwear, uniforms
  - Footwear: Athletic, casual, work boots, military-grade boots
  - Specialty: Flame-resistant (FR) garments, tactical/military apparel,
    high-visibility garments, medical scrubs
  - Accessories: Bags, hats, gloves, belts, patches, insignia

FABRIC SPECIALTIES:
  - Cotton, French terry, fleece, denim, nylon, polyester, wool blends,
    Cordura, ripstop, Gore-Tex compatible, Nomex/Kevlar composites

PRODUCTION TYPES:
  - Cut & Sew (CMT), Full Package Production (FPP), Private Label

QUANTITY RANGE:
  - Minimum: 250 units per style
  - Maximum: 500,000+ units per run (via multiple manufacturer coordination)

CERTIFICATIONS ACROSS NETWORK:
  - [List certifications your manufacturers hold, e.g.:]
  - ISO 9001, OEKO-TEX Standard 100, GOTS, Fair Trade
  - Berry Amendment compliant manufacturers (domestic US)
  - TAA compliant manufacturers

LOCATIONS:
  - Domestic US: [States where your US manufacturers are located]
  - International: Portugal, Italy, Turkey, Bangladesh, Vietnam, Mexico,
    El Salvador, Honduras (nearshore)

LEAD TIMES:
  - Domestic: 4–8 weeks
  - Nearshore (Mexico/Central America): 6–10 weeks
  - Overseas: 10–16 weeks

PAST GOVERNMENT EXPERIENCE:
  - [Add any past government or institutional production experience here]
"""
