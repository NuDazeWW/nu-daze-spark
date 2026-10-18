// Fixed commercial rules shared by pricing, billing and tests. Database tier rows hold the live values.
export const ADDONS = {
  media_credits: { label: "100 media credits", quantity: 100, price_cents: 400, valid_months: null },
  ai_drafts: { label: "100 AI drafts", quantity: 100, price_cents: 200, valid_months: null },
  draft_clips: { label: "10 draft clips", quantity: 10, price_cents: 1900, valid_months: 12 },
  premium_clips: { label: "10 premium clips", quantity: 10, price_cents: 3900, valid_months: 12 },
} as const;
export type AddonKind = keyof typeof ADDONS;

/** AI drafts charged per action (mirrors supabase/functions/_shared/metering.ts). */
export const DRAFT_WEIGHTS = {
  preflight_review: 1, preflight_rewrite: 1, repurpose_content: 1, analyze_voice: 5, brand_strategy_extract: 5,
} as const;

export const ALERTS = { progressShare: 0.6, velocityShare: 0.8, velocityHours: 24, hardStopShare: 1 } as const;
export const SCHEDULED_RUN_CAP = 25;

/** Max clips held = this month's inclusion + one month of rollover. */
export const maxHeldClips = (monthly: number) => monthly * 2;

/** Angle testing multiplies drafts by 3 per channel. */
export const briefDraftCost = (channels: number, threeAngles: boolean) => Math.max(channels, 1) * (threeAngles ? 3 : 1);

export const discountPct = (full: number, discounted: number) => ((full - discounted) / full) * 100;

/** The reusable 24-item payment catalog. */
export function paymentCatalog(tiers: { tier_slug: string; name: string; monthly_price_cents: number; annual_price_cents: number;
  nonprofit_annual_price_cents: number; implementation_fee_cents: number; nonprofit_implementation_fee_cents: number }[]) {
  const recurring = tiers.flatMap((t) => [
    { sku: `${t.tier_slug}_monthly`, name: `${t.name} monthly`, cents: t.monthly_price_cents, interval: "month" },
    { sku: `${t.tier_slug}_annual`, name: `${t.name} annual`, cents: t.annual_price_cents * 12, interval: "year" },
    { sku: `${t.tier_slug}_nonprofit_annual`, name: `${t.name} non-profit annual`, cents: t.nonprofit_annual_price_cents * 12, interval: "year" },
  ]);
  const setup = tiers.flatMap((t) => [
    { sku: `${t.tier_slug}_setup`, name: `${t.name} setup`, cents: t.implementation_fee_cents, interval: null },
    { sku: `${t.tier_slug}_nonprofit_setup`, name: `${t.name} non-profit setup`, cents: t.nonprofit_implementation_fee_cents, interval: null },
  ]);
  const addons = Object.entries(ADDONS).map(([k, a]) => ({ sku: `addon_${k}`, name: a.label, cents: a.price_cents, interval: null }));
  return [...recurring, ...setup, ...addons];
}
