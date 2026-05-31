#!/usr/bin/env python3
"""generate_manufacturer_embeddings.py

Backfills the `embedding` column on the `manufacturers` table using
OpenAI's text-embedding-3-small model (1536 dimensions).

Run this once after applying migration 003_pgvector_manufacturer_embeddings.sql,
and re-run whenever you bulk-import new manufacturer rows.

Usage:
    python supabase/seeds/generate_manufacturer_embeddings.py [--force]

Flags:
    --force   Re-embed rows that already have an embedding (default: skip them).

Required env vars (add to .env or export):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    OPENAI_API_KEY
"""

from __future__ import annotations

import os
import sys
import time
import math
from typing import Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv optional; env vars may already be set

try:
    from openai import OpenAI
except ImportError:
    print("openai package not found. Run: pip install openai --break-system-packages")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("supabase package not found. Run: pip install supabase --break-system-packages")
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMS  = 1536
BATCH_SIZE      = 100   # rows fetched per Supabase page
EMBED_BATCH     = 20    # rows sent per OpenAI batch call (cost / rate-limit safe)
RATE_LIMIT_SLEEP = 0.5  # seconds between OpenAI batches

FORCE = "--force" in sys.argv


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def build_embedding_text(row: dict[str, Any]) -> str:
    """Produce a rich text blob that captures all searchable facets of a
    manufacturer, so the embedding space encodes capability + geography +
    certification signals together."""
    parts: list[str] = []

    parts.append(row.get("name") or "")

    role = row.get("role") or ""
    if role:
        parts.append(role.replace("_", " "))

    category = row.get("category") or ""
    if category:
        parts.append(f"Category: {category}")

    specialty = row.get("specialty") or ""
    if specialty:
        parts.append(f"Specialty: {specialty}")

    caps = row.get("capabilities") or []
    if caps:
        parts.append("Capabilities: " + ", ".join(caps))

    certs = row.get("certifications") or []
    if certs:
        parts.append("Certifications: " + ", ".join(certs))

    brands = row.get("brands") or []
    if brands:
        parts.append("Used by: " + ", ".join(brands[:10]))  # cap at 10

    location = row.get("location") or ""
    if location:
        parts.append(f"Location: {location}")

    if row.get("domestic"):
        parts.append("Domestic manufacturer.")

    moq = row.get("moq")
    if moq is not None:
        parts.append(f"MOQ: {moq}")

    lead = row.get("lead_time_weeks")
    if lead is not None:
        parts.append(f"Lead time: {lead} weeks")

    notes = row.get("notes") or ""
    if notes:
        parts.append(notes[:300])  # cap notes length

    return ". ".join(filter(None, parts))


def fetch_all_manufacturers(client: Any, force: bool) -> list[dict[str, Any]]:
    """Page through all manufacturer rows. If force=False, skip rows that
    already have an embedding."""
    rows: list[dict[str, Any]] = []
    page = 0

    while True:
        q = (
            client.table("manufacturers")
            .select(
                "id, name, role, category, specialty, capabilities, "
                "certifications, brands, location, domestic, moq, "
                "lead_time_weeks, notes, embedding"
            )
            .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1)
            .execute()
        )
        batch = q.data or []
        if not batch:
            break

        for row in batch:
            if force or not row.get("embedding"):
                rows.append(row)

        if len(batch) < BATCH_SIZE:
            break
        page += 1

    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    oai = OpenAI(api_key=OPENAI_API_KEY)

    print(f"Fetching manufacturers (force={FORCE})…")
    rows = fetch_all_manufacturers(db, FORCE)
    total = len(rows)

    if total == 0:
        print("Nothing to embed — all rows already have embeddings. Use --force to re-embed.")
        return

    print(f"Embedding {total} rows in batches of {EMBED_BATCH}…")
    num_batches = math.ceil(total / EMBED_BATCH)
    processed = 0
    errors = 0

    for i in range(num_batches):
        batch = rows[i * EMBED_BATCH : (i + 1) * EMBED_BATCH]
        texts = [build_embedding_text(r) for r in batch]

        try:
            response = oai.embeddings.create(
                model=EMBEDDING_MODEL,
                input=texts,
                dimensions=EMBEDDING_DIMS,
            )
        except Exception as e:
            print(f"  [batch {i+1}/{num_batches}] OpenAI error: {e}")
            errors += len(batch)
            time.sleep(RATE_LIMIT_SLEEP * 4)
            continue

        for row, emb_obj in zip(batch, response.data):
            vector = emb_obj.embedding
            try:
                db.table("manufacturers").update(
                    {"embedding": vector}
                ).eq("id", row["id"]).execute()
                processed += 1
            except Exception as e:
                print(f"  Supabase update failed for {row['id']}: {e}")
                errors += 1

        pct = round((i + 1) / num_batches * 100)
        print(f"  Batch {i+1}/{num_batches} ({pct}%) — {processed} done, {errors} errors")

        if i < num_batches - 1:
            time.sleep(RATE_LIMIT_SLEEP)

    print(f"\nDone. {processed} embeddings written, {errors} errors.")
    if errors:
        print("Re-run with --force to retry failed rows.")


if __name__ == "__main__":
    main()
