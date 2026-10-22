import { LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";
import { groupForPath, isNavItemActive, type NavItem } from "./navigation";

describe("page-local navigation", () => {
  it("uses real Dashboard hover destinations in their hover-menu order", () => {
    expect(groupForPath("/")?.items.map((item) => item.title)).toEqual([
      "Today at a glance",
      "Pipeline overview",
      "Approved library",
      "New campaign brief",
    ]);
  });

  it("uses verified Post Office section targets and avoids duplicating Strategy tabs", () => {
    expect(groupForPath("/generator")?.items.map((item) => item.href)).toEqual([
      "/briefs",
      "/generator#generation-station",
      "/generator#post-connector",
    ]);
    expect(groupForPath("/strategy")).toBeUndefined();
    expect(groupForPath("/assets")?.id).toBe("strategy");
  });

  it("keeps the same ordered sibling buttons on every settings and planner page", () => {
    const settings = groupForPath("/setup")!;
    expect(settings.items).toHaveLength(8);
    expect(groupForPath("/settings/team")?.items).toBe(settings.items);
    expect(groupForPath("/planner")?.id).toBe("plan");
    expect(groupForPath("/insights")?.id).toBe("core");
  });

  it("does not confuse outbound Dashboard links with a destination's local navigation", () => {
    expect(groupForPath("/queue")).toBeUndefined();
    expect(groupForPath("/approved")).toBeUndefined();
    expect(groupForPath("/publishing")).toBeUndefined();
    expect(groupForPath("/briefs")?.id).toBe("create");
  });
});

describe("isNavItemActive", () => {
  const strategyVoices: NavItem = {
    title: "Voices",
    icon: LayoutDashboard,
    href: "/strategy?tab=voices",
    kind: "tab",
  };
  const filteredTools: NavItem = {
    title: "AI tools",
    icon: LayoutDashboard,
    href: "/settings/connections?tab=ai&view=tools",
    kind: "tab",
  };

  it("matches queries by key and value rather than URL substrings", () => {
    expect(isNavItemActive(strategyVoices, "/strategy", "?source=sidebar&tab=voices", "")).toBe(true);
    expect(isNavItemActive(strategyVoices, "/strategy", "?tab=voices-archive", "")).toBe(false);
    expect(isNavItemActive(strategyVoices, "/strategy", "?tab=voice", "")).toBe(false);
    expect(isNavItemActive(filteredTools, "/settings/connections", "?view=tools&tab=ai", "")).toBe(true);
    expect(isNavItemActive(filteredTools, "/settings/connections", "?tab=ai", "")).toBe(false);
  });

  it("selects each Post Office link only for its exact section hash", () => {
    const [, station, connector] = groupForPath("/generator")!.items;
    expect(isNavItemActive(station, "/generator", "", "#generation-station")).toBe(true);
    expect(isNavItemActive(station, "/generator", "", "#post-connector")).toBe(false);
    expect(isNavItemActive(connector, "/generator", "", "#post-connector")).toBe(true);
    // The Campaign Briefs entry points at another page, so it is never the selected one here.
    const briefs = groupForPath("/generator")!.items[0];
    expect(isNavItemActive(briefs, "/generator", "", "")).toBe(false);
    expect(isNavItemActive(briefs, "/briefs", "", "")).toBe(true);
  });
});
