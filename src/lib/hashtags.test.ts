import { describe, expect, it } from "vitest";
import { formatHashtags, normalizeHashtags, outboundText } from "./contentPresentation";

describe("hashtags", () => {
  it("adds exactly one # and drops blanks and repeats", () => {
    expect(formatHashtags(["ThoughtLeadership", "#ContentROI", "##Double", "", "  ", "thoughtleadership"])).toBe("#ThoughtLeadership #ContentROI #Double");
  });
  it("accepts a string", () => {
    expect(normalizeHashtags("a, #b  c")).toEqual(["#a", "#b", "#c"]);
    expect(formatHashtags(null)).toBe("");
  });
  it("outbound text includes disclosure and hashtags", () => {
    expect(outboundText("Hi", ["x"], true)).toBe("Hi\n\n#AIassisted\n\n#x");
  });
});
