# Amenity — Project Context

## What This Is
AI-powered digital production agency with two products sharing one backend:
- **Amenity Studio** (`client-landing.html`) — Fashion brands find production partners via AI chat
- **Amenity Supply Co.** (`gov-landing.html`) — Credential/trust page for government contracting officers who look us up after seeing a bid. We bid on them — they don't submit RFQs to us.
- **SAM.gov Agent** (`sam_contract_agent.py`) — Runs daily, monitors clothing/footwear contracts, auto-bids. Never exposed publicly.

---

## Architecture

```
Amenity (one legal entity)
├── Amenity Studio          → fashion brands / founders
│   └── Chat interface → Claude API → Firestore query → capability cards
│   └── Order form → Firebase function → Claude → Gmail MCP (invisible to client)
│
├── Amenity Supply Co.      → US government agencies
│   └── Credential/trust page only (NAICs, PSC, Berry/TAA, contact form)
│   └── SAM.gov agent runs daily, finds + bids on contracts autonomously
│
└── Shared Backend
    ├── Firebase / Firestore  — 300+ manufacturer DB
    ├── Claude API            — NL → Firestore query translation + scoring
    ├── Gmail MCP             — outreach drafting (invisible to clients)
    └── SAM.gov API v2        — contract monitoring + bid submission
```

---

## File Map

| File | Purpose | Status |
|------|---------|--------|
| `client-landing.html` | Amenity Studio landing + AI chat | ✅ Done |
| `gov-landing.html` | Amenity Supply Co. credential page | ✅ Done |
| `sam_contract_agent.py` | Daily SAM.gov monitor + bid agent | ✅ Done |
| `config.py` | API keys + agency profile (fill before running) | ✅ Done — needs keys |
| `requirements.txt` | Python deps: anthropic, requests | ✅ Done |
| `CLAUDE.md` | This file — maintained by Claude | ✅ Live |
| `dashboard.html` | Brand owner workspace dashboard (Firebase Auth + Firestore) | ✅ Done |
| `firebase/` | Firestore queries + Cloud Functions | 🔲 TODO |
| `next-app/` | Next.js 16 app — `/`, `/gov`, `/dashboard` (TypeScript + Tailwind) | ✅ Done |

---

## Tech Stack

- **Frontend**: HTML/CSS/JS now → Next.js planned
- **Backend**: Firebase Cloud Functions (Node) + Python agents
- **DB**: Firestore — manufacturer records with capability tags, brand associations, MOQ, lead time, certs
- **AI**: Claude API (`claude-sonnet-4-6`) — chat search + bid drafting
- **Email**: Gmail MCP — `create_draft`, `send_message`, `search_messages`
- **Gov contracts**: SAM.gov Opportunities API v2 — `https://api.sam.gov/opportunities/v2/search`
- **Auth**: Firebase Auth (planned)
- **Hosting**: Vercel (planned)

---

## Design Tokens (both sites share these)

```css
--blue:    #2b7fff   /* primary accent */
--black:   #0f0f0f   /* Studio dark sections */
--navy:    #0b1628   /* Supply Co. dark sections — never use black for gov */
--white:   #ffffff
--off-white: #f8f7f5 (Studio) / #f4f5f7 (Supply Co.)
```

**Studio** — dark nav, black hero, blue marquee, editorial fashion tone
**Supply Co.** — white nav + black border, navy hero, black marquee (inverted), institutional tone

---

## Manufacturer DB Schema (Firestore)

```
manufacturers/{id}
  name: string
  capabilities: string[]     // ["cut_sew", "screen_print", "embroidery", "knitwear"]
  brands: string[]           // ["gucci", "palace", "essentials"] — for mode 2 search
  certifications: string[]   // ["berry_compliant", "taa", "usa_made", "iso_9001"]
  moq: number                // minimum order quantity
  lead_time_weeks: number
  location: string           // "Los Angeles, CA"
  domestic: boolean
```

---

## Key Business Rules

