"""Load manufacturers.csv → INSERT statements for the `manufacturers` table.

Default mode: writes manufacturers_seed.sql next to this file. Paste that into
the Supabase SQL editor (or `psql -f`) after schema.sql is applied.

Optional --execute mode: runs the inserts directly using psycopg via
DATABASE_URL (the postgres connection string from the Supabase dashboard,
Settings → Database → Connection string → URI). Service role only; the anon
key won't have write permission.

Usage:
  python load_manufacturers.py                       # write SQL file
  python load_manufacturers.py --execute             # write SQL + run it
  python load_manufacturers.py --csv path/to.csv     # different source
  python load_manufacturers.py --out custom.sql      # different output

The script is idempotent within a single run (it deletes existing rows whose
`name` matches before re-inserting), but does NOT truncate the table.
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
DEFAULT_CSV = HERE / "manufacturers.csv"
DEFAULT_OUT = HERE / "manufacturers_seed.sql"


# ============================================================
# Normalization helpers
# ============================================================
def _clean(s: str | None) -> str:
    return (s or "").strip()


def _nullable(s: str | None) -> str | None:
    s = _clean(s)
    return s or None


def parse_role(raw: str) -> str:
    """Map CSV 'Manufacturer/Supplier' column values to partner_role enum."""
    r = _clean(raw).lower()
    if "printer" in r:
        return "printer"
    if "wholesaler" in r:
        return "supplier"
    if "supplier" in r and "manufacturer" not in r:
        return "supplier"
    # 'Manufacturer' and 'Manufacturer/Supplier' → manufacturer
    return "manufacturer"


# Keyword → capability tags. Order matters only for readability.
CAPABILITY_KEYWORDS: dict[str, list[str]] = {
    "knitwear":             ["knitwear", "cut_sew"],
    "jersey knit":          ["knitwear", "jersey", "cut_sew"],
    "wovens":               ["wovens", "cut_sew"],
    "cut & sew":            ["cut_sew"],
    "denim":                ["denim", "cut_sew"],
    "outerwear":            ["outerwear", "cut_sew"],
    "activewear":           ["activewear", "cut_sew"],
    "athleisure":           ["activewear", "cut_sew"],
    "intimates":            ["intimates", "cut_sew"],
    "loungewear":           ["loungewear", "cut_sew"],
    "swimwear":             ["swimwear", "cut_sew"],
    "formal wear":          ["formal_wear", "cut_sew"],
    "eveningwear":          ["formal_wear", "cut_sew"],
    "footwear":             ["footwear"],
    "shoes":                ["footwear"],
    "headwear":             ["headwear"],
    "accessories":          ["accessories"],
    "leather":              ["leather"],
    "screenprint":          ["screen_print"],
    "screen print":         ["screen_print"],
    "embroidery":           ["embroidery"],
    "french terry":         ["knitwear", "french_terry", "cut_sew"],
    "baby terry":           ["knitwear", "french_terry", "cut_sew"],
    # fabrics / materials
    "cotton":               ["fabric", "cotton"],
    "cashmere":             ["fabric", "cashmere"],
    "wool":                 ["fabric", "wool"],
    "silk":                 ["fabric", "silk"],
    "synthetic":            ["fabric", "synthetic"],
    "artificial":           ["fabric", "synthetic"],
    "recycled polyester":   ["fabric", "recycled_polyester"],
    "recycled":             ["fabric", "recycled"],
    "jacquard":             ["fabric", "jacquard"],
    # jeans (denim variants)
    "jeans":                ["denim", "cut_sew"],
    # other categories surfaced by warnings
    "private label":        ["private_label", "cut_sew"],
    "workwear":             ["workwear", "cut_sew"],
    "medical uniform":      ["uniform", "cut_sew"],
    "uniform":              ["uniform", "cut_sew"],
    "jewelry":              ["jewelry"],
    "skate":                ["streetwear", "cut_sew"],
    "streetwear":           ["streetwear", "cut_sew"],
    "eyewear":              ["eyewear"],
    "custom fabric":        ["fabric", "custom_fabric"],
    "textile printing":     ["fabric", "textile_print"],
    "pattern cutter":       ["pattern_cutting"],
}


def derive_capabilities(category: str, specialty: str = "") -> list[str]:
    """Keyword-scan Category + Specialty, return sorted unique capability tags."""
    text = f"{category} {specialty}".lower()
    tags: set[str] = set()
    for kw, mapped in CAPABILITY_KEYWORDS.items():
        if kw in text:
            tags.update(mapped)
    if category.strip().lower() == "all":
        tags.add("all")  # placeholder — flag for human review
    return sorted(tags)


def parse_brands(raw: str) -> list[str]:
    """Split 'Used By' on commas; drop sentinel 'Available Upon Request'."""
    s = _clean(raw)
    if not s:
        return []
    if "available upon request" in s.lower() or "n/a" in s.lower():
        return []
    return [b.strip() for b in s.split(",") if b.strip()]


def parse_moq(raw: str) -> int | None:
    """'50 pcs' → 50. '' → None. Anything weird → None."""
    s = _clean(raw)
    if not s:
        return None
    m = re.search(r"\d[\d,]*", s)
    if not m:
        return None
    try:
        return int(m.group(0).replace(",", ""))
    except ValueError:
        return None


def parse_email(raw: str) -> str | None:
    """Drop 'Web Form' and other sentinel non-emails."""
    s = _clean(raw)
    if not s:
        return None
    if "@" not in s:
        return None
    return s.lower()


def parse_phone(raw: str) -> str | None:
    s = _clean(raw)
    return s or None


def parse_website(raw: str) -> str | None:
    s = _clean(raw)
    if not s:
        return None
    if not s.lower().startswith(("http://", "https://")):
        s = "https://" + s
    return s


def is_domestic(country: str) -> bool:
    return _clean(country).lower() in {"united states", "usa", "us", "u.s.", "u.s.a."}


# ============================================================
# SQL emission
# ============================================================
def sql_str(s: str | None) -> str:
    """Quote a Postgres string literal. None → NULL."""
    if s is None:
        return "NULL"
    # Use dollar quoting only when the value contains single quotes.
    if "'" in s:
        return "$$" + s + "$$"
    return "'" + s + "'"


def sql_text_array(items: list[str]) -> str:
    """Postgres text[] literal: ARRAY['a','b']::text[] — empty becomes '{}'::text[]."""
    if not items:
        return "'{}'::text[]"
    parts = ", ".join(sql_str(x) for x in items)
    return f"ARRAY[{parts}]::text[]"


def sql_int(n: int | None) -> str:
    return "NULL" if n is None else str(n)


def sql_bool(b: bool) -> str:
    return "true" if b else "false"


def row_to_values(row: dict[str, str]) -> tuple[str, list[str]]:
    """Return (values_clause, warnings)."""
    warnings: list[str] = []

    name = _clean(row.get("Company Name"))
    if not name:
        return "", ["empty Company Name"]

    role = parse_role(row.get("Manufacturer/Supplier", ""))
    category = _nullable(row.get("Category"))
    specialty = _nullable(row.get("Specialty"))
    capabilities = derive_capabilities(category or "", specialty or "")
    if not capabilities:
        warnings.append(f"{name!r}: no capabilities derived from category={category!r}")

    # Printers always do screen_print + embroidery, even if category is blank.
    if role == "printer":
        capabilities = sorted(set(capabilities) | {"screen_print", "embroidery"})

    brands = parse_brands(row.get("Used By", ""))
    moq = parse_moq(row.get("MOQ", ""))
    website = parse_website(row.get("Website", ""))
    email = parse_email(row.get("Email", ""))
    phone = parse_phone(row.get("Phone Number", ""))
    country = _nullable(row.get("Country of Origin"))
    domestic = is_domestic(country or "")

    values = (
        f"({sql_str(name)}, "
        f"'{role}', "
        f"{sql_str(category)}, "
        f"{sql_str(specialty)}, "
        f"{sql_text_array(capabilities)}, "
        f"{sql_text_array(brands)}, "
        f"'{{}}'::text[], "                         # certifications — empty for now
        f"{sql_int(moq)}, "
        f"NULL, "                                    # lead_time_weeks unknown
        f"{sql_str(website)}, "
        f"{sql_str(email)}, "
        f"{sql_str(phone)}, "
        f"{sql_str(country)}, "
        f"{sql_bool(domestic)}, "
        f"NULL)"                                     # notes
    )
    return values, warnings


HEADER = """\
-- Generated by load_manufacturers.py — do not edit by hand.
-- Re-run the script to regenerate.

