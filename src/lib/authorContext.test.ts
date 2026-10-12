import { describe, expect, it } from "vitest";
import { authorContextLines, authorContextSearch, readAuthorContext, safeAuthorProfile } from "./authorContext";
import { groundedAuthorContext } from "../../supabase/functions/scrape-posts/authorContext";

describe("author context", () => {
  it("formats LinkedIn workplace and partial context", () => {
    expect(authorContextLines({ title: "Director", employer: "Acme" }, "linkedin")).toEqual(["Director at Acme"]);
    expect(authorContextLines({ employer: "Acme" }, "linkedin")).toEqual(["Acme"]);
  });
  it("formats Instagram handles, categories, and biographies", () => {
    expect(authorContextLines({ handle: "@jane", category: "Creator", bio: "Marketing writer" }, "instagram")).toEqual(["@jane", "Creator", "Marketing writer"]);
  });
  it("does not invent missing fields and ignores malformed data", () => {
    expect(readAuthorContext(null)).toEqual({});
    expect(readAuthorContext({ title: 23, employer: " " })).toEqual({});
    expect(authorContextLines({}, "linkedin")).toEqual([]);
  });
  it("allows only genuine HTTPS platform profile URLs", () => {
    expect(safeAuthorProfile("https://www.linkedin.com/in/jane", "linkedin")).toBeTruthy();
    expect(safeAuthorProfile("https://instagram.com/jane/", "instagram")).toBeTruthy();
    for (const url of ["javascript:alert(1)", "https://linkedin.com.evil.com/in/jane", "https://evil@linkedin.com/in/jane", "https://linkedin.com/posts/jane"]) expect(safeAuthorProfile(url, "linkedin")).toBeUndefined();
    expect(safeAuthorProfile("https://instagram.com/p/", "instagram")).toBeUndefined();
  });
  it("includes workplace and biography in search", () => {
    expect(authorContextSearch({ employer: "Acme", bio: "Writer" })).toContain("Acme Writer");
  });
  it("requires exact source evidence and rejects invented fields", () => {
    expect(groundedAuthorContext({ title: "Director", employer: "Invented", evidence: "Jane — Director at Acme" }, "Jane — Director at Acme", "linkedin")).toEqual({ title: "Director", provenance: "source", evidence: "Jane — Director at Acme" });
    expect(groundedAuthorContext({ employer: "Acme", evidence: "Works at Acme" }, "Acme makes tools", "linkedin")).toBeNull();
  });
});