import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// Proposes a rewritten draft addressing the latest preflight findings.
// Never saves: the user reviews old vs new and decides in the app.
const MODEL = "openai/gpt-6-astra";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.object({
  post_card_id: z.string().uuid(),
  focus_area: z.enum(["hook_strength", "strategic_fit", "voice_fit", "platform_fit", "originality"]).optional(),
  focus_hint: z.string().max(500).optional(),
});
const FOCUS_GUIDE: Record<string, string> = {
  hook_strength: "Rewrite ONLY the opening line(s) so the hook is specific, concrete and audience-relevant (a sharp insight, tension, or question). Keep the rest nearly identical.",
  strategic_fit: "Tie the post more clearly to the brief's core message, audience and CTA. End with the approved CTA if one exists.",
  voice_fit: "Adjust word choice and tone to match the BRAND VOICE rules closely. Remove generic or off-brand phrasing.",
  platform_fit: "Restructure for this platform: proper length, line breaks, pacing and format conventions. Keep the message.",
  originality: "Replace clichés, generic AI phrasing, and repeated hooks/CTAs with fresh, specific wording.",
};

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["draft_copy", "changes"],
  properties: {
    draft_copy: { type: "string" },
    changes: { type: "array", items: { type: "string" } },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI not configured" }, 500);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!user) return json({ error: "Invalid session" }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "post_card_id is required" }, 400);

    const { data: card } = await sb.from("post_cards").select("*").eq("id", parsed.data.post_card_id).maybeSingle();
    if (!card) return json({ error: "Post not found" }, 404);
    const { data: review } = await sb.from("preflight_reviews").select("findings")
      .eq("post_card_id", card.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const findings = ((review?.findings ?? []) as any[]).filter((f) => !["media", "weak_source"].includes(f.check));
    const focus = parsed.data.focus_area;
    if (!findings.length && !focus) return json({ error: "Nothing the AI can fix in the text. Run preflight first." }, 400);

    const scope = (q: any) => (card.client_id ? q.eq("client_id", card.client_id) : q);
    const [voiceRes, platformRes, briefRes, assetsRes] = await Promise.all([
      scope(sb.from("brand_voice_rules").select("rule_name, rule_content").eq("is_active", true)),
      scope(sb.from("platform_rules").select("rule_name, rule_content").eq("is_active", true).eq("platform", card.platform)),
      card.brief_id ? sb.from("campaign_briefs").select("core_message, proof_points, primary_cta").eq("id", card.brief_id).maybeSingle() : Promise.resolve({ data: null }),
      (card.source_references ?? []).length
        ? sb.from("source_assets").select("title, text_content, description, permission_state").in("id", card.source_references)
        : Promise.resolve({ data: [] }),
    ]);
    const b: any = briefRes.data;
    const sources = [
      b ? `Brief: ${b.core_message ?? ""}; proof: ${(b.proof_points ?? []).join(" | ")}; CTA: ${b.primary_cta ?? ""}` : null,
      ...((assetsRes.data ?? []) as any[]).filter((a) => a.permission_state !== "blocked")
        .map((a) => `Asset "${a.title}": ${(a.text_content ?? a.description ?? "").slice(0, 1500)}`),
    ].filter(Boolean).join("\n");

    const prompt = `Rewrite this ${card.platform} ${card.content_type} draft so it resolves the reviewer findings.
Rules: keep the same intent, structure type, and language. Use ONLY facts in SOURCES; if a claim is unsupported, remove or soften it — never invent facts, names, numbers, or roles. Remove any internal notes or instructions from the copy. Output final publishable copy only (no placeholders, no brackets). Do not include hashtags.
BRAND VOICE:
${(voiceRes.data ?? []).map((r: any) => `- ${r.rule_name}: ${r.rule_content}`).join("\n") || "(none)"}
PLATFORM RULES:
${(platformRes.data ?? []).map((r: any) => `- ${r.rule_name}: ${r.rule_content}`).join("\n") || "(none)"}
SOURCES:
${sources || "(none linked)"}
FINDINGS:
${findings.map((f) => `- [${f.check}] ${f.message}${f.excerpt ? ` | excerpt: "${f.excerpt}"` : ""}${f.suggestion ? ` | suggestion: ${f.suggestion}` : ""}`).join("\n")}
DRAFT:
${card.draft_copy}
Return the rewritten draft and a short list of what you changed.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, store: false, reasoning: { effort: "low" },
        input: [{ role: "user", content: prompt }],
        text: { format: { type: "json_schema", name: "rewrite", strict: true, schema: SCHEMA } },
      }),
    });
    if (!r.ok) {
      let msg = `AI rewrite failed (${r.status})`;
      try { const e = await r.json(); msg = e?.error?.message ?? msg; } catch { /* ignore */ }
      return json({ error: msg }, r.status === 402 || r.status === 429 ? r.status : 500);
    }
    const data = await r.json();
    const text = data.output_text ?? (data.output ?? []).flatMap((o: any) => o.content ?? [])
      .filter((c: any) => c.type === "output_text").map((c: any) => c.text).join("");
    const out = JSON.parse(text);
    if (!out.draft_copy?.trim()) return json({ error: "AI returned an empty draft" }, 500);
    return json({ draft_copy: out.draft_copy.trim(), changes: out.changes ?? [] });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
