-- =========================================================================
-- 002_add_normalized_name.sql
--
-- Adds a generated `normalized_name` column to `manufacturers` and a unique
-- index on it, so duplicates that survive at the application layer are
-- rejected at the DB layer.
--
-- ORDER OF OPERATIONS:
--   1. Run this migration up to (but not including) the unique-index step.
--   2. Run scripts/02_merge_and_deduplicate.js --apply to clean up existing
--      duplicates (the unique index will refuse to build if any remain).
--   3. Run the unique-index step at the bottom of this file.
--
-- The file is split into two transactional blocks so you can apply them
-- independently. If you are confident there are no duplicates, you can run
-- the whole file at once.
-- =========================================================================

-- -----------------------------------------------------------------------
-- Step 1 — function + generated column. Safe to run any time.
-- -----------------------------------------------------------------------
begin;

-- Normalization rules:
--   * lowercase
--   * strip everything that isn't [a-z0-9\s] (punctuation, diacritics, etc.)
--   * drop trailing legal suffixes (inc, llc, ltd, co, corp, corporation,
--     company, gmbh, limited, incorporated)
--   * collapse whitespace, trim
--
-- Must be IMMUTABLE so it can be referenced from a STORED generated column
-- and a unique index expression.
create or replace function normalize_manufacturer_name(input text)
returns text
language sql
immutable
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(input, '')), '[^a-z0-9\s]', ' ', 'g'),
        '\s+(inc|llc|ltd|co|corp|corporation|company|gmbh|limited|incorporated)\s*$',
        '',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

alter table manufacturers
  add column if not exists normalized_name text
  generated always as (normalize_manufacturer_name(name)) stored;

-- Non-unique index up front so app-layer queries against normalized_name are
-- fast even before we promote the constraint to UNIQUE.
create index if not exists manufacturers_normalized_name_idx
  on manufacturers (normalized_name);

commit;

-- -----------------------------------------------------------------------
-- Step 2 — unique index. Run AFTER scripts/02_merge_and_deduplicate.js.
-- This will fail if duplicates still exist; that failure is the point.
-- -----------------------------------------------------------------------
-- begin;
--
-- drop index if exists manufacturers_normalized_name_idx;
--
-- create unique index manufacturers_normalized_name_uniq
--   on manufacturers (normalized_name);
--
-- commit;
