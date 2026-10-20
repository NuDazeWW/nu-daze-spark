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
