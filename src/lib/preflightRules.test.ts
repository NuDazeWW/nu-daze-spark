import { describe, expect, it } from "vitest";
import { draftChecksum, overallStatus, runRuleChecks, splitPhrases } from "./preflightRules";

const base = { platform: "linkedin", content_type: "post", draft_copy: "A specific opening line here\nBook a call today with us", hashtags: ["#ops"], brief_id: "b", master_content_id: null, source_references: [] };
const ctx = { bannedPhrases: [], requiredLanguage: [], recentPosts: [], clearedMediaCount: 0 };

describe("preflight rules", () => {
  it("passes a clean linked draft", () => {
    expect(overallStatus(runRuleChecks(base, ctx))).toBe("pass");
  });
  it("blocks banned phrases and missing required language", () => {
    const f = runRuleChecks({ ...base, draft_copy: "We are a Game-Changer in ops" }, { ...ctx, bannedPhrases: ["game-changer"], requiredLanguage: ["NuDaze"] });
    expect(f.map((x) => x.check)).toEqual(expect.arrayContaining(["banned_phrase", "required_language"]));
    expect(overallStatus(f)).toBe("blocked");
  });
  it("blocks over-limit copy and hashtags", () => {
    const f = runRuleChecks({ ...base, draft_copy: "x".repeat(3001), hashtags: ["a", "b", "c", "d", "e", "f"] }, ctx);
    expect(f.filter((x) => x.severity === "blocking").map((x) => x.check)).toEqual(["char_limit", "hashtag_count"]);
  });
  it("flags duplicate hooks and weak sources as advisory", () => {
    const f = runRuleChecks({ ...base, brief_id: null }, { ...ctx, recentPosts: [{ id: "1", draft_copy: "A specific opening line here\nother", hashtags: [] }] });
    expect(f.map((x) => x.check)).toEqual(["duplicate_hook", "weak_source"]);
    expect(overallStatus(f)).toBe("warnings");
  });
  it("warns on Instagram with no cleared media", () => {
    expect(runRuleChecks({ ...base, platform: "instagram", content_type: "reel" }, ctx).some((f) => f.check === "media")).toBe(true);
  });
  it("checksum changes with edits; phrases split cleanly", () => {
    expect(draftChecksum(base)).not.toBe(draftChecksum({ ...base, draft_copy: base.draft_copy + "!" }));
    expect(splitPhrases("- game-changer\n• synergy, leverage")).toEqual(["game-changer", "synergy", "leverage"]);
  });
});
