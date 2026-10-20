import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "./readiness";
import { draftChecksum } from "./preflightRules";

const card = { draft_copy: "Hello", hashtags: ["a"], approval_status: "approved" } as any;
const review = (o: any) => ({ draft_checksum: draftChecksum(card), findings: [], overall_status: "pass", ...o }) as any;
const opts = { approvalRequired: true, preflightMode: "advisory" };

describe("readiness", () => {
  it("never says ready while required checks remain", () => {
    const r = evaluateReadiness(card, review({ overall_status: "blocked", findings: [{ severity: "blocking" }, { severity: "blocking" }, { severity: "blocking" }] }), opts);
    expect(r.label).toBe("Approved · 3 required checks remain");
    expect(r.tone).toBe("blocked");
  });
  it("blocks delivery in strict mode with required checks", () => {
    expect(evaluateReadiness(card, review({ overall_status: "blocked", findings: [{ severity: "blocking" }] }), { ...opts, preflightMode: "strict" }).canDeliver).toBe(false);
  });
  it("shows pending when not checked or stale", () => {
    expect(evaluateReadiness(card, null, opts).label).toBe("Checks pending");
    expect(evaluateReadiness(card, review({ draft_checksum: "old" }), opts).tone).toBe("pending");
  });
  it("acknowledged warnings are not called cleared", () => {
    expect(evaluateReadiness(card, review({ overall_status: "warnings", acknowledged_at: "x", findings: [{ severity: "advisory" }] }), opts).label)
      .toBe("Ready to publish · Warnings acknowledged");
  });
  it("advisory only and pass", () => {
    expect(evaluateReadiness(card, review({ overall_status: "warnings", findings: [{ severity: "advisory" }] }), opts).label).toBe("Approved · Advisory notes available");
    expect(evaluateReadiness(card, review({}), opts).label).toBe("Ready to publish");
  });
  it("unapproved posts show their real editorial state", () => {
    expect(evaluateReadiness({ ...card, approval_status: "in_review" }, review({}), opts).label).toBe("In review");
  });
});
