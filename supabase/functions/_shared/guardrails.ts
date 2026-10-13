// Out-of-the-box guardrail dictionary shared by the app and the preflight edge function.

export type GuardrailTier = "profanity" | "risky_claims" | "cliches";

export interface GuardrailTerm { term: string; replacement?: string }

export interface GuardrailTierMeta {
  key: GuardrailTier;
  label: string;
  description: string;
  severity: "blocking" | "advisory";
}

export const GUARDRAIL_TIERS: GuardrailTierMeta[] = [
  { key: "profanity", label: "Profanity & explicit language", severity: "blocking",
    description: "Cursing, slurs, and explicit wording. Blocks approval until removed or an admin overrides." },
  { key: "risky_claims", label: "Risky claims & trigger words", severity: "advisory",
    description: "Guarantees, false urgency, engagement bait, and sensitive trigger topics that need a second look." },
  { key: "cliches", label: "AI & corporate clichés", severity: "advisory",
    description: "Overused phrases that make copy sound generic or machine-written. Suggests plainer wording." },
];

export const BASELINE_GUARDRAILS: Record<GuardrailTier, GuardrailTerm[]> = {
  profanity: [
    "fuck", "fucking", "fucked", "motherfucker", "shit", "shitty", "bullshit", "damn", "goddamn", "hell no",
    "ass", "asshole", "bitch", "bastard", "crap", "dick", "piss", "pissed", "wtf", "stfu", "omfg",
    "cunt", "twat", "prick", "douche", "douchebag", "slut", "whore", "retard", "retarded", "sexy", "porn", "nsfw",
  ].map((term) => ({ term })),
  risky_claims: [
    { term: "guaranteed", replacement: "designed to" },
    { term: "100% guaranteed", replacement: "backed by" },
    { term: "risk-free", replacement: "low-commitment" },
    { term: "no risk", replacement: "low-commitment" },
    { term: "get rich", replacement: "grow revenue" },
    { term: "overnight success", replacement: "steady progress" },
    { term: "act now", replacement: "learn more" },
    { term: "limited time only", replacement: "available through [date]" },
    { term: "only a few spots left", replacement: "spots are limited" },
    { term: "last chance", replacement: "closing soon" },
    { term: "miracle", replacement: "meaningful" },
    { term: "cure", replacement: "help with" },
    { term: "best in the world", replacement: "trusted by [proof]" },
    { term: "number one", replacement: "a leading" },
    { term: "#1", replacement: "a leading" },
    { term: "comment below for", replacement: "message us for" },
    { term: "tag a friend", replacement: "share with someone who" },
    { term: "like if you agree", replacement: "what's your view?" },
    { term: "share this post", replacement: "pass this along if useful" },
    { term: "link in bio", replacement: "details at [destination]" },
    { term: "click here", replacement: "read more" },
    { term: "free money" }, { term: "double your" }, { term: "secret trick" }, { term: "they don't want you to know" },
    { term: "politics" }, { term: "election" }, { term: "religion" }, { term: "abortion" }, { term: "gun control" },
    { term: "suicide" }, { term: "self-harm" }, { term: "tragedy" }, { term: "shooting" },
  ],
  cliches: [
    { term: "delve", replacement: "look at" },
    { term: "dive deep", replacement: "look closely" },
    { term: "deep dive", replacement: "close look" },
    { term: "game-changer", replacement: "big shift" },
    { term: "game changer", replacement: "big shift" },
    { term: "testament to", replacement: "shows" },
    { term: "in today's fast-paced world", replacement: "today" },
    { term: "in today's digital landscape", replacement: "today" },
    { term: "ever-evolving landscape", replacement: "changing market" },
    { term: "navigate the complexities", replacement: "work through" },
    { term: "unlock the power", replacement: "use" },
    { term: "unlock your potential", replacement: "grow" },
    { term: "elevate your", replacement: "improve your" },
    { term: "harness the power", replacement: "use" },
    { term: "leverage", replacement: "use" },
    { term: "synergy", replacement: "teamwork" },
    { term: "paradigm shift", replacement: "change" },
    { term: "cutting-edge", replacement: "new" },
    { term: "best-in-class", replacement: "proven" },
    { term: "world-class", replacement: "proven" },
    { term: "seamless", replacement: "simple" },
    { term: "robust", replacement: "reliable" },
    { term: "revolutionize", replacement: "improve" },
    { term: "tapestry", replacement: "mix" },
    { term: "embark on a journey", replacement: "start" },
    { term: "it's not just about", replacement: "it's about" },
    { term: "let that sink in" },
    { term: "buckle up" },
    { term: "think outside the box", replacement: "try a new approach" },
    { term: "move the needle", replacement: "make progress" },
    { term: "circle back", replacement: "follow up" },
    { term: "low-hanging fruit", replacement: "quick wins" },
    { term: "at the end of the day", replacement: "ultimately" },
    { term: "thought leader", replacement: "expert" },
    { term: "i'm thrilled to announce", replacement: "we're announcing" },
    { term: "i'm humbled", replacement: "I'm grateful" },
    { term: "agree?" },
  ],
};

export interface GuardrailSettingsLike {
  enabled_tiers?: Partial<Record<GuardrailTier, boolean>> | null;
  custom_terms?: Partial<Record<GuardrailTier, string[]>> | null;
  disabled_terms?: string[] | null;
}

export interface ActiveGuardrail { term: string; tier: GuardrailTier; severity: "blocking" | "advisory"; replacement?: string; custom: boolean }

/** Resolve baseline + custom terms into the list preflight should check. Missing settings = all baseline tiers on. */
export function activeGuardrails(settings: GuardrailSettingsLike | null | undefined): ActiveGuardrail[] {
  const disabled = new Set((settings?.disabled_terms ?? []).map((t) => t.toLowerCase()));
  const out: ActiveGuardrail[] = [];
  for (const tier of GUARDRAIL_TIERS) {
    if (settings?.enabled_tiers?.[tier.key] === false) continue;
    for (const t of BASELINE_GUARDRAILS[tier.key]) {
      if (!disabled.has(t.term.toLowerCase())) out.push({ ...t, tier: tier.key, severity: tier.severity, custom: false });
    }
    for (const term of settings?.custom_terms?.[tier.key] ?? []) {
      if (term.trim()) out.push({ term: term.trim(), tier: tier.key, severity: tier.severity, custom: true });
    }
  }
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive match. Returns index or -1. */
export function findTerm(text: string, term: string): number {
  const startB = /^\w/.test(term) ? "(?<![\\w])" : "";
  const endB = /\w$/.test(term) ? "(?![\\w])" : "";
  const m = new RegExp(`${startB}${escapeRe(term)}${endB}`, "i").exec(text);
  return m ? m.index : -1;
}
