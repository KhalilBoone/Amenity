-- =========================================================================
-- 004_organizations_and_pim.sql
--
-- Adds multi-tenant foundations (organizations + members) and the Product
-- Information Management (PIM) tables.
--
-- Every PIM table is scoped to an org_id. RLS ensures users can only read
-- and write records that belong to an org they are a member of.
--
-- Apply via:
--   Supabase Dashboard → SQL Editor → paste and Run
-- =========================================================================

-- ----------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------
do $$ begin
  create type org_member_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pim_product_status as enum ('draft', 'active', 'archived', 'discontinued');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pim_attribute_type as enum (
    'text', 'number', 'boolean', 'select', 'multi_select', 'date', 'url', 'color'
  );
exception when duplicate_object then null; end $$;

-- ================================================================
-- Multi-tenancy foundation
-- ================================================================

-- ----------------------------------------------------------------
-- organizations — the top-level tenant unit
-- ----------------------------------------------------------------
create table if not exists organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,           -- used in URLs; URL-safe, lowercase
  plan         text not null default 'free',   -- 'free' | 'starter' | 'pro' | 'enterprise'
  logo_url     text,
  website      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists orgs_slug_idx on organizations (slug);

-- ----------------------------------------------------------------
-- org_members — users belonging to an org with a role
-- ----------------------------------------------------------------
create table if not exists org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       org_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists org_members_org_idx  on org_members (org_id);
create index if not exists org_members_user_idx on org_members (user_id);

-- ================================================================
-- PIM tables
-- ================================================================

-- ----------------------------------------------------------------
-- pim_categories — hierarchical product categories (per org)
-- ----------------------------------------------------------------
create table if not exists pim_categories (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  parent_id   uuid references pim_categories(id) on delete set null,
  name        text not null,
  slug        text not null,
  description text,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (org_id, slug)
);

create index if not exists pim_categories_org_idx    on pim_categories (org_id);
create index if not exists pim_categories_parent_idx on pim_categories (parent_id);

-- ----------------------------------------------------------------
-- pim_attribute_definitions — org-level schema for flexible attrs
-- Defines what attributes exist; pim_products.attributes stores values.
-- ----------------------------------------------------------------
create table if not exists pim_attribute_definitions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  key          text not null,                  -- machine key, e.g. "fabric_weight"
  type         pim_attribute_type not null default 'text',
  unit         text,                           -- e.g. "gsm", "oz", "cm"
  options      jsonb not null default '[]',   -- for select / multi_select
  required     boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  unique (org_id, key)
);

create index if not exists pim_attr_defs_org_idx on pim_attribute_definitions (org_id);

-- ----------------------------------------------------------------
-- pim_products — canonical product records (one per product per org)
-- ----------------------------------------------------------------
create table if not exists pim_products (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  category_id     uuid references pim_categories(id) on delete set null,
  name            text not null,
  slug            text not null,
  description     text,
  short_description text,
  status          pim_product_status not null default 'draft',
  -- Flexible attributes — keyed by pim_attribute_definitions.key
  attributes      jsonb not null default '{}'::jsonb,
  -- Sourcing / cost fields (internal, not shown on public storefronts)
  supplier_id     uuid references manufacturers(id) on delete set null,
  hs_code         text,                         -- harmonised tariff code
  country_of_origin text,
  -- SEO
  meta_title      text,
  meta_description text,
  -- Timestamps
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, slug)
);

create index if not exists pim_products_org_idx      on pim_products (org_id);
create index if not exists pim_products_status_idx   on pim_products (status);
create index if not exists pim_products_category_idx on pim_products (category_id);
create index if not exists pim_products_supplier_idx on pim_products (supplier_id);
create index if not exists pim_products_name_trgm_idx
  on pim_products using gin (name gin_trgm_ops);

