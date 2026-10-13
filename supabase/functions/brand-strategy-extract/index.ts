import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const MODEL = "openai/gpt-6-astra";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  mode: z.enum(["website", "document"]),
  company_name: z.string().max(200).optional(),
  urls: z.array(z.string().url().max(500)).max(8).optional(),
  notes: z.string().max(20000).optional(),
  document_text: z.string().max(120000).optional(),
  document_name: z.string().max(300).optional(),
  tone: z.record(z.number().min(0).max(100)).optional(),
});

const STR = { type: "string" };
const ARR = { type: "array", items: STR };
const obj = (props: Record<string, unknown>) => ({
  type: "object", additionalProperties: false, required: Object.keys(props), properties: props,
});
const SCHEMA = obj({
  summary: STR,
  voice_rules: { type: "array", items: obj({ rule_name: STR, rule_content: STR, category: STR, evidence: STR }) },
  banned_phrases: ARR,
  required_language: ARR,
  audiences: { type: "array", items: obj({ segment_name: STR, description: STR, platforms: ARR, evidence: STR }) },
  pillars: { type: "array", items: obj({ name: STR, description: STR, evidence: STR }) },
  platform_rules: { type: "array", items: obj({ platform: { type: "string", enum: ["linkedin", "instagram", "facebook"] }, rule_name: STR, rule_content: STR }) },
  ctas: ARR,
  hashtags: ARR,
});

async function scrape(url: string): Promise<string> {
  const fc = Deno.env.get("FIRECRAWL_API_KEY");
  try {
    if (fc) {
      const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${fc}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });
      if (r.ok) {
        const d = await r.json();
        const md = d.markdown ?? d.data?.markdown;
        if (md) return String(md).slice(0, 15000);
      }
    }
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 SocialMotive" } });
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ").slice(0, 15000);
  } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI not configured" }, 500);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!user) return json({ error: "Invalid session" }, 401);
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Only admins can generate strategy." }, 403);

    const p = Body.safeParse(await req.json().catch(() => ({})));
    if (!p.success) return json({ error: "Invalid input", details: p.error.flatten().fieldErrors }, 400);
    const b = p.data;

    let material = "";
    const sources: { label: string; ok: boolean }[] = [];
    if (b.mode === "website") {
      for (const u of b.urls ?? []) {
        const t = await scrape(u);
        sources.push({ label: u, ok: t.length > 200 });
        if (t.length > 200) material += `\n\n=== SOURCE: ${u} ===\n${t}`;
      }
      if (b.notes?.trim()) { material += `\n\n=== PASTED MARKETING MATERIAL ===\n${b.notes}`; sources.push({ label: "Pasted material", ok: true }); }
    } else {
      if (!b.document_text?.trim()) return json({ error: "The document had no readable text." }, 400);
      material = `=== DOCUMENT: ${b.document_name ?? "brand guide"} ===\n${b.document_text}`;
      sources.push({ label: b.document_name ?? "Document", ok: true });
    }
    if (material.trim().length < 200) {
      return json({ error: "Not enough readable content. Social sites often block reading — paste some captions or About text instead.", sources }, 422);
    }
    const toneText = b.tone ? Object.entries(b.tone).map(([k, v]) => `${k}: ${v}/100`).join(", ") : "";

    const instructions = b.mode === "document"
      ? "Extract the brand's existing strategy from its own brand/style guide. Only include what the document states or clearly implies. Do not invent. Leave arrays empty when the document is silent."
      : "Reverse-engineer a brand voice and content strategy from the brand's own public material. Ground every item in the supplied sources; cite a short quote or observation as evidence. Never invent facts, numbers, or claims about the company. Recommendations (CTAs, hashtags, platform tone) must fit what the sources show.";

    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, store: false, reasoning: { effort: "low" },
        instructions: `${instructions} Write 4-8 voice rules (categories such as tone, personality, language, formatting), 2-4 audiences, 3-6 content pillars, 1-2 rules per platform, 5-10 CTAs, 8-15 hashtags without spaces. banned_phrases: wording the brand should avoid. required_language: only legally/brand-required wording explicitly stated.`,
        input: [{ role: "user", content: `COMPANY: ${b.company_name ?? "(unknown)"}\n${toneText ? `DESIRED TONE SLIDERS: ${toneText}\n` : ""}${material.slice(0, 100000)}` }],
        text: { format: { type: "json_schema", name: "strategy", strict: true, schema: SCHEMA } },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      const msg = r.status === 429 ? "AI is busy — try again in a minute." : r.status === 402 ? "AI credits are used up for this workspace." : `AI request failed (${r.status})`;
      console.error(r.status, t);
      return json({ error: msg }, r.status === 429 || r.status === 402 ? r.status : 500);
    }
    const d = await r.json();
    const text = d.output_text ?? (d.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("");
    const result = JSON.parse(text);
    return json({ result, sources });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
