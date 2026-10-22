/** Accent by purpose, never by position. Use as data-accent on .sm-lit / .sm-lit-icon. */
export type Accent = "cyan" | "magenta" | "violet" | "gold" | "lime" | "neutral";
export const ACCENT_BY_PURPOSE = {
  aiCreation: "cyan",
  engagement: "magenta",
  planning: "violet",
  importReview: "gold",
  verifiedReady: "lime",
  supporting: "neutral",
} as const satisfies Record<string, Accent>;

/** Preserve existing named tones without assigning colors by render order. */
export function accentFromClassName(className?: string): Accent | undefined {
  const tone = className?.match(/(?:^|\s)sm-tone-(cyan|coral|magenta|violet|gold|lime)(?:\s|$)/)?.[1];
  return tone === "coral" ? "magenta" : tone as Accent | undefined;
}