-- ----------------------------------------------------------------
-- pim_variants — SKU-level records for a product
-- Each variant is a unique (product + attribute combination), e.g.
-- color=Black, size=L. Attributes stored as jsonb for flexibility.
-- ----------------------------------------------------------------
create table if not exists pim_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references pim_products(id) on delete cascade,
  sku             text not null,
  name            text,                         -- e.g. "Black / L"
  attributes      jsonb not null default '{}'::jsonb, -- {color:"Black", size:"L"}
  -- Pricing
  price           numeric(10,2),
  compare_at_price numeric(10,2),               -- crossed-out "was" price
  cost            numeric(10,2),                -- COGS (internal)
  -- Inventory
  inventory_count int,
  tracks_inventory boolean not null default false,
  -- Fulfillment
  weight_g        int,
  barcode         text,
  position        int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (product_id, sku)
);

create index if not exists pim_variants_product_idx on pim_variants (product_id);
create index if not exists pim_variants_sku_idx     on pim_variants (sku);

-- ----------------------------------------------------------------
-- pim_media — images and files attached to a product
-- ----------------------------------------------------------------
create table if not exists pim_media (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references pim_products(id) on delete cascade,
  variant_id  uuid references pim_variants(id) on delete set null,
  url         text not null,
  alt         text,
  mime        text,
  width_px    int,
  height_px   int,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists pim_media_product_idx on pim_media (product_id);
create index if not exists pim_media_variant_idx on pim_media (variant_id);

-- ----------------------------------------------------------------
-- pim_lifecycle_stages — per-org configurable PLM stages
-- ----------------------------------------------------------------
create table if not exists pim_lifecycle_stages (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null,                    -- e.g. "Ideation", "Proto", "Active"
  color      text not null default '#6b7280',  -- hex for UI badge
  position   int  not null default 0,
  is_terminal boolean not null default false,  -- archived / discontinued / dead
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index if not exists pim_stages_org_idx on pim_lifecycle_stages (org_id);

-- ----------------------------------------------------------------
-- pim_product_lifecycle — tracks which stage a product is in + history
-- ----------------------------------------------------------------
create table if not exists pim_product_lifecycle (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references pim_products(id) on delete cascade,
  stage_id    uuid not null references pim_lifecycle_stages(id) on delete restrict,
  notes       text,
  changed_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists pim_plc_product_idx on pim_product_lifecycle (product_id);
create index if not exists pim_plc_stage_idx   on pim_product_lifecycle (stage_id);

-- ================================================================
-- Updated-at triggers
-- ================================================================
drop trigger if exists trg_organizations_updated on organizations;
create trigger trg_organizations_updated before update on organizations
  for each row execute function set_updated_at();

drop trigger if exists trg_pim_products_updated on pim_products;
create trigger trg_pim_products_updated before update on pim_products
  for each row execute function set_updated_at();

drop trigger if exists trg_pim_variants_updated on pim_variants;
create trigger trg_pim_variants_updated before update on pim_variants
  for each row execute function set_updated_at();

-- ================================================================
-- Row Level Security
-- ================================================================

alter table organizations            enable row level security;
alter table org_members              enable row level security;
alter table pim_categories           enable row level security;
alter table pim_attribute_definitions enable row level security;
alter table pim_products             enable row level security;
alter table pim_variants             enable row level security;
alter table pim_media                enable row level security;
alter table pim_lifecycle_stages     enable row level security;
alter table pim_product_lifecycle    enable row level security;

-- ── Helper: is_org_member(org_id) ──────────────────────────────────────────
-- Returns true if the current auth.uid() is a member of the given org.
-- Used in all PIM RLS policies so they stay DRY.
create or replace function is_org_member(p_org_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = auth.uid()
  );
$$;

-- ── Helper: is_org_admin(org_id) ───────────────────────────────────────────
create or replace function is_org_admin(p_org_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ── organizations ──────────────────────────────────────────────────────────
drop policy if exists orgs_select_member on organizations;
create policy orgs_select_member on organizations
  for select to authenticated
  using (is_org_member(id));

drop policy if exists orgs_insert_auth on organizations;
create policy orgs_insert_auth on organizations
  for insert to authenticated
  with check (true);  -- any authenticated user can create an org

drop policy if exists orgs_update_admin on organizations;
create policy orgs_update_admin on organizations
  for update to authenticated
  using (is_org_admin(id))
  with check (is_org_admin(id));

-- ── org_members ────────────────────────────────────────────────────────────
drop policy if exists org_members_select on org_members;
create policy org_members_select on org_members
  for select to authenticated
  using (is_org_member(org_id));

drop policy if exists org_members_insert_admin on org_members;
create policy org_members_insert_admin on org_members
  for insert to authenticated
  with check (
    -- Owners/admins can add members; users can add themselves as owner on new orgs.
    is_org_admin(org_id) or user_id = auth.uid()
  );

drop policy if exists org_members_delete_admin on org_members;
create policy org_members_delete_admin on org_members
  for delete to authenticated
  using (is_org_admin(org_id) or user_id = auth.uid());

-- ── pim_categories ─────────────────────────────────────────────────────────
drop policy if exists pim_categories_member_select on pim_categories;
create policy pim_categories_member_select on pim_categories
  for select to authenticated using (is_org_member(org_id));

drop policy if exists pim_categories_admin_write on pim_categories;
create policy pim_categories_admin_write on pim_categories
  for all to authenticated
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));

-- ── pim_attribute_definitions ──────────────────────────────────────────────
drop policy if exists pim_attr_defs_member_select on pim_attribute_definitions;
create policy pim_attr_defs_member_select on pim_attribute_definitions
  for select to authenticated using (is_org_member(org_id));

drop policy if exists pim_attr_defs_admin_write on pim_attribute_definitions;
create policy pim_attr_defs_admin_write on pim_attribute_definitions
  for all to authenticated
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));

