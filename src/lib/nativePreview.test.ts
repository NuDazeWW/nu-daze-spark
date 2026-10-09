import { describe, expect, it } from "vitest";
import { extractPreviewCopy, isPreviewMedia, parseStoryFrames, previewLimit, withHashtags } from "./nativePreview";

describe("native preview copy", () => {
  it("keeps normal feed copy unchanged", () => {
    expect(extractPreviewCopy("A useful message.\nAnother line.", "post").caption).toBe("A useful message.\nAnother line.");
  });
  it("extracts Reel final caption without production instructions", () => {
    const draft = "REEL CONCEPT: Strategy\nDURATION: 30s\nVisual: Interview\n**FINAL CAPTION:**\nA real caption.\nCTA/LINK: example";
    expect(extractPreviewCopy(draft, "reel")).toEqual({ caption: "A real caption.", structured: true, missingCaption: false });
  });
  it("does not display an outline when the caption is missing", () => {
    expect(extractPreviewCopy("REEL CONCEPT: Growth\nDURATION: 30s", "reel").missingCaption).toBe(true);
    expect(extractPreviewCopy("FRAME 1 — Hook\nVisual: Office", "story").caption).toBe("");
  });
  it("accepts an inline markdown caption heading", () => {
    expect(extractPreviewCopy("## FINAL CAPTION — Hello world\nNext line\nEDITING NOTES: cut", "reel").caption).toBe("Hello world\nNext line");
  });
  it("parses frames and on-screen text without treating caption as a frame", () => {
    const draft = 'FRAME 1 — Hook\nVisual: Office\nOn-screen text: "Start here"\nFRAME 2 — CTA\nOn-screen text: Join us\nSTORY CAPTION\nCaption';
    const frames = parseStoryFrames(draft);
    expect(frames).toHaveLength(2);
    expect(frames[0].onScreen).toBe("Start here");
    expect(frames[1].outline).not.toContain("Caption");
  });
  it("normalizes and deduplicates separate hashtags", () => {
    expect(withHashtags("Hello #Strategy", ["strategy", "#growth", "growth"])).toBe("Hello #Strategy\n\n#growth");
  });
  it("uses platform character limits", () => {
    expect(previewLimit("instagram")).toBe(2200);
    expect(previewLimit("linkedin")).toBe(3000);
  });
});

describe("preview media permissions", () => {
  const image = { asset_type: "image", permission_state: "generation_allowed" };
  it("includes only cleared image/video assets", () => {
    expect(isPreviewMedia(image)).toBe(true);
    expect(isPreviewMedia({ ...image, asset_type: "video" })).toBe(true);
    for (const state of ["blocked", "archived", "summarization_only"]) expect(isPreviewMedia({ ...image, permission_state: state })).toBe(false);
    expect(isPreviewMedia({ ...image, asset_type: "pdf" })).toBe(false);
  });
  it("excludes trashed and expired media", () => {
    expect(isPreviewMedia({ ...image, deleted_at: "2026-01-01" })).toBe(false);
    expect(isPreviewMedia({ ...image, expires_at: "2000-01-01" })).toBe(false);
  });
});