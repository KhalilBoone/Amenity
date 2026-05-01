-- studio-app — Supabase schema
-- ----------------------------------------------------------------
-- Apply via:
--   • Supabase Dashboard → SQL Editor → paste this whole file → Run
--   • or `supabase db reset` (local dev) after copying to migrations/
--
-- The file is idempotent: re-running drops and re-creates RLS
-- policies and triggers, `if not exists` guards every CREATE, and
-- `alter table … add column if not exists` blocks pull new columns
-- onto pre-existing tables.
--
-- IF YOU SEE 42703 "column does not exist" ON FIRST APPLY:
--   Your project has a leftover table from an old setup that lacks
--   the new columns. Run supabase/reset.sql first, then re-apply
--   this file.
-- ================================================================

-- ----------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------
create extension if not exists pgcrypto;     -- gen_random_uuid()
create extension if not exists pg_trgm;      -- fuzzy search on names

-- ----------------------------------------------------------------
-- Enums  (do/exception block makes CREATE TYPE idempotent)
-- ----------------------------------------------------------------
do $$ begin
  create type order_status as enum (
    'intake', 'compliance', 'routing', 'fulfillment',
    'qa', 'shipped', 'invoiced', 'closed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type bid_status as enum (
    'discovered', 'scored', 'drafted', 'submitted', 'won', 'lost', 'skipped'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type comms_channel as enum ('email', 'sms', 'in_app');
exception when duplicate_object then null; end $$;

do $$ begin
  create type partner_role as enum ('manufacturer', 'supplier', 'printer', 'agent', 'broker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_type as enum ('studio', 'blanks');
exception when duplicate_object then null; end $$;

do $$ begin
  -- 'dropship' = supplier ships direct; 'private_label' = Amenity-branded inventory
  create type sourcing_type as enum ('dropship', 'private_label');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fulfillment_status as enum (
    'pending', 'forwarded', 'in_production', 'shipped', 'delivered', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ================================================================
-- Tables
-- ================================================================

-- ----------------------------------------------------------------
-- manufacturers — production partners (CSV-aligned)
-- ----------------------------------------------------------------
create table if not exists manufacturers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  role            partner_role not null default 'manufacturer',  -- CSV "Manufacturer/Supplier"
  category        text,                                          -- CSV "Category" (raw, e.g. 'Jersey Knitwear')
  specialty       text,                                          -- CSV "Specialty"
  capabilities    text[] not null default '{}',                  -- normalised tags ['cut_sew','screen_print']
  brands          text[] not null default '{}',                  -- CSV "Used By" split on commas
  certifications  text[] not null default '{}',                  -- ['berry_compliant','taa']
  moq             int,                                           -- CSV "MOQ"
  lead_time_weeks int,
  website         text,                                          -- CSV "Website"
  contact_email   text,                                          -- CSV "Email"
  contact_phone   text,                                          -- CSV "Phone Number"
  location        text,                                          -- CSV "Country of Origin"
  domestic        boolean not null default false,                -- derive from location='United States'
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists manufacturers_name_trgm_idx
  on manufacturers using gin (name gin_trgm_ops);
create index if not exists manufacturers_capabilities_idx
  on manufacturers using gin (capabilities);
create index if not exists manufacturers_brands_idx
  on manufacturers using gin (brands);
create index if not exists manufacturers_certs_idx
  on manufacturers using gin (certifications);
create index if not exists manufacturers_domestic_idx
  on manufacturers (domestic);

-- ----------------------------------------------------------------
-- brands — Studio clients (linked to a Supabase auth user)
-- ----------------------------------------------------------------
create table if not exists brands (
  id                  uuid primary key default gen_random_uuid(),
  owner_uid           uuid references auth.users(id) on delete set null,
  name                text not null,
  contact_email       text,
  stripe_customer_id  text,                                  -- populated by invoicing node
  created_at          timestamptz not null default now()
);

-- Defensive: re-apply onto an older brands table.
alter table brands add column if not exists stripe_customer_id text;

create index if not exists brands_owner_idx on brands (owner_uid);
create index if not exists brands_stripe_customer_idx on brands (stripe_customer_id) where stripe_customer_id is not null;

-- ----------------------------------------------------------------
-- orders — Studio side
-- ----------------------------------------------------------------
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid references brands(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,  -- buyer (used by blanks orders without a brand)
  order_type      order_type not null default 'studio',
  status          order_status not null default 'intake',
  -- Studio-specific (custom manufacturing run) ----------------------
  product_type    text,
  quantity        int,
  target_price    numeric(10,2),
  due_date        date,
  spec            jsonb not null default '{}'::jsonb,
  compliance      jsonb not null default '{}'::jsonb,
  manufacturer_id uuid references manufacturers(id) on delete set null,
  routing_score   numeric(5,2),
  routing_reasons jsonb,
  po_number       text,
  qa_results      jsonb,
  qa_passed       boolean,
  -- Blanks-specific (e-commerce checkout) --------------------------
  shipping_address_id uuid,                           -- FK added below after shipping_addresses table
  subtotal        numeric(10,2),
  shipping_cost   numeric(10,2),
  tax             numeric(10,2),
  total           numeric(10,2),
  currency        text not null default 'USD',
  stripe_session_id        text,
  stripe_payment_intent_id text,
  -- Audit ----------------------------------------------------------
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Defensive: pull in columns we may have added since the table was first
-- created on this project. `create table if not exists` does NOT add new
-- columns to an existing table, so we ALTER each in idempotently. Without
-- this, re-applying onto an older `orders` table breaks the index DDL.
alter table orders add column if not exists user_id                  uuid references auth.users(id) on delete set null;
alter table orders add column if not exists order_type               order_type      not null default 'studio';
alter table orders add column if not exists shipping_address_id      uuid;
alter table orders add column if not exists subtotal                 numeric(10,2);
alter table orders add column if not exists shipping_cost            numeric(10,2);
alter table orders add column if not exists tax                      numeric(10,2);
alter table orders add column if not exists total                    numeric(10,2);
alter table orders add column if not exists currency                 text            not null default 'USD';
alter table orders add column if not exists stripe_session_id        text;
alter table orders add column if not exists stripe_payment_intent_id text;
alter table orders add column if not exists po_number                text;
alter table orders add column if not exists qa_passed                boolean;

create index if not exists orders_status_idx        on orders (status);
create index if not exists orders_type_idx          on orders (order_type);
create index if not exists orders_brand_idx         on orders (brand_id);
create index if not exists orders_user_idx          on orders (user_id);
create index if not exists orders_manufacturer_idx  on orders (manufacturer_id);
create index if not exists orders_due_date_idx      on orders (due_date);

-- ================================================================
-- Blanks e-commerce
-- ================================================================

-- ----------------------------------------------------------------
-- products — sellable blanks (drop-shipped or private-label)
-- ----------------------------------------------------------------
create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,                        -- /blanks/heavyweight-tee
  name            text not null,
  description     text,
  brand           text not null default 'Amenity',             -- 'Amenity' for private label, supplier name for dropship
  sourcing        sourcing_type not null,
  supplier_id     uuid references manufacturers(id) on delete restrict,
  category        text,                                        -- 'tees', 'hoodies', 'sweats', 'shorts'
  hero_image_url  text,
  images          jsonb not null default '[]'::jsonb,
  base_price      numeric(10,2) not null,                      -- listing price (cheapest variant)
  wholesale_cost  numeric(10,2),                               -- our cost from supplier (private/internal)
  attributes      jsonb not null default '{}'::jsonb,          -- {gsm: 280, fabric: 'ringspun cotton', fit: 'boxy'}
  status          product_status not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_status_idx    on products (status);
create index if not exists products_sourcing_idx  on products (sourcing);
create index if not exists products_supplier_idx  on products (supplier_id);
create index if not exists products_category_idx  on products (category);
create index if not exists products_name_trgm_idx on products using gin (name gin_trgm_ops);

-- ----------------------------------------------------------------
-- product_variants — SKU per (product, size, color)
-- ----------------------------------------------------------------
create table if not exists product_variants (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products(id) on delete cascade,
  sku               text unique not null,
  size              text,
  color             text,
  price             numeric(10,2) not null,
  wholesale_cost    numeric(10,2),
  inventory_count   int,                                       -- null when tracks_inventory=false (drop-ship)
  tracks_inventory  boolean not null default false,
  hero_image_url    text,
  position          int not null default 0,                    -- display order
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists variants_product_idx on product_variants (product_id);
create unique index if not exists variants_product_size_color_idx
  on product_variants (product_id, coalesce(size, ''), coalesce(color, ''));

-- ----------------------------------------------------------------
-- shipping_addresses — buyer addresses
-- ----------------------------------------------------------------
create table if not exists shipping_addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  full_name   text,
  company     text,
  line1       text not null,
  line2       text,
  city        text not null,
  region      text,                                          -- state/province
  postal_code text not null,
  country     text not null default 'US',
  phone       text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists addresses_user_idx on shipping_addresses (user_id);

-- Now wire orders.shipping_address_id -> shipping_addresses(id).
do $$ begin
  alter table orders
    add constraint orders_shipping_address_fk
    foreign key (shipping_address_id) references shipping_addresses(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------
-- carts — open or abandoned buyer carts (one per user at a time)
-- ----------------------------------------------------------------
create table if not exists carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'open' check (status in ('open','checked_out','abandoned')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists carts_user_idx on carts (user_id);
create unique index if not exists carts_user_open_idx
  on carts (user_id) where status = 'open';

-- ----------------------------------------------------------------
-- cart_items — one row per (cart, variant + customization); quantity merges adds
-- ----------------------------------------------------------------
-- Note: a "customized" line and a "blank" line for the same variant are
-- distinct rows. Two customized lines with different artwork or placement
-- are also distinct. The unique index uses md5(customization::text) so
-- two cart_items with the same customization payload merge into one.
create table if not exists cart_items (
  id            uuid primary key default gen_random_uuid(),
  cart_id       uuid not null references carts(id) on delete cascade,
  variant_id    uuid not null references product_variants(id) on delete restrict,
  quantity      int  not null check (quantity > 0),
  unit_price    numeric(10,2) not null,                         -- variant + decoration unit_cost (snapshot)
  customization jsonb,                                          -- null = plain blank line
  created_at    timestamptz not null default now()
);

-- Defensive: re-apply onto an older cart_items table.
alter table cart_items add column if not exists customization jsonb;

create unique index if not exists cart_items_cart_variant_blank_idx
  on cart_items (cart_id, variant_id) where customization is null;
create index if not exists cart_items_cart_idx on cart_items (cart_id);

-- ----------------------------------------------------------------
-- order_items — line items for blanks orders
-- (Studio orders typically have zero items; spec lives on the order row.)
-- ----------------------------------------------------------------
create table if not exists order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  variant_id          uuid not null references product_variants(id) on delete restrict,
  quantity            int  not null check (quantity > 0),
  unit_price          numeric(10,2) not null,                 -- snapshot at order-time
  customization       jsonb,                                   -- null = plain blank line; same shape as cart_items.customization
  printer_id          uuid references manufacturers(id) on delete set null,
  fulfillment_status  fulfillment_status not null default 'pending',
  tracking_number     text,
  carrier             text,
  forwarded_at        timestamptz,                            -- when we forwarded to the supplier or printer
  shipped_at          timestamptz,
  delivered_at        timestamptz,
  notes               text,
  created_at          timestamptz not null default now()
);

-- Defensive: re-apply onto an older order_items table.
alter table order_items add column if not exists customization jsonb;
alter table order_items add column if not exists printer_id    uuid references manufacturers(id) on delete set null;

create index if not exists order_items_order_idx       on order_items (order_id);
create index if not exists order_items_variant_idx     on order_items (variant_id);
create index if not exists order_items_printer_idx     on order_items (printer_id);
create index if not exists order_items_fulfillment_idx on order_items (fulfillment_status);
create index if not exists order_items_customized_idx  on order_items ((customization is not null));

-- ================================================================
-- Customization (artwork uploads + decoration pricing)
-- ================================================================

-- ----------------------------------------------------------------
-- artwork_uploads — one row per file uploaded to the 'artwork' bucket
-- ----------------------------------------------------------------
-- The actual bytes live in Supabase Storage; this row tracks metadata
-- and lets a single artwork file be reused across multiple cart_items
-- without duplicating storage.
create table if not exists artwork_uploads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  file_path         text not null unique,                         -- "{user_id}/{artwork_id}/{filename}"
  original_filename text,
  mime              text,
  size_bytes        int,
  width_px          int,
  height_px         int,
  status            text not null default 'uploaded'
                    check (status in ('pending','uploaded','flagged','archived')),
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists artwork_user_idx on artwork_uploads (user_id);

-- ----------------------------------------------------------------
-- customization_pricing — setup + per-unit decoration costs
-- ----------------------------------------------------------------
-- Looked up by technique + qty band so we can adjust prices without
-- a schema change. The frontend GETs this table to compute live
-- prices on the customize page.
create table if not exists customization_pricing (
  id                uuid primary key default gen_random_uuid(),
  technique         text not null check (technique in ('screen_print','embroidery','dtg')),
  min_quantity      int  not null default 1,                  -- inclusive lower bound of band
  max_quantity      int,                                      -- null = open-ended
  setup_fee         numeric(10,2) not null default 0,         -- per-color (screen) / per-design (embroidery, dtg)
  unit_cost         numeric(10,2) not null,                   -- per-piece decoration charge
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create index if not exists pricing_technique_idx on customization_pricing (technique, min_quantity)
  where active = true;

-- ----------------------------------------------------------------
-- bids — Supply Co. side (SAM.gov opportunities)
-- ----------------------------------------------------------------
create table if not exists bids (
  id            uuid primary key default gen_random_uuid(),
  solicitation  text unique not null,
  title         text,
  agency        text,
  naics         text,
  psc           text,
  posted_at     timestamptz,
  response_due  timestamptz,
  url           text,
  status        bid_status not null default 'discovered',
  score         numeric(5,2),
  score_reasons jsonb,
  draft_text    text,
  submitted_at  timestamptz,
  outcome       text,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bids_status_idx       on bids (status);
create index if not exists bids_naics_idx        on bids (naics);
create index if not exists bids_response_due_idx on bids (response_due);

-- ----------------------------------------------------------------
-- comms_log — every outbound/inbound message
-- ----------------------------------------------------------------
create table if not exists comms_log (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references orders(id) on delete cascade,
  bid_id     uuid references bids(id)   on delete cascade,
  channel    comms_channel not null,
  direction  text not null check (direction in ('outbound','inbound')),
  to_addr    text,
  from_addr  text,
  subject    text,
  body       text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index if not exists comms_order_idx on comms_log (order_id);
create index if not exists comms_bid_idx   on comms_log (bid_id);

-- ----------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------
create table if not exists invoices (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid references orders(id) on delete cascade,
  amount    numeric(10,2) not null,
  currency  text not null default 'USD',
  stripe_id text,
  status    text not null default 'draft',
  due_date  date,
  paid_at   timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invoices_order_idx on invoices (order_id);

-- ----------------------------------------------------------------
-- agent_runs — one row per graph node invocation (audit/debug)
-- ----------------------------------------------------------------
create table if not exists agent_runs (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete set null,
  bid_id      uuid references bids(id)   on delete set null,
  node        text not null,
  input       jsonb,
  output      jsonb,
  error       text,
  duration_ms int,
  created_at  timestamptz not null default now()
);

create index if not exists agent_runs_order_idx on agent_runs (order_id);
create index if not exists agent_runs_bid_idx   on agent_runs (bid_id);
create index if not exists agent_runs_node_idx  on agent_runs (node);

-- ================================================================
-- Updated-at triggers
-- ================================================================
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_manufacturers_updated on manufacturers;
create trigger trg_manufacturers_updated before update on manufacturers
  for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

drop trigger if exists trg_bids_updated on bids;
create trigger trg_bids_updated before update on bids
  for each row execute function set_updated_at();

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

drop trigger if exists trg_variants_updated on product_variants;
create trigger trg_variants_updated before update on product_variants
  for each row execute function set_updated_at();

drop trigger if exists trg_carts_updated on carts;
create trigger trg_carts_updated before update on carts
  for each row execute function set_updated_at();

-- ================================================================
-- Row Level Security
-- ----------------------------------------------------------------
-- Default posture:
--   • service_role (used by api/main.py) — full access (RLS bypass).
--   • authenticated — can read manufacturers, can read/write
--     their own brands and orders.
--   • anon — read-only on manufacturers (so logged-out chat works);
--     no access to orders, bids, comms, invoices.
--
-- Add tighter rules later if a customer portal exposes more.
-- ================================================================

alter table manufacturers      enable row level security;
alter table brands             enable row level security;
alter table orders             enable row level security;
alter table products           enable row level security;
alter table product_variants   enable row level security;
alter table shipping_addresses enable row level security;
alter table carts              enable row level security;
alter table cart_items         enable row level security;
alter table order_items        enable row level security;
alter table artwork_uploads    enable row level security;
alter table customization_pricing enable row level security;
alter table bids               enable row level security;
alter table comms_log          enable row level security;
alter table invoices           enable row level security;
alter table agent_runs         enable row level security;

-- ---- manufacturers: readable by anon + authenticated; writes via service role only.
drop policy if exists manufacturers_select_all on manufacturers;
create policy manufacturers_select_all on manufacturers
  for select to anon, authenticated using (true);

-- ---- brands: a user sees and edits only their own brand row.
drop policy if exists brands_select_own on brands;
create policy brands_select_own on brands
  for select to authenticated using (owner_uid = auth.uid());

drop policy if exists brands_insert_own on brands;
create policy brands_insert_own on brands
  for insert to authenticated with check (owner_uid = auth.uid());

drop policy if exists brands_update_own on brands;
create policy brands_update_own on brands
  for update to authenticated
  using (owner_uid = auth.uid())
  with check (owner_uid = auth.uid());

-- ---- orders: a user sees Studio orders on brands they own AND blanks orders they placed.
drop policy if exists orders_select_own on orders;
create policy orders_select_own on orders
  for select to authenticated
  using (
    user_id = auth.uid()
    or brand_id in (select id from brands where owner_uid = auth.uid())
  );

drop policy if exists orders_insert_own on orders;
create policy orders_insert_own on orders
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or brand_id in (select id from brands where owner_uid = auth.uid())
  );

-- ---- products: anyone can read active products; writes via service role only.
drop policy if exists products_select_active on products;
create policy products_select_active on products
  for select to anon, authenticated using (status = 'active');

-- ---- product_variants: visible whenever the parent product is visible.
drop policy if exists variants_select_active on product_variants;
create policy variants_select_active on product_variants
  for select to anon, authenticated
  using (
    product_id in (select id from products where status = 'active')
  );

-- ---- shipping_addresses: a user manages only their own addresses.
drop policy if exists addresses_select_own on shipping_addresses;
create policy addresses_select_own on shipping_addresses
  for select to authenticated using (user_id = auth.uid());

drop policy if exists addresses_insert_own on shipping_addresses;
create policy addresses_insert_own on shipping_addresses
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists addresses_update_own on shipping_addresses;
create policy addresses_update_own on shipping_addresses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists addresses_delete_own on shipping_addresses;
create policy addresses_delete_own on shipping_addresses
  for delete to authenticated using (user_id = auth.uid());

-- ---- carts: a user manages only their own cart.
drop policy if exists carts_select_own on carts;
create policy carts_select_own on carts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists carts_insert_own on carts;
create policy carts_insert_own on carts
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists carts_update_own on carts;
create policy carts_update_own on carts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists carts_delete_own on carts;
create policy carts_delete_own on carts
  for delete to authenticated using (user_id = auth.uid());

-- ---- cart_items: a user manages only items in their own cart.
drop policy if exists cart_items_select_own on cart_items;
create policy cart_items_select_own on cart_items
  for select to authenticated
  using (cart_id in (select id from carts where user_id = auth.uid()));

drop policy if exists cart_items_insert_own on cart_items;
create policy cart_items_insert_own on cart_items
  for insert to authenticated
  with check (cart_id in (select id from carts where user_id = auth.uid()));

drop policy if exists cart_items_update_own on cart_items;
create policy cart_items_update_own on cart_items
  for update to authenticated
  using (cart_id in (select id from carts where user_id = auth.uid()))
  with check (cart_id in (select id from carts where user_id = auth.uid()));

drop policy if exists cart_items_delete_own on cart_items;
create policy cart_items_delete_own on cart_items
  for delete to authenticated
  using (cart_id in (select id from carts where user_id = auth.uid()));

-- ---- order_items: a user reads items from orders they own (mirrors orders policy).
drop policy if exists order_items_select_own on order_items;
create policy order_items_select_own on order_items
  for select to authenticated
  using (
    order_id in (
      select id from orders
      where user_id = auth.uid()
         or brand_id in (select id from brands where owner_uid = auth.uid())
    )
  );

-- ---- artwork_uploads: a user manages only their own uploads.
drop policy if exists artwork_select_own on artwork_uploads;
create policy artwork_select_own on artwork_uploads
  for select to authenticated using (user_id = auth.uid());

drop policy if exists artwork_insert_own on artwork_uploads;
create policy artwork_insert_own on artwork_uploads
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists artwork_update_own on artwork_uploads;
create policy artwork_update_own on artwork_uploads
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- customization_pricing: world-readable so the customize page can
-- compute live prices client-side; writes via service role only.
drop policy if exists pricing_select_active on customization_pricing;
create policy pricing_select_active on customization_pricing
  for select to anon, authenticated using (active = true);

-- ---- bids, comms_log, invoices, agent_runs: service role only (no policies).
-- Tables have RLS on but no policies → unreachable from anon/authenticated;
-- service_role bypasses RLS automatically.

-- ================================================================
-- Supabase Storage — 'artwork' bucket for customer-uploaded designs
-- ================================================================
-- Private bucket; owners (the user who uploaded) can read/write only
-- files inside their own folder ({user_id}/...). Service role can
-- always read everything (used by printers when sending POs).

insert into storage.buckets (id, name, public)
values ('artwork', 'artwork', false)
on conflict (id) do nothing;

drop policy if exists artwork_storage_read_own on storage.objects;
create policy artwork_storage_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'artwork'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists artwork_storage_insert_own on storage.objects;
create policy artwork_storage_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artwork'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists artwork_storage_delete_own on storage.objects;
create policy artwork_storage_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artwork'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ================================================================
-- Done.
-- ================================================================
