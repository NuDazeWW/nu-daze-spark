import { supabase } from "@/integrations/supabase/client";

export interface StrategyDraft {
  summary?: string;
  voice_rules: { rule_name: string; rule_content: string; category: string; evidence?: string }[];
  banned_phrases: string[];
  required_language: string[];
  audiences: { segment_name: string; description: string; platforms: string[]; evidence?: string }[];
  pillars: { name: string; description: string; evidence?: string }[];
  platform_rules: { platform: "linkedin" | "instagram" | "facebook"; rule_name: string; rule_content: string }[];
  ctas: string[];
  hashtags: string[];
}

export type DraftSection = keyof Omit<StrategyDraft, "summary">;

export const SECTION_LABELS: Record<DraftSection, string> = {
  voice_rules: "Brand voice rules",
  banned_phrases: "Banned phrases",
  required_language: "Required language",
  audiences: "Audiences",
  pillars: "Content pillars",
  platform_rules: "Platform rules",
  ctas: "CTA bank",
  hashtags: "Hashtag bank",
};

/** Item ids are `${section}:${index}`; only selected ids are written. */
export async function applyStrategyDraft(draft: StrategyDraft, selected: Set<string>, clientId: string, userId: string, sourceLabel: string) {
  const pick = <T,>(section: DraftSection, arr: T[]) => arr.filter((_, i) => selected.has(`${section}:${i}`));
  const meta = { client_id: clientId, created_by: userId, updated_by: userId };
  const ops: PromiseLike<{ error: unknown }>[] = [];
  const voice = pick("voice_rules", draft.voice_rules).map((r) => ({ ...meta, rule_name: r.rule_name, rule_content: r.rule_content, category: r.category || "general" }));
  const banned = pick("banned_phrases", draft.banned_phrases);
  if (banned.length) voice.push({ ...meta, rule_name: `Banned phrases (${sourceLabel})`, rule_content: banned.join("\n"), category: "banned phrases" });
  const req = pick("required_language", draft.required_language);
  if (req.length) voice.push({ ...meta, rule_name: `Required language (${sourceLabel})`, rule_content: req.join("\n"), category: "required language" });
  if (voice.length) ops.push(supabase.from("brand_voice_rules").insert(voice));
  const aud = pick("audiences", draft.audiences);
  if (aud.length) ops.push(supabase.from("audience_definitions").insert(aud.map((a) => ({ ...meta, segment_name: a.segment_name, description: a.description, platforms: a.platforms as never }))));
  const pil = pick("pillars", draft.pillars);
  if (pil.length) ops.push(supabase.from("campaign_rules").insert(pil.map((p) => ({ ...meta, campaign_name: p.name, description: p.description, content_pillars: [p.name] }))));
  const pr = pick("platform_rules", draft.platform_rules);
  if (pr.length) ops.push(supabase.from("platform_rules").insert(pr.map((r) => ({ ...meta, platform: r.platform, rule_name: r.rule_name, rule_content: r.rule_content }))));
  const ctas = pick("ctas", draft.ctas);
  if (ctas.length) ops.push(supabase.from("cta_banks").insert({ ...meta, bank_name: `CTAs (${sourceLabel})`, category: "general", ctas }));
  const tags = pick("hashtags", draft.hashtags).map((h) => (h.startsWith("#") ? h : `#${h}`).replace(/\s+/g, ""));
  if (tags.length) ops.push(supabase.from("hashtag_banks").insert({ ...meta, bank_name: `Hashtags (${sourceLabel})`, category: "general", hashtags: tags }));
  const results = await Promise.all(ops);
  const err = results.find((r) => r.error)?.error as { message?: string } | undefined;
  if (err) throw new Error(err.message ?? "Could not save some items");
  return selected.size;
}

export function allItemIds(d: StrategyDraft): string[] {
  return (Object.keys(SECTION_LABELS) as DraftSection[]).flatMap((s) => (d[s] as unknown[]).map((_, i) => `${s}:${i}`));
}

/** Extract plain text from a PDF, DOCX, or TXT file in the browser. */
export async function readDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) return file.text();
  const buf = await file.arrayBuffer();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ arrayBuffer: buf })).value;
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 60); i++) {
      const page = await doc.getPage(i);
      const c = await page.getTextContent();
      parts.push(c.items.map((it) => ("str" in it ? it.str : "")).join(" "));
    }
    return parts.join("\n\n");
  }
  throw new Error("Use a PDF, Word (.docx), or text file.");
}