-- ── pim_products ───────────────────────────────────────────────────────────
drop policy if exists pim_products_member_select on pim_products;
create policy pim_products_member_select on pim_products
  for select to authenticated using (is_org_member(org_id));

drop policy if exists pim_products_member_write on pim_products;
create policy pim_products_member_write on pim_products
  for all to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- ── pim_variants ───────────────────────────────────────────────────────────
drop policy if exists pim_variants_member_select on pim_variants;
create policy pim_variants_member_select on pim_variants
  for select to authenticated
  using (
    product_id in (
      select id from pim_products where is_org_member(org_id)
    )
  );

drop policy if exists pim_variants_member_write on pim_variants;
create policy pim_variants_member_write on pim_variants
  for all to authenticated
  using (
    product_id in (
      select id from pim_products where is_org_member(org_id)
    )
  )
  with check (
    product_id in (
      select id from pim_products where is_org_member(org_id)
    )
  );

-- ── pim_media ──────────────────────────────────────────────────────────────
drop policy if exists pim_media_member_select on pim_media;
create policy pim_media_member_select on pim_media
  for select to authenticated
  using (
    product_id in (
      select id from pim_products where is_org_member(org_id)
    )
  );

drop policy if exists pim_media_member_write on pim_media;
create policy pim_media_member_write on pim_media
  for all to authenticated
  using (
    product_id in (
      select id from pim_products where is_org_member(org_id)
    )
  )
  with check (
    product_id in (
      select id from pim_products where is_org_member(org_id)
    )
  );

-- ── pim_lifecycle_stages ───────────────────────────────────────────────────
drop policy if exists pim_stages_member_select on pim_lifecycle_stages;
create policy pim_stages_member_select on pim_lifecycle_stages
  for select to authenticated using (is_org_member(org_id));

drop policy if exists pim_stages_admin_write on pim_lifecycle_stages;
create policy pim_stages_admin_write on pim_lifecycle_stages
  for all to authenticated
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));

-- ── pim_product_lifecycle ──────────────────────────────────────────────────
drop policy if exists pim_plc_member_select on pim_product_lifecycle;
create policy pim_plc_member_select on pim_product_lifecycle
  for select to authenticated
  using (
    product_id in (
      select id from pim_products where is_org_member(org_id)
    )
  );

drop policy if exists pim_plc_member_insert on pim_product_lifecycle;
create policy pim_plc_member_insert on pim_product_lifecycle
  for insert to authenticated
  with check (
    product_id in (
      select id from pim_products where is_org_member(org_id)
    )
  );

-- ================================================================
-- Done.
-- ================================================================
