-- studio-app — starter products catalog (drop-ship Phase 1)
-- ----------------------------------------------------------------
-- Seeds a minimal catalog of blanks: 2 products per launch wholesaler
-- (Los Angeles Apparel, House of Blanks, AS Colour) with size/color
-- variants. Each variant has tracks_inventory=false because Phase 1
-- is pure drop-ship — we don't hold stock; the supplier ships direct.
--
-- PREREQUISITES
--   1. schema.sql applied
--   2. manufacturers_seed.sql applied (so the 3 suppliers exist)
--
-- USAGE
--   Paste into the Supabase SQL editor and Run. Idempotent: re-running
--   re-inserts the same product slugs (variants cascade-deleted by
--   the products delete + re-insert).
--
-- PRICING NOTE
--   `wholesale_cost` is what we pay the supplier (private/internal).
--   `price`/`base_price` is what the buyer pays Amenity. Both are
--   placeholders — calibrate against current wholesaler price sheets
--   before going live.
-- ================================================================

begin;

-- ---- Sanity check: all 3 launch wholesalers must exist. -----------
do $$
declare
  laa uuid := (select id from manufacturers where name ilike 'Los Angeles Apparel%' limit 1);
  hob uuid := (select id from manufacturers where name ilike 'House of Blanks%'    limit 1);
  ascl uuid := (select id from manufacturers where name ilike 'AS Colour%'         limit 1);
begin
  if laa is null then raise exception 'Missing supplier: Los Angeles Apparel — load manufacturers_seed.sql first'; end if;
  if hob is null then raise exception 'Missing supplier: House of Blanks — load manufacturers_seed.sql first';     end if;
  if ascl is null then raise exception 'Missing supplier: AS Colour — load manufacturers_seed.sql first';           end if;
end $$;

-- ---- Wipe prior copies of these slugs so re-run is clean. ---------
delete from products where slug in (
  'la-apparel-heavyweight-crewneck-tee',
  'la-apparel-14oz-heavyweight-hoodie',
  'house-of-blanks-400gsm-heavy-tee',
  'house-of-blanks-500gsm-heavy-crewneck',
  'as-colour-heavy-faded-tee',
  'as-colour-relax-hood'
);

-- ================================================================
-- Products
-- ================================================================
insert into products (
  slug, name, description, brand, sourcing, supplier_id, category,
  hero_image_url, base_price, wholesale_cost, attributes, status
) values
-- ---- Los Angeles Apparel ----------------------------------------
(
  'la-apparel-heavyweight-crewneck-tee',
  'Heavyweight Crewneck Tee',
  'Made-in-USA 6.5oz garment-dyed crewneck. Boxy fit, ringspun cotton, USA-grown.',
  'Los Angeles Apparel',
  'dropship',
  (select id from manufacturers where name ilike 'Los Angeles Apparel%' limit 1),
  'tees',
  null,
  22.00, 12.00,
  '{"gsm": 220, "weight_oz": 6.5, "fabric": "ringspun cotton", "fit": "boxy", "made_in": "USA"}'::jsonb,
  'active'
),
(
  'la-apparel-14oz-heavyweight-hoodie',
  '14oz Heavyweight Hoodie',
  'Made-in-USA 14oz heavyweight pullover hoodie. Brushed fleece interior, kangaroo pocket.',
  'Los Angeles Apparel',
  'dropship',
  (select id from manufacturers where name ilike 'Los Angeles Apparel%' limit 1),
  'hoodies',
  null,
  58.00, 32.00,
  '{"weight_oz": 14, "fabric": "heavyweight fleece", "fit": "regular", "made_in": "USA"}'::jsonb,
  'active'
),
-- ---- House of Blanks --------------------------------------------
(
  'house-of-blanks-400gsm-heavy-tee',
  '400 GSM Heavyweight Tee',
  'Premium 400gsm heavy tee. Designer-grade hand-feel, supreme/ALD/kith reference quality.',
  'House of Blanks',
  'dropship',
  (select id from manufacturers where name ilike 'House of Blanks%' limit 1),
  'tees',
  null,
  48.00, 26.00,
  '{"gsm": 400, "fabric": "ringspun cotton", "fit": "regular", "made_in": "Canada"}'::jsonb,
  'active'
),
(
  'house-of-blanks-500gsm-heavy-crewneck',
  '500 GSM Heavy Crewneck Sweatshirt',
  'Heavyweight 500gsm fleece crewneck. Brushed back, ribbed cuffs and hem.',
  'House of Blanks',
  'dropship',
  (select id from manufacturers where name ilike 'House of Blanks%' limit 1),
  'sweats',
  null,
  85.00, 48.00,
  '{"gsm": 500, "fabric": "heavyweight fleece", "fit": "regular", "made_in": "Canada"}'::jsonb,
  'active'
),
-- ---- AS Colour ---------------------------------------------------
(
  'as-colour-heavy-faded-tee',
  'Heavy Faded Tee',
  '220gsm garment-dyed faded tee. Lived-in look, midweight cotton, regular fit.',
  'AS Colour',
  'dropship',
  (select id from manufacturers where name ilike 'AS Colour%' limit 1),
  'tees',
  null,
  20.00, 11.00,
  '{"gsm": 220, "fabric": "carded cotton", "fit": "regular", "made_in": "China/Bangladesh"}'::jsonb,
  'active'
),
(
  'as-colour-relax-hood',
  'Relax Hood',
  '320gsm midweight pullover hoodie. Relaxed fit, brushed fleece interior.',
  'AS Colour',
  'dropship',
  (select id from manufacturers where name ilike 'AS Colour%' limit 1),
  'hoodies',
  null,
  58.00, 32.00,
  '{"gsm": 320, "fabric": "midweight fleece", "fit": "relaxed", "made_in": "China/Bangladesh"}'::jsonb,
  'active'
);

