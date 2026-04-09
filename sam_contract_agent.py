"""
SAM.gov Contract Monitoring Agent
----------------------------------
Daily scans SAM.gov for clothing & footwear contracts, scores each opportunity
against your manufacturer capabilities using Claude, and drafts bid packages
for high-fit contracts.

Setup:
  1. Add your API keys to config.py
  2. Run manually: python sam_contract_agent.py
  3. Or schedule via cron: 0 7 * * * /usr/bin/python3 /path/to/sam_contract_agent.py
"""

import requests
import json
import os
from datetime import datetime, timedelta
from anthropic import Anthropic

import config

# ── Claude client ──────────────────────────────────────────────────────────────
claude = Anthropic(api_key=config.ANTHROPIC_API_KEY)

# ── NAICS & PSC codes for clothing / footwear ──────────────────────────────────
NAICS_CODES = [
    "315210",  # Cut and Sew Apparel Contractors
    "315220",  # Men's/Boys' Cut and Sew Apparel
    "315240",  # Women's/Girls' Cut and Sew Apparel
    "315280",  # Other Cut and Sew Apparel
    "316210",  # Footwear Manufacturing
    "314910",  # Textile Bag & Canvas Mills (military/tactical gear)
    "315190",  # Other Hosiery & Socks
    "315990",  # Apparel Accessories & Other Apparel
]

PSC_CODES = [
    "8405",    # Outerwear, Men's
    "8410",    # Outerwear, Women's
    "8415",    # Clothing, Special Purpose
    "8420",    # Footwear, Men's
    "8425",    # Footwear, Women's
    "8450",    # Insignia & Uniform Accessories
    "8470",    # Armor, Personal
]

# ── SAM.gov API ────────────────────────────────────────────────────────────────
SAM_BASE_URL = "https://api.sam.gov/opportunities/v2/search"

def get_date_range(days_back: int = 1) -> tuple[str, str]:
    """Returns (from_date, to_date) formatted for SAM.gov API."""
    today = datetime.today()
    from_date = (today - timedelta(days=days_back)).strftime("%m/%d/%Y")
    to_date = today.strftime("%m/%d/%Y")
    return from_date, to_date


