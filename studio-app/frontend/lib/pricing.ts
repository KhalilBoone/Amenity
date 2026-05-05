// Customization pricing helpers shared between PDP and customize page.

import type {
  CustomizationPricing,
  DecorationTechnique,
} from "@/types";

/* ─────────────────────────────────────────────────────────────────────────────
   VOLUME / WHOLESALE TIERED PRICING
   These tiers apply to all blanks SKUs regardless of decoration.
   Tiers:  1–11 → 0%  (full price)
           12–35 → 10% off
           36–63 → 20% off
           64–95 → 30% off
           96+   → 40% off
─────────────────────────────────────────────────────────────────────────────── */

export interface VolumeTier {
  min: number;
  max: number | null; // null = unlimited
  discountPct: number; // 0–100
  label: string;
}

export const VOLUME_TIERS: VolumeTier[] = [
  { min: 1,  max: 11,  discountPct: 0,  label: "1–11"   },
  { min: 12, max: 35,  discountPct: 10, label: "12–35"  },
  { min: 36, max: 63,  discountPct: 20, label: "36–63"  },
  { min: 64, max: 95,  discountPct: 30, label: "64–95"  },
  { min: 96, max: null, discountPct: 40, label: "96+"   },
];

/** Return the tier that applies for a given quantity. */
export function volumeTierFor(qty: number): VolumeTier {
  for (const tier of VOLUME_TIERS) {
    const max = tier.max ?? Infinity;
    if (qty >= tier.min && qty <= max) return tier;
  }
  // Fallback — should never happen for qty ≥ 1
  return VOLUME_TIERS[VOLUME_TIERS.length - 1];
}

/** Discount multiplier for a given quantity (e.g. 0.80 for 20% off). */
export function volumeMultiplier(qty: number): number {
  return 1 - volumeTierFor(qty).discountPct / 100;
}

/**
 * Tiered unit price after volume discount.
 * @param basePrice  full list price per unit
 * @param qty        total quantity ordered
 */
export function tieredUnitPrice(basePrice: number, qty: number): number {
  return round2(basePrice * volumeMultiplier(qty));
}

/**
 * The lowest possible unit price for a SKU (at 96+ tier = 40% off).
 * Useful for showing "from $X" on catalog tiles.
 */
export function lowestTieredPrice(basePrice: number): number {
  return tieredUnitPrice(basePrice, 96);
}

/** Pick the band that covers ``quantity`` for a given technique. */
export function pricingBandFor(
  rules: CustomizationPricing[],
  technique: DecorationTechnique,
  quantity: number
): CustomizationPricing | null {
  const candidates = rules.filter(
    (r) => r.active && r.technique === technique
  );
  for (const r of candidates) {
    const min = r.min_quantity;
    const max = r.max_quantity ?? Number.POSITIVE_INFINITY;
    if (quantity >= min && quantity <= max) return r;
  }
  return null;
}

/**
 * Live price calculation. Returns total before tax + shipping.
 *   total = blank_unit_price * qty + setup_fee * setups + unit_cost * qty
 *
 * For screen print, the setup fee is per ink color (multiplied by ``colors``).
 * For embroidery / DTG, ``colors`` is ignored.
 */
export function computeCustomPrice(args: {
  blankUnitPrice: number;
  technique: DecorationTechnique;
  colors: number;
  quantity: number;
  rules: CustomizationPricing[];
}): {
  band: CustomizationPricing | null;
  blankSubtotal: number;
  setupTotal: number;
  decorationTotal: number;
  total: number;
  unitAllIn: number;
} {
  const band = pricingBandFor(args.rules, args.technique, args.quantity);
  const blankSubtotal = round2(args.blankUnitPrice * args.quantity);
  const setupMultiplier =
    args.technique === "screen_print" ? Math.max(1, args.colors) : 1;
  const setupTotal = round2((band?.setup_fee ?? 0) * setupMultiplier);
  const decorationTotal = round2((band?.unit_cost ?? 0) * args.quantity);
  const total = round2(blankSubtotal + setupTotal + decorationTotal);
  const unitAllIn = args.quantity > 0 ? round2(total / args.quantity) : 0;
  return { band, blankSubtotal, setupTotal, decorationTotal, total, unitAllIn };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
