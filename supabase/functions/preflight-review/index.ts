import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { chargeDrafts } from "../_shared/metering.ts";
import {
  draftChecksum, overallStatus, runRuleChecks, splitPhrases,
  type PreflightFinding,
} from "../_shared/preflightRules.ts";
import { activeGuardrails } from "../_shared/guardrails.ts";
import { motiveScore } from "../_shared/motiveScore.ts";

const MODEL = "openai/gpt-6-astra";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ post_card_id: z.string().uuid() });

const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["voice_score", "findings"],
  properties: {
    voice_score: { type: "integer", description: "0-100 brand voice and platform fit" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["check", "severity", "message", "excerpt", "suggestion"],
        properties: {
          check: { type: "string", enum: ["voice_fit", "generic_phrasing", "unsupported_claim", "format_completeness"] },
          severity: { type: "string", enum: ["blocking", "advisory"] },
          message: { type: "string" },
          excerpt: { type: ["string", "null"] },
          suggestion: { type: ["string", "null"] },
        },
      },
    },
  },
};

class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function aiReview(key: string, prompt: string) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "You are a strict pre-approval reviewer for a brand's social content. Judge only against the supplied brand voice, platform rules, and sources. Never invent problems. Flag a claim as unsupported only when it states a fact, number, or result not present in the sources. Mark unsupported claims as blocking; everything else advisory. Quote the exact excerpt from the draft.",
      input: [{ role: "user", content: prompt }],
      text: { format: { type: "json_schema", name: "preflight", strict: true, schema: AI_SCHEMA } },
    }),
  });
  if (!r.ok || !r.body) {
    let msg = `AI review failed (${r.status})`;
    try { const e = await r.json(); msg = e?.error?.message ?? e?.message ?? msg; } catch { /* ignore */ }
    throw new GatewayError(r.status, msg);
  }
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "", text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        if (ev.type === "response.failed" || ev.type === "error") throw new GatewayError(500, ev.error?.message ?? "AI review failed");
      } catch (e) { if (e instanceof GatewayError) throw e; }
    }
  }
  if (!text.trim()) throw new GatewayError(200, "AI returned no review");
  const parsed = JSON.parse(text);
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.voice_score) || 0)));
  const findings: PreflightFinding[] = (parsed.findings ?? []).slice(0, 12).map((f: any) => ({
    check: String(f.check), severity: f.severity === "blocking" ? "blocking" : "advisory",
    message: String(f.message), excerpt: f.excerpt ?? null, suggestion: f.suggestion ?? null, source: "ai",
  }));
  return { score, findings };
}

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
    const cid = card.client_id;
    const blocked = await chargeDrafts(sb, "preflight_review", cid, corsHeaders);
    if (blocked) return blocked;
    const scope = <T>(q: T) => (cid ? (q as any).eq("client_id", cid) : q) as T;

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [voiceRes, platformRes, recentRes, brief, mediaRes, guardRes] = await Promise.all([
      scope(sb.from("brand_voice_rules").select("rule_name, rule_content, category").eq("is_active", true)),
      scope(sb.from("platform_rules").select("rule_name, rule_content").eq("is_active", true).eq("platform", card.platform)),
      scope(sb.from("post_cards").select("id, draft_copy, hashtags").neq("id", card.id).gte("created_at", since).neq("approval_status", "archived").limit(200)),
      card.brief_id ? sb.from("campaign_briefs").select("*").eq("id", card.brief_id).maybeSingle() : Promise.resolve({ data: null }),
      (card.source_references ?? []).length
        ? sb.from("source_assets").select("id, title, asset_type, permission_state, deleted_at, expires_at, text_content, description").in("id", card.source_references)
        : Promise.resolve({ data: [] as any[] }),
      cid ? sb.from("guardrail_settings").select("*").eq("client_id", cid).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const voice = voiceRes.data ?? [];
    const isBanned = (r: any) => /banned|avoid|forbidden|never/i.test(`${r.category} ${r.rule_name}`);
    const isRequired = (r: any) => /required|must include|mandatory/i.test(`${r.category} ${r.rule_name}`);
    const bannedPhrases = voice.filter(isBanned).flatMap((r) => splitPhrases(r.rule_content));
    const requiredLanguage = voice.filter(isRequired).flatMap((r) => splitPhrases(r.rule_content));
    const assets = (mediaRes.data ?? []) as any[];
    const now = Date.now();
    const clearedMediaCount = assets.filter((a) =>
      (a.asset_type === "image" || a.asset_type === "video") && a.permission_state === "generation_allowed" &&
      !a.deleted_at && (!a.expires_at || new Date(a.expires_at).getTime() > now)).length;

    const ruleFindings = runRuleChecks(card, {
      bannedPhrases, requiredLanguage, recentPosts: recentRes.data ?? [], clearedMediaCount,
      guardrails: activeGuardrails(guardRes.data as any),
    });

    const b: any = brief.data;
    const sources = [
      b ? `Campaign brief v${b.version}: core message: ${b.core_message ?? "-"}; proof points: ${(b.proof_points ?? []).join(" | ") || "-"}; CTA: ${b.primary_cta ?? "-"}; constraints: ${b.constraints ?? "-"}` : null,
      ...assets.filter((a) => a.permission_state !== "blocked").map((a) => `Asset "${a.title}": ${(a.text_content ?? a.description ?? "").slice(0, 1500)}`),
      card.rationale ? `Rationale: ${card.rationale}` : null,
    ].filter(Boolean).join("\n");

    const prompt = `PLATFORM: ${card.platform} ${card.content_type}
BRAND VOICE RULES:
${voice.filter((r) => !isBanned(r) && !isRequired(r)).map((r) => `- ${r.rule_name}: ${r.rule_content}`).join("\n") || "(none provided)"}
PLATFORM RULES:
${(platformRes.data ?? []).map((r) => `- ${r.rule_name}: ${r.rule_content}`).join("\n") || "(none provided)"}
SOURCES (the only facts the draft may rely on):
${sources || "(no sources linked)"}

Check: voice_fit (drift from brand voice/platform tone), generic_phrasing (clichés, vague AI-sounding lines), unsupported_claim (facts not in sources), format_completeness (${card.content_type === "story" ? "Story must contain a full 2-3 frame storyboard" : card.content_type === "reel" ? "Reel must contain a timed shot-by-shot script and final caption" : "post should have a clear hook and CTA"}).
Return an empty findings list if the draft is clean.

DRAFT:
${card.draft_copy}
HASHTAGS: ${(card.hashtags ?? []).join(" ") || "(none)"}`;

    let voiceScore: number | null = null;
    let aiFindings: PreflightFinding[] = [];
    let aiError: string | null = null;
    try {
      const ai = await aiReview(key, prompt);
      voiceScore = ai.score;
      aiFindings = ai.findings;
    } catch (e) {
      const ge = e instanceof GatewayError ? e : new GatewayError(500, String((e as Error).message ?? e));
      if (ge.status === 402 || ge.status === 403 || ge.status === 429) return json({ error: ge.message }, ge.status);
      aiError = ge.message;
    }

    const findings = [...ruleFindings, ...aiFindings];
    const motive = motiveScore({
      draft_copy: card.draft_copy,
      hashtags: card.hashtags,
      platform: card.platform,
      content_type: card.content_type,
      objective: card.objective,
      audience: card.audience,
      campaign_pillar: card.campaign_pillar,
      recentPosts: (recentRes.data ?? []) as any[],
    }, voiceScore);
    const { data: review, error } = await sb.from("preflight_reviews").insert({
      post_card_id: card.id,
      client_id: cid,
      draft_checksum: draftChecksum(card),
      overall_status: overallStatus(findings),
      voice_score: voiceScore,
      findings,
      ai_error: aiError,
      model: MODEL,
      motive_score: motive.total,
      motive_breakdown: motive,
      run_by: user.id,
    }).select().single();
    if (error) return json({ error: error.message }, 500);
    return json({ review });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
