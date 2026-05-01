// Customization pricing helpers shared between PDP and customize page.

import type {
  CustomizationPricing,
  DecorationTechnique,
} from "@/types";

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
