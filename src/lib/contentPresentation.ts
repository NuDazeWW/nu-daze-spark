/** Presentation only: type and lifecycle state are separate visual signals. */
export const commentLabel = (source?: { author_name?: string | null; topic?: string | null } | null) =>
  ["Comment", source?.author_name?.trim(), source?.topic?.trim()].filter(Boolean).join(" — ");

const READING_SURFACES = [
  "/planner",
  "/sources",
  "/sources",
  "/settings/workspace",
  "/settings/team",
  "/settings/notifications",
  "/settings/connections",
  "/settings/email-provider",
];

export const pageSurface = (pathname: string): "dark" | "reading" =>
  READING_SURFACES.includes(pathname) ? "reading" : "dark";
/** One leading "#", no blanks, no case-insensitive repeats. Accepts arrays or a space/comma string. */
export function normalizeHashtags(input: string[] | string | null | undefined): string[] {
  const raw = Array.isArray(input) ? input : (input ?? "").split(/[\s,]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const term = String(t ?? "").trim().replace(/^#+/, "").trim();
    if (!term || /\s/.test(term)) { if (term) out.push(...normalizeHashtags(term.split(/\s+/)).filter((x) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))); continue; }
    const tag = `#${term}`;
    if (seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out;
}

export const formatHashtags = (input: string[] | string | null | undefined) => normalizeHashtags(input).join(" ");

/** Exactly what gets copied/sent: copy + optional disclosure + hashtags. */
export const outboundText = (copy: string, hashtags: string[] | null | undefined, disclosure = false) =>
  [copy + (disclosure ? "\n\n#AIassisted" : ""), formatHashtags(hashtags)].filter(Boolean).join("\n\n");
