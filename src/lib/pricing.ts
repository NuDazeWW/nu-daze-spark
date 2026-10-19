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
  // Spark Start has no non-profit price, so it gets no non-profit items.
  const recurring = tiers.flatMap((t) => [
    { sku: `${t.tier_slug}_monthly`, name: `${t.name} monthly`, cents: t.monthly_price_cents, interval: "month" },
    { sku: `${t.tier_slug}_annual`, name: `${t.name} annual`, cents: t.annual_price_cents * 12, interval: "year" },
    ...(isNonprofitEligible(t.tier_slug) ? [{ sku: `${t.tier_slug}_nonprofit_annual`, name: `${t.name} non-profit annual`, cents: t.nonprofit_annual_price_cents * 12, interval: "year" }] : []),
  ]);
  const setup = tiers.flatMap((t) => [
    { sku: `${t.tier_slug}_setup`, name: `${t.name} setup`, cents: t.implementation_fee_cents, interval: null },
    ...(isNonprofitEligible(t.tier_slug) ? [{ sku: `${t.tier_slug}_nonprofit_setup`, name: `${t.name} non-profit setup`, cents: t.nonprofit_implementation_fee_cents, interval: null }] : []),
  ]);
  const addons = Object.entries(ADDONS).map(([k, a]) => ({ sku: `addon_${k}`, name: a.label, cents: a.price_cents, interval: null }));
  return [...recurring, ...setup, ...addons];
}

/** Tiers that can get non-profit pricing. Spark Start (starter) is excluded. */
export const NONPROFIT_EXCLUDED = ["starter", "spark_start"] as const;
export const isNonprofitEligible = (slug: string) => !(NONPROFIT_EXCLUDED as readonly string[]).includes(slug);
export const NONPROFIT_NOTE = "Non-profit pricing starts at Team Flow.";

/** Per-month price to show. Non-profit view always uses annual billing, whatever `billing` says. */
export function nonprofitDisplay(
  t: { tier_slug: string; monthly_price_cents: number; annual_price_cents: number; nonprofit_annual_price_cents: number },
  billing: "monthly" | "annual",
  nonprofit: boolean,
): { perMonthCents: number; billedYearlyCents: number | null; note: string | null; nonprofitApplied: boolean } {
  if (nonprofit) {
    const eligible = isNonprofitEligible(t.tier_slug);
    const per = eligible ? t.nonprofit_annual_price_cents : t.annual_price_cents;
    return { perMonthCents: per, billedYearlyCents: per * 12, note: eligible ? null : NONPROFIT_NOTE, nonprofitApplied: eligible };
  }
  const per = billing === "annual" ? t.annual_price_cents : t.monthly_price_cents;
  return { perMonthCents: per, billedYearlyCents: billing === "annual" ? per * 12 : null, note: null, nonprofitApplied: false };
}
