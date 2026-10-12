// Pure, dependency-free preflight rule checks shared by the edge function and the app.

export type PreflightSeverity = "blocking" | "advisory";
export type PreflightStatus = "pass" | "warnings" | "blocked";

export interface PreflightFinding {
  check: string;
  severity: PreflightSeverity;
  message: string;
  excerpt: string | null;
  suggestion: string | null;
  source: "rules" | "ai";
}

export interface PreflightCardInput {
  platform: string;
  content_type: string;
  draft_copy: string;
  hashtags: string[] | null;
  brief_id: string | null;
  master_content_id: string | null;
  source_references: string[] | null;
}

export interface PreflightContext {
  bannedPhrases: string[];
  requiredLanguage: string[];
  recentPosts: { id: string; draft_copy: string; hashtags: string[] | null }[];
  clearedMediaCount: number;
}

export const CHAR_LIMITS: Record<string, number> = { linkedin: 3000, instagram: 2200 };
export const HASHTAG_LIMITS: Record<string, number> = { linkedin: 5, instagram: 30 };

/** Deterministic FNV-1a hash of the reviewable parts of a draft. */
export function draftChecksum(card: Pick<PreflightCardInput, "draft_copy" | "hashtags">): string {
  const text = `${card.draft_copy ?? ""}\u0000${(card.hashtags ?? []).join(",")}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Split a strategy rule's content into individual phrases (one per line, or comma/semicolon separated). */
export function splitPhrases(content: string): string[] {
  return content
    .split(/[\n;,]+/)
    .map((p) => p.replace(/^[\s\-*•"']+|[\s"'.]+$/g, "").trim())
    .filter((p) => p.length >= 2);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const normTag = (h: string) => h.replace(/^#/, "").toLowerCase();

/** First meaningful line of a draft, ignoring production headings. */
export function hookOf(copy: string): string {
  const line = copy
    .split("\n")
    .map((l) => l.replace(/[*_#>]/g, "").trim())
    .find((l) => l.length > 0 && !/^(FRAME|REEL CONCEPT|DURATION)\b/i.test(l));
  return norm(line ?? "");
}

/** Last meaningful line, used as a rough CTA signature. */
export function ctaOf(copy: string): string {
  const lines = copy.split("\n").map((l) => l.replace(/[*_#>]/g, "").trim()).filter((l) => l && !l.startsWith("#"));
  return norm(lines[lines.length - 1] ?? "");
}

const VISUAL_TYPES = new Set(["story", "reel", "carousel"]);

export function runRuleChecks(card: PreflightCardInput, ctx: PreflightContext): PreflightFinding[] {
  const out: PreflightFinding[] = [];
  const copy = card.draft_copy ?? "";
  const lower = copy.toLowerCase();
  const tags = (card.hashtags ?? []).map(normTag).filter(Boolean);

  for (const phrase of ctx.bannedPhrases) {
    const idx = lower.indexOf(phrase.toLowerCase());
    if (idx >= 0) {
      out.push({
        check: "banned_phrase", severity: "blocking", source: "rules",
        message: `Uses a banned phrase: "${phrase}"`,
        excerpt: copy.slice(idx, idx + phrase.length),
        suggestion: "Remove or rephrase this wording.",
      });
    }
  }

  for (const req of ctx.requiredLanguage) {
    if (!lower.includes(req.toLowerCase())) {
      out.push({
        check: "required_language", severity: "blocking", source: "rules",
        message: `Missing required language: "${req}"`,
        excerpt: null, suggestion: `Include "${req}" in the copy.`,
      });
    }
  }

  const limit = CHAR_LIMITS[card.platform];
  if (limit && copy.length > limit) {
    out.push({
      check: "char_limit", severity: "blocking", source: "rules",
      message: `Copy is ${copy.length.toLocaleString()} characters; ${card.platform} allows ${limit.toLocaleString()}.`,
      excerpt: null, suggestion: `Cut at least ${(copy.length - limit).toLocaleString()} characters.`,
    });
  }
  const hLimit = HASHTAG_LIMITS[card.platform];
  if (hLimit && tags.length > hLimit) {
    out.push({
      check: "hashtag_count", severity: "blocking", source: "rules",
      message: `${tags.length} hashtags; ${card.platform} limit is ${hLimit}.`,
      excerpt: null, suggestion: `Keep the ${hLimit} most relevant hashtags.`,
    });
  }

  const hook = hookOf(copy);
  const cta = ctaOf(copy);
  const tagKey = [...tags].sort().join(",");
  for (const p of ctx.recentPosts) {
    if (hook && hook.length >= 12 && hookOf(p.draft_copy) === hook) {
      out.push({
        check: "duplicate_hook", severity: "advisory", source: "rules",
        message: "Opening line repeats a post from the last 30 days.",
        excerpt: hook, suggestion: "Write a fresh hook.",
      });
      break;
    }
  }
  if (cta && cta.length >= 12 && ctx.recentPosts.some((p) => ctaOf(p.draft_copy) === cta)) {
    out.push({
      check: "duplicate_cta", severity: "advisory", source: "rules",
      message: "Closing call to action repeats a recent post.",
      excerpt: cta, suggestion: "Vary the CTA wording.",
    });
  }
  if (tags.length >= 3 && ctx.recentPosts.some((p) => [...(p.hashtags ?? []).map(normTag)].sort().join(",") === tagKey)) {
    out.push({
      check: "duplicate_hashtags", severity: "advisory", source: "rules",
      message: "Identical hashtag set used on a recent post.",
      excerpt: null, suggestion: "Swap in a few different hashtags.",
    });
  }

  if (card.platform === "instagram" && (VISUAL_TYPES.has(card.content_type) || card.content_type === "post") && ctx.clearedMediaCount === 0) {
    out.push({
      check: "media", severity: "advisory", source: "rules",
      message: "No cleared image or video attached for this visual format.",
      excerpt: null, suggestion: "Attach a cleared asset before export.",
    });
  }

  if (!card.brief_id && !card.master_content_id && (card.source_references ?? []).length === 0) {
    out.push({
      check: "weak_source", severity: "advisory", source: "rules",
      message: "Weak source: not linked to a brief, master content, or source asset.",
      excerpt: null, suggestion: "Link this draft to an approved brief or source.",
    });
  }

  return out;
}

export function overallStatus(findings: PreflightFinding[]): PreflightStatus {
  if (findings.some((f) => f.severity === "blocking")) return "blocked";
  if (findings.length > 0) return "warnings";
  return "pass";
}
