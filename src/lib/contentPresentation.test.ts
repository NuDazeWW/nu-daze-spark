import { describe, expect, it } from "vitest";
import { commentLabel, pageSurface } from "./contentPresentation";

describe("content presentation", () => {
  it("identifies comments without inventing an author or topic", () => {
    expect(commentLabel(null)).toBe("Comment");
    expect(commentLabel({ author_name: " Alex ", topic: "Strategy" })).toBe("Comment — Alex — Strategy");
    expect(commentLabel({ topic: "Strategy" })).toBe("Comment — Strategy");
  });
  it("keeps forms light and reference command pages dark", () => {
    for (const path of ["/queue", "/approved", "/briefs", "/setup", "/sources", "/strategy", "/comments", "/repurpose", "/settings/tags", "/settings/clients"]) {
      expect(pageSurface(path)).toBe("reading");
    }
    expect(pageSurface("/")).toBe("dark");
    for (const path of ["/insights", "/assets", "/generator"]) expect(pageSurface(path)).toBe("dark");
    expect(pageSurface("/auth")).toBe("dark");
  });
});