import { describe, expect, it } from "vitest";
import { isVerifiedReportingConnection } from "./reportingConnection";

describe("verified reporting connections", () => {
  it("does not call an enabled Power BI placeholder connected", () => {
    expect(isVerifiedReportingConnection({ provider: "power_bi", enabled: true, key_prefix: null, last_used_at: null })).toBe(false);
  });
  it("does not treat an unused feed key as a live connection", () => {
    expect(isVerifiedReportingConnection({ provider: "power_bi", enabled: true, key_prefix: "issued", last_used_at: null })).toBe(false);
  });
  it("counts an enabled feed that has actually been read", () => {
    expect(isVerifiedReportingConnection({ provider: "power_bi", enabled: true, key_prefix: "issued", last_used_at: "2026-10-22T10:00:00Z" })).toBe(true);
  });
  it("excludes disabled feeds even if previously used", () => {
    expect(isVerifiedReportingConnection({ provider: "power_bi", enabled: false, key_prefix: "issued", last_used_at: "2026-10-22T10:00:00Z" })).toBe(false);
  });
});