-- =========================================================================
-- 003_pgvector_manufacturer_embeddings.sql
--
-- Enables vector similarity search on the `manufacturers` table so Liai
-- can retrieve semantically relevant matches for a sourcing brief.
--
-- Requires pgvector ≥ 0.5.0 (available on all Supabase projects).
--
-- Apply via:
--   Supabase Dashboard → SQL Editor → paste and Run
--   or: supabase db push (if using local CLI + linked project)
--
-- After applying, run:
--   python supabase/seeds/generate_manufacturer_embeddings.py
-- to populate the `embedding` column for all existing rows.
-- =========================================================================

-- ----------------------------------------------------------------
-- Extension
-- ----------------------------------------------------------------
create extension if not exists vector;

-- ----------------------------------------------------------------
-- Column — text-embedding-3-small produces 1536-dim vectors
-- ----------------------------------------------------------------
alter table manufacturers
  add column if not exists embedding vector(1536);

-- ----------------------------------------------------------------
-- HNSW index — fast approximate cosine-distance search.
-- m=16 / ef_construction=64 are sensible defaults for ≤10k rows.
-- ----------------------------------------------------------------
create index if not exists manufacturers_embedding_hnsw_idx
  on manufacturers
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ----------------------------------------------------------------
-- RPC: match_manufacturers
--
-- Called by the sourcing API to retrieve the top-N most similar
-- manufacturers for a given brief embedding.
--
-- Args:
--   query_embedding  — 1536-dim vector of the user's brief
--   match_count      — how many results to return (default 10)
--   min_similarity   — cosine similarity floor (default 0.40)
--
-- Returns one row per match, sorted best-first, with similarity.
-- ----------------------------------------------------------------
create or replace function match_manufacturers(
  query_embedding  vector(1536),
  match_count      int     default 10,
  min_similarity   float   default 0.40
)
returns table (
  id               uuid,
  name             text,
  role             partner_role,
  category         text,
  specialty        text,
  capabilities     text[],
  certifications   text[],
  brands           text[],
  moq              int,
  lead_time_weeks  int,
  website          text,
  contact_email    text,
  contact_phone    text,
  location         text,
  domestic         boolean,
  notes            text,
  similarity       float
)
language sql stable
as $$
  select
    m.id,
    m.name,
    m.role,
    m.category,
    m.specialty,
    m.capabilities,
    m.certifications,
    m.brands,
    m.moq,
    m.lead_time_weeks,
    m.website,
    m.contact_email,
    m.contact_phone,
    m.location,
    m.domestic,
    m.notes,
    (1 - (m.embedding <=> query_embedding))::float as similarity
  from manufacturers m
  where
    m.embedding is not null
    and (1 - (m.embedding <=> query_embedding)) >= min_similarity
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- Grant anon + authenticated roles permission to call this RPC
-- (manufacturer data is already publicly readable via RLS SELECT policy).
grant execute on function match_manufacturers(vector, int, float)
  to anon, authenticated;

-- ================================================================
-- Done.  Next: run generate_manufacturer_embeddings.py
-- ================================================================
