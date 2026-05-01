-- studio-app — decoration pricing rules
-- ----------------------------------------------------------------
-- Industry-standard per-band rates for screen print, embroidery, and
-- DTG. The customize page reads this table to compute live prices;
-- the routing/fulfillment nodes use it to decide whether the order
-- clears each printer's economic floor.
--
-- Setup fee semantics:
--   * screen_print  — per ink color, per placement
--   * embroidery    — per design (digitization fee)
--   * dtg           — none (no setup)
--
-- Re-run this file any time you re-tune pricing. Idempotent: rows are
-- replaced by (technique, min_quantity).
-- ================================================================

begin;

delete from customization_pricing
where (technique, min_quantity) in (
  ('screen_print',  1), ('screen_print', 24), ('screen_print', 72), ('screen_print', 144), ('screen_print', 288),
  ('embroidery',    1), ('embroidery',  24), ('embroidery',   72), ('embroidery',  144),
  ('dtg',           1), ('dtg',         24), ('dtg',          72)
);

insert into customization_pricing (technique, min_quantity, max_quantity, setup_fee, unit_cost, notes) values
-- Screen print bands (per color, per placement)
('screen_print',   1,  23, 30.00, 6.00,  'Below MOQ — flat per-piece rate, soft warning shown to user'),
('screen_print',  24,  71, 30.00, 4.00,  'Standard MOQ band'),
('screen_print',  72, 143, 30.00, 3.00,  'Volume band'),
('screen_print', 144, 287, 30.00, 2.50,  'High-volume band'),
('screen_print', 288, NULL, 30.00, 2.00, 'Bulk band'),

-- Embroidery bands (digitization fee covers up to ~10k stitches)
('embroidery',    1,  23, 50.00, 8.00,  'Below MOQ — flat per-piece rate'),
('embroidery',   24,  71, 50.00, 6.50,  'Standard MOQ band'),
('embroidery',   72, 143, 50.00, 5.50,  'Volume band'),
('embroidery',  144, NULL, 50.00, 4.50, 'Bulk band'),

-- DTG (no setup fee, qty=1 friendly)
('dtg',           1,  23,  0.00, 12.00, 'qty=1 friendly; ideal for sampling'),
('dtg',          24,  71,  0.00, 10.00, 'Mid band'),
('dtg',          72, NULL, 0.00,  9.00, 'Volume band');

commit;
