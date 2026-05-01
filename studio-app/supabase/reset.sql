-- studio-app — destructive reset.
-- ----------------------------------------------------------------
-- Run this ONCE in the Supabase SQL Editor before re-applying
-- schema.sql when you have an older `manufacturers` (or other) table
-- left over from a prior setup.
--
-- DESTRUCTIVE: drops every table and enum studio-app owns. Use only
-- when you accept losing the data in those tables. RLS policies and
-- triggers fall away with the tables (CASCADE).
--
-- Order:
--   1. Paste this file → Run.
--   2. Paste schema.sql → Run.
--   3. Paste seeds/manufacturers_seed.sql → Run.
-- ================================================================

begin;

-- Drop tables in reverse-dependency order (CASCADE handles edge cases).
drop table if exists agent_runs            cascade;
drop table if exists invoices              cascade;
drop table if exists comms_log             cascade;
drop table if exists bids                  cascade;
drop table if exists customization_pricing cascade;
drop table if exists artwork_uploads       cascade;
drop table if exists order_items           cascade;
drop table if exists cart_items            cascade;
drop table if exists carts                 cascade;
drop table if exists shipping_addresses    cascade;
drop table if exists product_variants      cascade;
drop table if exists products              cascade;
drop table if exists orders                cascade;
drop table if exists brands                cascade;
drop table if exists manufacturers         cascade;

-- Drop enums (must come after tables that reference them).
drop type if exists order_status        cascade;
drop type if exists bid_status          cascade;
drop type if exists comms_channel       cascade;
drop type if exists partner_role        cascade;
drop type if exists order_type          cascade;
drop type if exists sourcing_type       cascade;
drop type if exists product_status      cascade;
drop type if exists fulfillment_status  cascade;

-- Drop the trigger function (recreated by schema.sql).
drop function if exists set_updated_at() cascade;

commit;
