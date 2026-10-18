import { describe, expect, it } from "vitest";
import { ADDONS, ALERTS, DRAFT_WEIGHTS, SCHEDULED_RUN_CAP, briefDraftCost, discountPct, maxHeldClips, paymentCatalog } from "./pricing";

const TIERS = [
  { tier_slug: "starter", name: "Spark Start", monthly_price_cents: 19900, annual_price_cents: 15900, nonprofit_annual_price_cents: 9500, implementation_fee_cents: 149900, nonprofit_implementation_fee_cents: 112400 },
  { tier_slug: "team", name: "Team Flow", monthly_price_cents: 34900, annual_price_cents: 27900, nonprofit_annual_price_cents: 16700, implementation_fee_cents: 179500, nonprofit_implementation_fee_cents: 134600 },
  { tier_slug: "pro", name: "Surge Pro", monthly_price_cents: 49900, annual_price_cents: 39900, nonprofit_annual_price_cents: 23900, implementation_fee_cents: 225000, nonprofit_implementation_fee_cents: 168700 },
  { tier_slug: "enterprise", name: "Force Enterprise", monthly_price_cents: 129900, annual_price_cents: 103900, nonprofit_annual_price_cents: 62300, implementation_fee_cents: 449900, nonprofit_implementation_fee_cents: 337400 },
];

describe("pricing rules", () => {
  it("annual billed totals match the listed amounts", () => {
    expect(TIERS.map((t) => t.annual_price_cents * 12)).toEqual([190800, 334800, 478800, 1246800]);
    expect(TIERS.map((t) => t.nonprofit_annual_price_cents * 12)).toEqual([114000, 200400, 286800, 747600]);
  });
  it("listed prices never deliver less than the advertised discount", () => {
    TIERS.forEach((t) => {
      expect(discountPct(t.monthly_price_cents, t.annual_price_cents)).toBeGreaterThanOrEqual(20);
      expect(discountPct(t.annual_price_cents, t.nonprofit_annual_price_cents)).toBeGreaterThanOrEqual(40);
      expect(discountPct(t.implementation_fee_cents, t.nonprofit_implementation_fee_cents)).toBeGreaterThanOrEqual(25);
    });
  });
  it("add-on bundles are priced as specified", () => {
    expect(ADDONS.media_credits).toMatchObject({ quantity: 100, price_cents: 400 });
    expect(ADDONS.ai_drafts).toMatchObject({ quantity: 100, price_cents: 200 });
    expect(ADDONS.draft_clips).toMatchObject({ quantity: 10, price_cents: 1900, valid_months: 12 });
    expect(ADDONS.premium_clips).toMatchObject({ quantity: 10, price_cents: 3900, valid_months: 12 });
  });
  it("AI actions charge the specified drafts", () => {
    expect(DRAFT_WEIGHTS).toEqual({ preflight_review: 1, preflight_rewrite: 1, repurpose_content: 1, analyze_voice: 5, brand_strategy_extract: 5 });
  });
  it("angle testing costs 9 drafts instead of 3 for three channels", () => {
    expect(briefDraftCost(3, true)).toBe(9);
    expect(briefDraftCost(3, false)).toBe(3);
  });
  it("clip rollover holds at most two months", () => {
    expect(maxHeldClips(10)).toBe(20);
    expect(maxHeldClips(50)).toBe(100);
    expect(maxHeldClips(10)).toBe(20);
  });
  it("alerts notify at 60% monthly and 80% within 24 hours; stop at 100%", () => {
    expect(ALERTS).toEqual({ progressShare: 0.6, velocityShare: 0.8, velocityHours: 24, hardStopShare: 1 });
  });
  it("scheduled runs cap at 25 posts", () => expect(SCHEDULED_RUN_CAP).toBe(25));
  it("payment catalog has 24 items", () => {
    const c = paymentCatalog(TIERS);
    expect(c).toHaveLength(24);
    expect(c.filter((x) => x.interval).length).toBe(12);
  });
});