begin;

-- Idempotent: nuke any existing rows we're about to re-insert by name.
delete from manufacturers where name in ({names});

insert into manufacturers (
  name, role, category, specialty, capabilities, brands, certifications,
  moq, lead_time_weeks, website, contact_email, contact_phone,
  location, domestic, notes
) values
"""


def build_sql(rows: list[dict[str, str]]) -> tuple[str, list[str]]:
    value_clauses: list[str] = []
    names: list[str] = []
    all_warnings: list[str] = []

    for row in rows:
        clause, warnings = row_to_values(row)
        all_warnings.extend(warnings)
        if not clause:
            continue
        value_clauses.append(clause)
        names.append(_clean(row["Company Name"]))

    names_csv = ", ".join(sql_str(n) for n in names)
    body = HEADER.format(names=names_csv) + ",\n".join(value_clauses) + ";\n\ncommit;\n"
    return body, all_warnings


# ============================================================
# Main
# ============================================================
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--execute", action="store_true",
                    help="Also run the SQL via psycopg using DATABASE_URL env var.")
    args = ap.parse_args()

    if not args.csv.exists():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 2

    with args.csv.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    sql, warnings = build_sql(rows)
    args.out.write_text(sql, encoding="utf-8")
    print(f"wrote {args.out}  ({len(rows)} rows, {len(warnings)} warnings)")

    if warnings:
        print("\n--- warnings (first 10) ---")
        for w in warnings[:10]:
            print(f"  {w}")
        if len(warnings) > 10:
            print(f"  ... and {len(warnings) - 10} more")

    if args.execute:
        url = os.environ.get("DATABASE_URL")
        if not url:
            print("DATABASE_URL not set; skipping --execute", file=sys.stderr)
            return 1
        try:
            import psycopg  # type: ignore
        except ImportError:
            print("psycopg not installed: pip install psycopg[binary]", file=sys.stderr)
            return 1
        with psycopg.connect(url) as conn, conn.cursor() as cur:
            cur.execute(sql)
        print("executed against DATABASE_URL")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