def fetch_opportunities(days_back: int = 1) -> list[dict]:
    """
    Hits the SAM.gov Opportunities API for each NAICS code
    and returns a deduplicated list of opportunities.
    """
    from_date, to_date = get_date_range(days_back)
    all_opportunities = {}

    naics_string = ",".join(NAICS_CODES)

    params = {
        "api_key": config.SAM_API_KEY,
        "naics": naics_string,
        "postedFrom": from_date,
        "postedTo": to_date,
        "limit": 100,
        "offset": 0,
        # o=solicitation, k=combined synopsis/solicitation, p=presolicitation
        "ptype": "o,k,p,r",
        "active": "true",
    }

    print(f"\n🔍 Searching SAM.gov for opportunities ({from_date} → {to_date})")
    print(f"   NAICS codes: {naics_string}\n")

    while True:
        response = requests.get(SAM_BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        opportunities = data.get("opportunitiesData", [])
        total = data.get("totalRecords", 0)

        for opp in opportunities:
            sol_number = opp.get("solicitationNumber", opp.get("noticeId", ""))
            if sol_number not in all_opportunities:
                all_opportunities[sol_number] = opp

        fetched_so_far = params["offset"] + len(opportunities)
        print(f"   Fetched {fetched_so_far} / {total} opportunities...")

        if fetched_so_far >= total or not opportunities:
            break

        params["offset"] += params["limit"]

    results = list(all_opportunities.values())
    print(f"\n✅ Found {len(results)} unique opportunities\n")
    return results


# ── Scoring ────────────────────────────────────────────────────────────────────

# Describe your manufacturer network's capabilities here.
# Claude uses this to score each contract opportunity for fit.
MANUFACTURER_CAPABILITIES = config.MANUFACTURER_CAPABILITIES


def score_opportunity(opp: dict) -> dict:
    """
    Uses Claude to score a contract opportunity (0–100) against
    your manufacturer network's capabilities.
    Returns the original opp dict enriched with score + reasoning.
    """
    title       = opp.get("title", "N/A")
    description = opp.get("description", "No description provided.")
    naics       = opp.get("naicsCode", "N/A")
    set_aside   = opp.get("typeOfSetAsideDescription", "None / Full & Open")
    agency      = opp.get("fullParentPathName", "N/A")
    deadline    = opp.get("responseDeadLine", "N/A")
    value       = opp.get("baseAndAllOptionsValue", "Unknown")

    prompt = f"""
You are a government contracting analyst for a manufacturing consulting agency.
Evaluate this contract opportunity and score it 0–100 based on fit with the
manufacturer network described below.

── MANUFACTURER NETWORK CAPABILITIES ─────────────────────────────────────────
{MANUFACTURER_CAPABILITIES}

── CONTRACT OPPORTUNITY ──────────────────────────────────────────────────────
Title:       {title}
Agency:      {agency}
NAICS Code:  {naics}
Set-Aside:   {set_aside}
Deadline:    {deadline}
Est. Value:  {value}
Description: {description[:2000]}

── SCORING CRITERIA ──────────────────────────────────────────────────────────
- Product/capability match (0–40 pts): Can our manufacturers make this?
- Set-aside eligibility (0–20 pts): Do we qualify for the set-aside type?
- Volume & capacity fit (0–20 pts): Is the quantity realistic for our network?
- Timeline feasibility (0–20 pts): Can we meet the deadline?

Return a JSON object with these exact keys:
{{
  "score": <integer 0-100>,
  "product_match": <integer 0-40>,
  "set_aside_fit": <integer 0-20>,
  "capacity_fit": <integer 0-20>,
  "timeline_fit": <integer 0-20>,
  "summary": "<2-3 sentence plain-English summary of why this is or isn't a good fit>",
  "recommended_manufacturers": ["<manufacturer type 1>", "<manufacturer type 2>"],
  "bid_flag": <true if score >= {config.BID_SCORE_THRESHOLD} else false>
}}
Return ONLY the JSON with no additional text.
"""

    message = claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        result = json.loads(message.content[0].text)
    except json.JSONDecodeError:
        result = {
            "score": 0,
            "summary": "Could not parse scoring response.",
            "bid_flag": False,
        }

    opp["_score"] = result
    return opp


# ── Bid drafting ───────────────────────────────────────────────────────────────

def draft_bid_package(opp: dict) -> str:
    """
    Uses Claude to draft a capability statement and technical approach
    for a high-scoring contract opportunity.
    Returns the full draft as a formatted string.
    """
    title       = opp.get("title", "N/A")
    agency      = opp.get("fullParentPathName", "N/A")
    sol_number  = opp.get("solicitationNumber", "N/A")
    description = opp.get("description", "No description provided.")
    deadline    = opp.get("responseDeadLine", "N/A")
    score_data  = opp.get("_score", {})
    set_aside   = opp.get("typeOfSetAsideDescription", "Full & Open")

    prompt = f"""
You are a professional government contract proposal writer for a manufacturing
consulting agency. Draft a complete bid package for the contract below.

── AGENCY PROFILE ────────────────────────────────────────────────────────────
{config.AGENCY_PROFILE}

── MANUFACTURER NETWORK ──────────────────────────────────────────────────────
{MANUFACTURER_CAPABILITIES}

── CONTRACT DETAILS ──────────────────────────────────────────────────────────
Solicitation #: {sol_number}
Title:          {title}
Issuing Agency: {agency}
Set-Aside:      {set_aside}
Response Due:   {deadline}
Scope:          {description[:3000]}

── SCORING NOTES ─────────────────────────────────────────────────────────────
{json.dumps(score_data, indent=2)}

── REQUIRED SECTIONS ─────────────────────────────────────────────────────────
Draft the following sections in professional government contracting language:

1. COVER PAGE
   - Company name, address, solicitation number, date, POC

2. CAPABILITY STATEMENT (1 page)
   - Core competencies relevant to this contract
   - Differentiators (speed, network size, certifications, domestic production)
   - Past performance summary (use placeholders like [CLIENT NAME] if needed)
   - NAICS codes and cage code placeholder

3. TECHNICAL APPROACH (1–2 pages)
   - How you will fulfill the specific requirements
   - Manufacturer selection and vetting process
   - Quality control and compliance process
   - Delivery and logistics approach

4. PAST PERFORMANCE TABLE
   - 3 rows with: Contract #, Agency, Description, Value, Period, POC
   - Use realistic placeholders

5. PRICING STRATEGY NOTES (internal — not submitted)
   - Suggested markup range
   - Recommended subcontractor structure

Format with clear section headers. Use [PLACEHOLDER] for any info
you need from the user to complete.
"""

    message = claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text


# ── Output ─────────────────────────────────────────────────────────────────────

def save_results(opportunities: list[dict], bid_packages: dict[str, str]):
    """Saves scored opportunities and bid drafts to timestamped output files."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    os.makedirs("output", exist_ok=True)

    # Summary JSON
    summary_path = f"output/opportunities_{timestamp}.json"
    scored = [
        {
            "title": o.get("title"),
            "agency": o.get("fullParentPathName"),
            "solicitation": o.get("solicitationNumber"),
            "naics": o.get("naicsCode"),
            "deadline": o.get("responseDeadLine"),
            "set_aside": o.get("typeOfSetAsideDescription"),
            "link": o.get("uiLink"),
            "score": o.get("_score", {}).get("score", 0),
            "summary": o.get("_score", {}).get("summary", ""),
            "bid_flag": o.get("_score", {}).get("bid_flag", False),
        }
        for o in sorted(opportunities, key=lambda x: x.get("_score", {}).get("score", 0), reverse=True)
    ]
    with open(summary_path, "w") as f:
        json.dump(scored, f, indent=2)
    print(f"📄 Scored opportunities saved → {summary_path}")

    # Bid packages
    for sol_number, draft in bid_packages.items():
        safe_name = sol_number.replace("/", "-").replace(" ", "_")
        bid_path = f"output/bid_{safe_name}_{timestamp}.txt"
        with open(bid_path, "w") as f:
            f.write(draft)
        print(f"📝 Bid draft saved → {bid_path}")


def print_summary(opportunities: list[dict]):
    """Prints a quick console summary of today's scan."""
    sorted_opps = sorted(
        opportunities,
        key=lambda x: x.get("_score", {}).get("score", 0),
        reverse=True,
    )

    bid_opps = [o for o in sorted_opps if o.get("_score", {}).get("bid_flag")]

    print("\n" + "═" * 60)
    print(f"  SAM.gov Daily Scan — {datetime.today().strftime('%B %d, %Y')}")
    print("═" * 60)
    print(f"  Total opportunities found:  {len(opportunities)}")
    print(f"  High-fit (bid recommended): {len(bid_opps)}")
    print("═" * 60)

    if bid_opps:
        print("\n🎯 RECOMMENDED FOR BID:\n")
        for opp in bid_opps:
            score = opp.get("_score", {}).get("score", 0)
            title = opp.get("title", "N/A")[:55]
            deadline = opp.get("responseDeadLine", "N/A")
            link = opp.get("uiLink", "")
            print(f"  [{score}/100] {title}")
            print(f"           Due: {deadline}")
            print(f"           {link}\n")
    else:
        print("\n  No high-fit opportunities today.\n")


# ── Main ───────────────────────────────────────────────────────────────────────

def run(days_back: int = 1):
    """Main agent entry point."""
    print("\n🚀 SAM.gov Contract Agent starting...\n")

    # 1. Fetch opportunities from SAM.gov
    opportunities = fetch_opportunities(days_back=days_back)

    if not opportunities:
        print("No new opportunities found today.")
        return

    # 2. Score each opportunity with Claude
    print("🤖 Scoring opportunities with Claude...\n")
    scored_opportunities = []
    for i, opp in enumerate(opportunities, 1):
        title = opp.get("title", "N/A")[:60]
        print(f"  [{i}/{len(opportunities)}] {title}")
        scored = score_opportunity(opp)
        scored_opportunities.append(scored)

    # 3. Draft bid packages for high-fit contracts
    bid_opps = [o for o in scored_opportunities if o.get("_score", {}).get("bid_flag")]
    bid_packages = {}

    if bid_opps:
        print(f"\n✍️  Drafting bid packages for {len(bid_opps)} opportunity/ies...\n")
        for opp in bid_opps:
            sol = opp.get("solicitationNumber", opp.get("noticeId", "unknown"))
            title = opp.get("title", "N/A")[:60]
            print(f"  Drafting: {title}")
            bid_packages[sol] = draft_bid_package(opp)

    # 4. Save results and print summary
    save_results(scored_opportunities, bid_packages)
    print_summary(scored_opportunities)
    print("\n✅ Agent complete.\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="SAM.gov Contract Monitoring Agent")
    parser.add_argument(
        "--days",
        type=int,
        default=1,
        help="How many days back to search (default: 1 for daily run, use 7 for first run)",
    )
    args = parser.parse_args()
    run(days_back=args.days)
