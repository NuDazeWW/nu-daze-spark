import { describe, expect, it } from "vitest";
import { inRange, rangeBounds } from "./dateRange";
import { NAV_SEARCH_INDEX, navMatches } from "./navSearch";
import { PUBLISH_ACTION_LABELS } from "./postingPackage";

const now = new Date(2026, 9, 21, 15, 0); // Wed Oct 21 2026, local

describe("scheduled date range", () => {
  it("custom range includes the whole To day in local time", () => {
    const b = rangeBounds("custom", "2026-10-20", "2026-10-22", now);
    expect(inRange(new Date(2026, 9, 22, 23, 30).toISOString(), b)).toBe(true);
    expect(inRange(new Date(2026, 9, 23, 0, 0).toISOString(), b)).toBe(false);
    expect(inRange(new Date(2026, 9, 19, 23, 59).toISOString(), b)).toBe(false);
  });
  it("this week runs Monday to Sunday", () => {
    const b = rangeBounds("week", "", "", now)!;
    expect(b.from).toEqual(new Date(2026, 9, 19));
    expect(b.to).toEqual(new Date(2026, 9, 26));
  });
  it("next 7 days and this month actually narrow results", () => {
    expect(inRange(new Date(2026, 9, 29).toISOString(), rangeBounds("next7", "", "", now))).toBe(false);
    expect(inRange(new Date(2026, 10, 1).toISOString(), rangeBounds("month", "", "", now))).toBe(false);
    expect(inRange(null, rangeBounds("month", "", "", now))).toBe(false);
  });
});

describe("page finder", () => {
  it("covers all six sidebar groups", () => {
    const groups = new Set(NAV_SEARCH_INDEX.map((e) => e.group));
    for (const g of ["Core & Insights", "Strategy & Sources", "Create & Repurpose", "Plan & Review", "Pipeline & Publishing", "Workspace Settings"]) expect(groups.has(g)).toBe(true);
  });
  it("matches by title, group name and loose spelling", () => {
    const hit = (q: string) => NAV_SEARCH_INDEX.filter((e) => navMatches(e, q)).map((e) => e.title);
    expect(hit("post office")).toContain("Post Office");
    expect(hit("workspace settings")).toContain("Team");
    expect(hit("rpcntr")).toContain("Repurpose Center");
    expect(hit("zzzz")).toEqual([]);
  });
});

describe("publishing standard", () => {
  it("uses the agreed labels including Schedule", () => {
    expect(Object.values(PUBLISH_ACTION_LABELS)).toEqual(["Publish now", "Schedule", "Copy full package", "Download full package"]);
  });
});