1. **Never mention third-party manufacturers** — Amenity IS the manufacturer to clients
2. **Never mention international production** — domestic only in all client-facing copy
3. **Never expose the backend** — no mention of Firebase, Gmail, or Claude in UI copy
4. **Supply Co. is inbound, not outbound** — agencies look us up; we bid on their contracts
5. **The agent bids on contracts** — sam_contract_agent.py runs daily and is invisible to the public
6. **One SAM.gov registration** — one legal entity (Amenity), two branded products

---

## SAM.gov Agent — Run Commands

```bash
# Install dependencies
pip install -r requirements.txt --break-system-packages

# Fill in config.py first — SAM_API_KEY, ANTHROPIC_API_KEY

# Daily run (last 1 day of opportunities)
python sam_contract_agent.py --days 1

# Backfill / test run (last 7 days)
python sam_contract_agent.py --days 7

# Output
# → output/opportunities_[timestamp].json   (all scored opportunities)
# → output/bid_[sol]_[timestamp].txt        (draft bid for score >= 65)
```

---

## Validation Loop

Run these checks before marking any feature done:

```bash
# 1. HTML — validate no broken references
grep -n "scrollToRFQ\|submitRFQ\|rfqAgency" "gov-landing.html" && echo "FAIL: stale RFQ refs" || echo "PASS"
grep -n "scrollToContact\|submitContact" "gov-landing.html" | head -5

# 2. Python agent — syntax check
python -m py_compile sam_contract_agent.py && echo "PASS: syntax ok" || echo "FAIL"

# 3. Python agent — dry run (no API calls)
python -c "import sam_contract_agent; print('PASS: imports ok')" 2>&1

# 4. Config placeholders check
grep "\[YOUR" config.py && echo "NOTE: placeholders remain — fill before running"

# 5. Line count guard (CLAUDE.md must stay under 300 lines)
wc -l CLAUDE.md | awk '{if($1>300) print "FAIL: CLAUDE.md exceeds 300 lines ("$1")"; else print "PASS: "$1" lines"}'
```

---

## Completed Work — Do Not Redo

- [x] `client-landing.html` — full redesign: dark hero, blue marquee, 8-card catalog grid, AI chat, process steps, modal quote form
- [x] `gov-landing.html` — full redesign: credentials bar, white nav, navy hero, black marquee, capabilities table, NAICS/PSC codes, contact form (NOT RFQ form)
- [x] All "Submit RFQ" CTAs removed from public gov site → replaced with "Contact Us"
- [x] "How It Works" on gov site reframed to: Monitor → Bid → Deliver (outbound, not inbound)
- [x] `sam_contract_agent.py` — scoring (0–100), bid drafting, daily cron support, JSON output
- [x] `config.py` — placeholder config with NAICS codes, PSC codes, scoring weights
- [x] `dashboard.html` — Firebase Auth (Google + email/password), workspace CRUD (Firestore), real-time listener, 3-tab detail panel
- [x] `client-landing.html` — Firebase Auth wired: sign-in modal, auth state listener, nav swaps Sign In → Dashboard + avatar when logged in

---

## Pending Features (build in this order)

1. **Firebase backend** — Firestore manufacturer collection + search Cloud Function
2. **Studio chat → real Firestore queries** — replace mock JS `CAPABILITIES` object in `next-app/src/app/page.tsx` with live API call
3. **Order submission agent** — Firebase function → Claude → Gmail MCP (triggered on quote form submit)
4. **SAM.gov agent scheduler** — daily cron via Cloud Scheduler or GitHub Actions
5. **Admin dashboard** — gated page for Khalil to review bids and order queue (separate from brand dashboard)
6. **Fill Firebase config** — copy `next-app/.env.local.example` → `.env.local` and add real Firebase keys

---

## Rules for Claude

- **Read this file at the start of every session** before writing any code
- **Update this file** when: a feature is completed (move to Completed), a new file is created (add to File Map), a decision is made (add to Business Rules or Architecture)
- **Run the validation loop** before marking a task done
- **/clear between features** — do not carry context from one feature build into the next
- **Never exceed 300 lines** in this file — trim Completed Work entries to one-liners when the list grows
- **Never regenerate completed files** from scratch — use Edit for targeted changes only
- **Prefer targeted edits** (`Edit` tool) over full rewrites unless structure changes completely

