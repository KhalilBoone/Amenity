#!/usr/bin/env node
/**
 * scripts/02_merge_and_deduplicate.js
 *
 * Merges manufacturers from three sources (manual, cfda, recommended) and
 * deduplicates them in three passes:
 *
 *   Pass 1 — slug exact match
 *            (already enforced by the unique constraint on `slug`, but we
 *             still verify and act on any collisions for defense in depth).
 *   Pass 2 — normalized name exact match
 *            (lowercase, strip punctuation/diacritics, drop trailing legal
 *             suffixes like "Inc", "LLC", collapse whitespace).
 *   Pass 3 — fuzzy name match (Levenshtein distance ≤ 2 on the normalized
 *            name) to catch typos like "ABC Apparel" vs "ABC Apparell".
 *
 * Conflict resolution:
 *   Source priority is manual > recommended > cfda. The winner keeps its id.
 *   Non-null fields from the loser are merged into the winner ONLY where the
 *   winner's value is null/empty. Array-valued fields (capabilities, brands,
 *   certifications) are unioned. The loser row is deleted.
 *
 * Every merge decision is appended to dedup_log.json at the project root.
 *
 * Usage:
 *   node scripts/02_merge_and_deduplicate.js              # dry-run (default)
 *   node scripts/02_merge_and_deduplicate.js --apply      # commit changes
 *
 * Required env (loaded from .env via dotenv):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

'use strict';

require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

// ---- Config ----------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const FUZZY_THRESHOLD = 2;

// Higher number wins. Unknown sources fall through to 0.
const SOURCE_PRIORITY = { manual: 3, recommended: 2, cfda: 1 };

// Scalar fields we'll backfill from loser → winner when the winner is empty.
const MERGEABLE_SCALAR_FIELDS = [
  'category',
  'specialty',
  'website',
  'contact_email',
  'contact_phone',
  'location',
  'notes',
  'moq',
  'lead_time_weeks',
  'domestic',
];

// Array fields we'll union.
const MERGEABLE_ARRAY_FIELDS = ['capabilities', 'brands', 'certifications'];

const LOG_PATH = path.resolve(__dirname, '..', 'dedup_log.json');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---- Helpers ---------------------------------------------------------------

/** Normalize a manufacturer name. Mirrors the SQL `normalize_manufacturer_name`
 *  function in migrations/002_add_normalized_name.sql — keep them in sync. */
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')        // strip diacritics
    .replace(/[^a-z0-9\s]/g, ' ')           // strip punctuation
    .replace(/\s+(inc|llc|ltd|co|corp|corporation|company|gmbh|limited|incorporated)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Iterative Levenshtein with early exit when the running minimum exceeds
 *  maxDistance. Returns maxDistance + 1 if the true distance exceeds the cap. */
function levenshtein(a, b, maxDistance = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost      // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function isEmpty(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Returns [winner, loser] for a pair, applying source-priority + created_at
 *  tie-break (older row wins). */
function pickWinner(a, b) {
  const pa = SOURCE_PRIORITY[a.source] ?? 0;
  const pb = SOURCE_PRIORITY[b.source] ?? 0;
  if (pa !== pb) return pa > pb ? [a, b] : [b, a];
  const ca = a.created_at ? Date.parse(a.created_at) : Infinity;
  const cb = b.created_at ? Date.parse(b.created_at) : Infinity;
  return ca <= cb ? [a, b] : [b, a];
}

/** Compute the patch to apply to `winner` from `loser`'s data. */
function mergeFields(winner, loser) {
  const updates = {};

  for (const f of MERGEABLE_SCALAR_FIELDS) {
    if (isEmpty(winner[f]) && !isEmpty(loser[f])) {
      updates[f] = loser[f];
    }
  }

  for (const f of MERGEABLE_ARRAY_FIELDS) {
    const w = Array.isArray(winner[f]) ? winner[f] : [];
    const l = Array.isArray(loser[f]) ? loser[f] : [];
    if (l.length === 0) continue;
    const merged = Array.from(new Set([...w, ...l]));
    if (merged.length !== w.length) updates[f] = merged;
  }

  return updates;
}

async function fetchAllManufacturers() {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  // Supabase caps single SELECT at 1000 rows; paginate via .range().
  for (;;) {
    const { data, error } = await supabase
      .from('manufacturers')
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function applyMerge(winner, loser, updates) {
  if (!APPLY) return;
  if (Object.keys(updates).length > 0) {
    const { error: uErr } = await supabase
      .from('manufacturers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', winner.id);
    if (uErr) throw uErr;
  }
  const { error: dErr } = await supabase
    .from('manufacturers')
    .delete()
    .eq('id', loser.id);
  if (dErr) throw dErr;
}

function summary(row) {
  return { id: row.id, name: row.name, slug: row.slug, source: row.source };
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (writes will be committed)' : 'DRY-RUN (no writes)'}`);

  const rows = await fetchAllManufacturers();
  console.log(`Fetched ${rows.length} manufacturers.`);

  const counts = rows.reduce((acc, r) => {
    acc[r.source ?? 'unknown'] = (acc[r.source ?? 'unknown'] ?? 0) + 1;
    return acc;
  }, {});
  for (const s of Object.keys(counts)) {
    console.log(`  ${s}: ${counts[s]}`);
  }

  const log = {
    started_at: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    totals: { input: rows.length, by_source: counts },
    decisions: [],
  };

  // Working set keyed by id; precompute normalized names once.
  const alive = new Map(
    rows.map(r => [r.id, { ...r, _norm: normalizeName(r.name) }])
  );
  const absorbed = new Set();

  // ----- Pass 1: slug exact match -----
  {
    const idx = new Map();
    for (const r of alive.values()) {
      if (!r.slug) continue;
      if (!idx.has(r.slug)) idx.set(r.slug, []);
      idx.get(r.slug).push(r);
    }
    for (const [slug, group] of idx) {
      if (group.length < 2) continue;
      group.sort(
        (a, b) => (SOURCE_PRIORITY[b.source] ?? 0) - (SOURCE_PRIORITY[a.source] ?? 0)
      );
      const winner = group[0];
      for (let i = 1; i < group.length; i++) {
        const loser = group[i];
        const updates = mergeFields(winner, loser);
        log.decisions.push({
          pass: 'slug',
          key: slug,
          winner: summary(winner),
          loser: summary(loser),
          merged_fields: Object.keys(updates),
          updates,
        });
        await applyMerge(winner, loser, updates);
        Object.assign(winner, updates);
        absorbed.add(loser.id);
        alive.delete(loser.id);
      }
    }
  }

  // ----- Pass 2: normalized name exact match -----
  {
    const idx = new Map();
    for (const r of alive.values()) {
      if (!r._norm) continue;
      if (!idx.has(r._norm)) idx.set(r._norm, []);
      idx.get(r._norm).push(r);
    }
    for (const [norm, group] of idx) {
      if (group.length < 2) continue;
      group.sort(
        (a, b) => (SOURCE_PRIORITY[b.source] ?? 0) - (SOURCE_PRIORITY[a.source] ?? 0)
      );
      const winner = group[0];
      for (let i = 1; i < group.length; i++) {
        const loser = group[i];
        const updates = mergeFields(winner, loser);
        log.decisions.push({
          pass: 'normalized_name',
          key: norm,
          winner: summary(winner),
          loser: summary(loser),
          merged_fields: Object.keys(updates),
          updates,
        });
        await applyMerge(winner, loser, updates);
        Object.assign(winner, updates);
        absorbed.add(loser.id);
        alive.delete(loser.id);
      }
    }
  }

  // ----- Pass 3: fuzzy match (Levenshtein ≤ FUZZY_THRESHOLD on _norm) -----
  // O(n^2) over the post-pass-2 survivors. With early exit on rowMin > cap,
  // each comparison is effectively O(min(L,FUZZY_THRESHOLD)*max(L)) and the
  // overall pass stays well under a second for ~1k rows.
  {
    const remaining = Array.from(alive.values());
    for (let i = 0; i < remaining.length; i++) {
      const a = remaining[i];
      if (absorbed.has(a.id)) continue;
      if (!a._norm) continue;
      for (let j = i + 1; j < remaining.length; j++) {
        const b = remaining[j];
        if (absorbed.has(b.id)) continue;
        if (!b._norm) continue;
        if (a._norm === b._norm) continue;       // already handled in pass 2
        const d = levenshtein(a._norm, b._norm, FUZZY_THRESHOLD);
        if (d > FUZZY_THRESHOLD) continue;

        const [winner, loser] = pickWinner(a, b);
        const updates = mergeFields(winner, loser);
        log.decisions.push({
          pass: 'fuzzy',
          distance: d,
          winner: summary(winner),
          loser: summary(loser),
          merged_fields: Object.keys(updates),
          updates,
        });
        await applyMerge(winner, loser, updates);
        Object.assign(winner, updates);
        absorbed.add(loser.id);
        alive.delete(loser.id);
      }
    }
  }

  log.totals.duplicates_found = log.decisions.length;
  log.totals.remaining = alive.size;
  log.totals.by_pass = log.decisions.reduce((acc, d) => {
    acc[d.pass] = (acc[d.pass] ?? 0) + 1;
    return acc;
  }, {});
  log.finished_at = new Date().toISOString();

  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2));

  console.log('');
  console.log(`Duplicates found:     ${log.decisions.length}`);
  console.log(`  by slug:            ${log.totals.by_pass.slug ?? 0}`);
  console.log(`  by normalized name: ${log.totals.by_pass.normalized_name ?? 0}`);
  console.log(`  by fuzzy match:     ${log.totals.by_pass.fuzzy ?? 0}`);
  console.log(`Remaining rows:       ${alive.size}`);
  console.log(`Log written to:       ${LOG_PATH}`);
  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to commit changes.');
  }
}

main().catch(err => {
  console.error('Dedup failed:', err);
  process.exit(1);
});