-- ================================================================
-- Variants — generated from product × size × color cross-products
-- ================================================================

-- ---- LA Apparel — Heavyweight Crewneck Tee ----------------------
insert into product_variants (product_id, sku, size, color, price, wholesale_cost, tracks_inventory, position)
select
  p.id,
  'LAA-CRT-' || upper(replace(c.color, ' ', '')) || '-' || s.size,
  s.size, c.color, 22.00, 12.00, false,
  (s.pos * 10 + c.pos)
from products p
cross join (values ('S',1),('M',2),('L',3),('XL',4),('XXL',5)) as s(size, pos)
cross join (values ('Black',1),('White',2),('Natural',3),('Forest',4)) as c(color, pos)
where p.slug = 'la-apparel-heavyweight-crewneck-tee';

-- ---- LA Apparel — 14oz Heavyweight Hoodie ------------------------
insert into product_variants (product_id, sku, size, color, price, wholesale_cost, tracks_inventory, position)
select
  p.id,
  'LAA-HH14-' || upper(replace(c.color, ' ', '')) || '-' || s.size,
  s.size, c.color, 58.00, 32.00, false,
  (s.pos * 10 + c.pos)
from products p
cross join (values ('S',1),('M',2),('L',3),('XL',4),('XXL',5)) as s(size, pos)
cross join (values ('Black',1),('Heather Grey',2)) as c(color, pos)
where p.slug = 'la-apparel-14oz-heavyweight-hoodie';

-- ---- House of Blanks — 400 GSM Heavyweight Tee -------------------
insert into product_variants (product_id, sku, size, color, price, wholesale_cost, tracks_inventory, position)
select
  p.id,
  'HOB-T400-' || upper(replace(c.color, ' ', '')) || '-' || s.size,
  s.size, c.color, 48.00, 26.00, false,
  (s.pos * 10 + c.pos)
from products p
cross join (values ('XS',0),('S',1),('M',2),('L',3),('XL',4),('XXL',5)) as s(size, pos)
cross join (values ('Black',1),('White',2),('Natural',3)) as c(color, pos)
where p.slug = 'house-of-blanks-400gsm-heavy-tee';

-- ---- House of Blanks — 500 GSM Heavy Crewneck --------------------
insert into product_variants (product_id, sku, size, color, price, wholesale_cost, tracks_inventory, position)
select
  p.id,
  'HOB-C500-' || upper(replace(c.color, ' ', '')) || '-' || s.size,
  s.size, c.color, 85.00, 48.00, false,
  (s.pos * 10 + c.pos)
from products p
cross join (values ('S',1),('M',2),('L',3),('XL',4),('XXL',5)) as s(size, pos)
cross join (values ('Black',1),('Heather Grey',2),('Cream',3)) as c(color, pos)
where p.slug = 'house-of-blanks-500gsm-heavy-crewneck';

-- ---- AS Colour — Heavy Faded Tee ---------------------------------
insert into product_variants (product_id, sku, size, color, price, wholesale_cost, tracks_inventory, position)
select
  p.id,
  'ASC-FT-' || upper(replace(c.color, ' ', '')) || '-' || s.size,
  s.size, c.color, 20.00, 11.00, false,
  (s.pos * 10 + c.pos)
from products p
cross join (values ('XS',0),('S',1),('M',2),('L',3),('XL',4),('XXL',5)) as s(size, pos)
cross join (values ('Black',1),('White',2),('Natural',3),('Navy',4)) as c(color, pos)
where p.slug = 'as-colour-heavy-faded-tee';

-- ---- AS Colour — Relax Hood --------------------------------------
insert into product_variants (product_id, sku, size, color, price, wholesale_cost, tracks_inventory, position)
select
  p.id,
  'ASC-RH-' || upper(replace(c.color, ' ', '')) || '-' || s.size,
  s.size, c.color, 58.00, 32.00, false,
  (s.pos * 10 + c.pos)
from products p
cross join (values ('S',1),('M',2),('L',3),('XL',4),('XXL',5)) as s(size, pos)
cross join (values ('Black',1),('Heather Grey',2)) as c(color, pos)
where p.slug = 'as-colour-relax-hood';

-- ---- Sanity check: every product got at least one variant. -------
do $$
declare
  empty_products int := (
    select count(*) from products p
    where p.slug in (
      'la-apparel-heavyweight-crewneck-tee',
      'la-apparel-14oz-heavyweight-hoodie',
      'house-of-blanks-400gsm-heavy-tee',
      'house-of-blanks-500gsm-heavy-crewneck',
      'as-colour-heavy-faded-tee',
      'as-colour-relax-hood'
    )
    and not exists (
      select 1 from product_variants v where v.product_id = p.id
    )
  );
begin
  if empty_products > 0 then
    raise exception 'Seed produced % product(s) with zero variants', empty_products;
  end if;
end $$;

commit;
