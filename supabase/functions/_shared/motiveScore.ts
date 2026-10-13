// Content Motive Score™ — deterministic sub-scores shared by preflight-review.
// Voice fit is AI-rated separately and passed in; the other four are computed here.

export interface MotiveInput {
  draft_copy: string;
  hashtags: string[] | null;
  platform: string;
  content_type: string;
  objective?: string | null;
  audience?: string | null;
  campaign_pillar?: string | null;
  recentPosts: { draft_copy: string; hashtags: string[] | null }[];
}

export interface MotiveBreakdown {
  hook_strength: number;   // /25
  strategic_fit: number;   // /25
  voice_fit: number | null; // /20, AI-rated (null when AI unavailable)
  platform_fit: number;    // /15
  originality: number;     // /15
  total: number;           // /100 (voice_fit estimated when null)
  band: "strong" | "workable" | "needs_work";
  weakest: { key: string; hint: string };
}

const GENERIC_OPENERS = [
  "in today's", "in a world", "are you ready", "did you know", "exciting news",
  "we're excited", "we are excited", "thrilled to announce", "game-changer",
  "let's dive", "look no further", "unlock", "elevate your", "take your",
];

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));

function hookScore(copy: string): { score: number; hint: string } {
  const first = (copy.split("\n").find((l) => l.trim()) ?? "").trim();
  if (!first) return { score: 0, hint: "Add a strong opening line." };
  const lower = first.toLowerCase();
  let score = 18;
  if (GENERIC_OPENERS.some((g) => lower.startsWith(g) || lower.includes(g))) score -= 10;
  if (/\d/.test(first)) score += 4; // concrete number/stat
  if (first.endsWith("?")) score += 2;
  if (first.length >= 30 && first.length <= 140) score += 3;
  if (first.length < 15) score -= 4;
  return {
    score: clamp(score, 25),
    hint: "Open with a specific fact, number, or bold claim — not a generic opener.",
  };
}

function strategicScore(card: MotiveInput): { score: number; hint: string } {
  const copy = card.draft_copy.toLowerCase();
  const words = (s?: string | null) =>
    (s ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4);
  const overlap = (a: string[]) => a.filter((w) => copy.includes(w)).length;
  let score = 12;
  if (card.objective) score += Math.min(5, overlap(words(card.objective)));
  if (card.audience) score += Math.min(4, overlap(words(card.audience)));
  if (card.campaign_pillar) score += Math.min(4, overlap(words(card.campaign_pillar)));
  if (!card.objective && !card.audience && !card.campaign_pillar) score = 10; // unlinked draft
  return {
    score: clamp(score, 25),
    hint: "Tie the draft more explicitly to the brief's objective and audience language.",
  };
}

function platformScore(card: MotiveInput): { score: number; hint: string } {
  const len = card.draft_copy.length;
  const tags = card.hashtags?.length ?? 0;
  let score = 15;
  if (card.platform === "linkedin") {
    if (len > 3000) score -= 6; else if (len < 200) score -= 4;
    if (tags > 5) score -= 3;
  } else if (card.platform === "instagram") {
    if (card.content_type === "post" && tags === 0) score -= 4;
    if (tags > 15) score -= 4;
    if (card.content_type === "story" && !/frame\s*\d/i.test(card.draft_copy)) score -= 7;
    if (card.content_type === "reel" && !/0:00|hook/i.test(card.draft_copy)) score -= 7;
  } else if (card.platform === "facebook") {
    if (tags > 3) score -= 3;
    if (len > 2000) score -= 4;
  }
  return {
    score: clamp(score, 15),
    hint: "Adjust length, hashtag count, or format structure to match platform conventions.",
  };
}

function originalityScore(card: MotiveInput): { score: number; hint: string } {
  const first = (card.draft_copy.split("\n").find((l) => l.trim()) ?? "").trim().toLowerCase();
  const tags = new Set((card.hashtags ?? []).map((h) => h.toLowerCase()));
  let score = 15;
  let dupes = 0;
  for (const p of card.recentPosts) {
    const pFirst = (p.draft_copy.split("\n").find((l) => l.trim()) ?? "").trim().toLowerCase();
    if (first && pFirst && (pFirst === first || (first.length > 20 && pFirst.startsWith(first.slice(0, 30))))) dupes++;
    const shared = (p.hashtags ?? []).filter((h) => tags.has(h.toLowerCase())).length;
    if (tags.size > 0 && shared / tags.size > 0.8) score -= 2;
  }
  if (dupes > 0) score -= 8;
  return {
    score: clamp(score, 15),
    hint: "Vary the opening hook and hashtag set — recent posts use similar ones.",
  };
}

export function motiveScore(card: MotiveInput, aiVoiceScore: number | null): MotiveBreakdown {
  const hook = hookScore(card.draft_copy);
  const strategic = strategicScore(card);
  const platform = platformScore(card);
  const originality = originalityScore(card);
  const voice = aiVoiceScore == null ? null : clamp((aiVoiceScore / 100) * 20, 20);

  const parts = [
    { key: "Hook strength", score: hook.score, max: 25, hint: hook.hint },
    { key: "Strategic fit", score: strategic.score, max: 25, hint: strategic.hint },
    { key: "Voice fit", score: voice ?? 12, max: 20, hint: "Edit wording to match the brand voice, then re-run Preflight." },
    { key: "Platform fit", score: platform.score, max: 15, hint: platform.hint },
    { key: "Originality", score: originality.score, max: 15, hint: originality.hint },
  ];
  const total = parts.reduce((s, p) => s + p.score, 0);
  const weakest = parts.reduce((a, b) => (a.score / a.max <= b.score / b.max ? a : b));
  return {
    hook_strength: hook.score,
    strategic_fit: strategic.score,
    voice_fit: voice,
    platform_fit: platform.score,
    originality: originality.score,
    total,
    band: total >= 80 ? "strong" : total >= 60 ? "workable" : "needs_work",
    weakest: { key: weakest.key, hint: weakest.hint },
  };
}
