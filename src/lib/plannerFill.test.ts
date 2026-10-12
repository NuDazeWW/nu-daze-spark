import { describe, it, expect } from "vitest";
import { proposeFill, weekCoverage, coverageTone, weekKey } from "./plannerFill";

const from = new Date("2026-11-02T00:00:00"); // Monday
const to = new Date("2026-11-29T23:59:00");
const targets = [{ platform: "linkedin", content_type: "post", weekly_target: 2 }];
const pool = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, platform: "linkedin", content_type: "post", scheduled_for: null }));

describe("proposeFill", () => {
  it("spreads posts round-robin across weeks", () => {
    const out = proposeFill({ pool, scheduled: [], targets, from, to });
    expect(out).toHaveLength(5);
    const weeks = out.map((a) => weekKey(new Date(a.scheduled_for)));
    expect(new Set(weeks.slice(0, 4)).size).toBe(4);
  });
  it("respects existing stock and never doubles a slot", () => {
    const scheduled = [
      { id: "s1", platform: "linkedin", content_type: "post", scheduled_for: new Date("2026-11-02T09:00:00").toISOString() },
      { id: "s2", platform: "linkedin", content_type: "post", scheduled_for: new Date("2026-11-04T09:00:00").toISOString() },
    ];
    const out = proposeFill({ pool, scheduled, targets, from, to });
    expect(out.every((a) => weekKey(new Date(a.scheduled_for)) !== "2026-11-02")).toBe(true);
    const slots = [...scheduled.map((s) => s.scheduled_for), ...out.map((a) => a.scheduled_for)];
    expect(new Set(slots).size).toBe(slots.length);
  });
  it("never schedules outside the range", () => {
    const out = proposeFill({ pool, scheduled: [], targets, from, to });
    out.forEach((a) => { const d = new Date(a.scheduled_for); expect(d >= from && d <= to).toBe(true); });
  });
});

describe("coverage", () => {
  it("grades weeks", () => {
    const c = weekCoverage([{ id: "a", platform: "linkedin", content_type: "post", scheduled_for: new Date("2026-11-03T09:00:00").toISOString() }], targets, from);
    expect(c[0].have).toBe(1);
    expect(coverageTone(c)).toBe("partial");
    expect(coverageTone(weekCoverage([], targets, from))).toBe("empty");
  });
});
