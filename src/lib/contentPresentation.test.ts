import { describe, expect, it } from "vitest";
import { commentLabel, pageSurface } from "./contentPresentation";

describe("content presentation", () => {
  it("identifies comments without inventing an author or topic", () => {
    expect(commentLabel(null)).toBe("Comment");
    expect(commentLabel({ author_name: " Alex ", topic: "Strategy" })).toBe("Comment — Alex — Strategy");
    expect(commentLabel({ topic: "Strategy" })).toBe("Comment — Strategy");
  });
  it("keeps focused settings forms light and operational workspaces dark", () => {
    for (const path of ["/setup", "/strategy", "/settings/workspace", "/settings/team", "/settings/notifications", "/settings/connections", "/settings/email-provider"]) {
      expect(pageSurface(path)).toBe("reading");
    }
    for (const path of ["/", "/insights", "/assets", "/generator", "/queue", "/approved", "/briefs", "/comments", "/repurpose", "/settings/tags", "/settings/clients", "/auth"]) {
      expect(pageSurface(path)).toBe("dark");
    }
  });
});