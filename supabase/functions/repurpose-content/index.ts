import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { chargeDrafts } from "../_shared/metering.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TYPES = ["repost_as_is", "cross_platform_rewrite", "excerpt_quote", "story_adaptation", "reel_adaptation", "linkedin_to_instagram", "instagram_to_linkedin"];
const PLATFORMS = ["linkedin", "instagram", "facebook"];
const CONTENT = ["post", "story", "reel", "carousel"];
const UUID = /^[0-9a-f-]{36}$/i;

const GUIDE = `Recipes:
- repost_as_is: same platform, refreshed hook/opening line and hashtags, same core message.
- cross_platform_rewrite / linkedin_to_instagram / instagram_to_linkedin: rewrite for the target platform's native style.
- excerpt_quote: pull 1-3 short, exact quotable lines from the source for quote graphics (quote text must appear in the source).
- story_adaptation: 2-3 frame storyboard (FRAME n — purpose / Visual / On-screen text / Sticker / Transition).
- reel_adaptation: Reel script with HOOK 0:00-0:03, timestamped beats (Visual, Spoken, On-screen text), END FRAME/CTA, FINAL CAPTION.
Platform style: LinkedIn professional B2B insight; Instagram visual-first, hook in first 125 chars; Facebook conversational, 0-3 hashtags.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI not configured" }, 500);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => ({}));
    const kind = body.source_kind;
    const id = String(body.source_id ?? "");
    if (!["post", "asset"].includes(kind) || !UUID.test(id)) return json({ error: "source_kind (post|asset) and source_id required" }, 400);

    let sourceText = "", clientId: string | null = null, sourcePlatform = "", label = "";
    if (kind === "post") {
      const { data: p } = await sb.from("post_cards").select("id,client_id,platform,content_type,draft_copy,hashtags,approval_status,post_number,is_sample").eq("id", id).maybeSingle();
      if (p?.is_sample) return json({ error: "Samples cannot consume AI drafts." }, 400);
      if (!p) return json({ error: "Post not found" }, 404);
      if (!["approved", "exported", "posted"].includes(p.approval_status)) return json({ error: "Only approved content can be repurposed." }, 400);
      clientId = p.client_id; sourcePlatform = p.platform;
      label = `${p.platform} ${p.content_type}`;
      sourceText = p.draft_copy;
    } else {
      const { data: a } = await sb.from("source_assets").select("id,client_id,title,description,text_content,permission_state,asset_type,deleted_at").eq("id", id).maybeSingle();
      if (!a || a.deleted_at) return json({ error: "Asset not found" }, 404);
      if (a.permission_state !== "generation_allowed") return json({ error: "This asset is not cleared for generation." }, 400);
      const { data: s } = await sb.from("asset_summaries").select("summary,key_topics").eq("asset_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      clientId = a.client_id; label = `${a.asset_type}: ${a.title}`;
      sourceText = [a.title, a.description, a.text_content?.slice(0, 6000), s?.summary].filter(Boolean).join("\n\n");
    }
    if (!sourceText.trim()) return json({ error: "Source has no text to repurpose." }, 400);

    const { data: client } = clientId ? await sb.from("clients").select("platforms").eq("id", clientId).maybeSingle() : { data: null };
    const allowed = (client?.platforms?.length ? client.platforms : PLATFORMS).filter((p: string) => PLATFORMS.includes(p));
    const { data: voice } = await sb.from("brand_voice_rules").select("rule_name,rule_content").eq("is_active", true).eq("client_id", clientId).limit(15);

    const prompt = `Source (${label}${sourcePlatform ? `, originally on ${sourcePlatform}` : ""}):
"""${sourceText}"""

Brand voice rules:
${(voice ?? []).map((v: any) => `- ${v.rule_name}: ${v.rule_content}`).join("\n") || "(none)"}

Allowed target platforms: ${allowed.join(", ")}.
${GUIDE}

Propose 3-5 distinct, high-value repurpose options. Each must use a different recipe or target. Use only facts in the source; never invent stats, names, or claims. Write the complete, ready-to-review draft for each.`;

    const blocked = await chargeDrafts(sb, "repurpose_content", clientId, cors);
    if (blocked) return blocked;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior social content strategist repurposing approved content. Never fabricate. Avoid generic AI phrasing." },
          { role: "user", content: prompt },
        ],
        tools: [{ type: "function", function: {
          name: "propose", description: "Repurpose options",
          parameters: { type: "object", additionalProperties: false, required: ["options"], properties: {
            options: { type: "array", items: { type: "object", additionalProperties: false,
              required: ["repurpose_type", "target_platform", "target_content_type", "rationale", "draft_copy", "hashtags", "source_excerpt"],
              properties: {
                repurpose_type: { type: "string", enum: TYPES },
                target_platform: { type: "string", enum: allowed },
                target_content_type: { type: "string", enum: CONTENT },
                rationale: { type: "string", description: "Why this reuse is worth it, one or two sentences" },
                draft_copy: { type: "string" },
                hashtags: { type: "array", items: { type: "string" } },
                source_excerpt: { type: "string", description: "Exact short excerpt from the source this draws on" },
              } } },
          } },
        } }],
        tool_choice: { type: "function", function: { name: "propose" } },
      }),
    });
    if (r.status === 429) return json({ error: "AI rate limit reached. Try again shortly." }, 429);
    if (r.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);
    if (!r.ok) return json({ error: `AI error ${r.status}` }, 500);
    const d = await r.json();
    const call = d.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "AI returned no result" }, 500);
    const options = (JSON.parse(call.function.arguments).options ?? [])
      .filter((o: any) => TYPES.includes(o.repurpose_type) && allowed.includes(o.target_platform) && CONTENT.includes(o.target_content_type) && o.draft_copy?.trim())
      .slice(0, 5);

    const rows = options.map((o: any) => ({
      client_id: clientId,
      source_post_card_id: kind === "post" ? id : null,
      source_asset_id: kind === "asset" ? id : null,
      repurpose_type: o.repurpose_type,
      target_platform: o.target_platform,
      target_content_type: o.target_content_type,
      rationale: o.rationale,
      draft_copy: o.draft_copy,
      hashtags: (o.hashtags ?? []).map((h: string) => h.replace(/^#/, "")).slice(0, 15),
      source_excerpt: o.source_excerpt?.slice(0, 500) ?? null,
      created_by: user.id,
    }));
    if (!rows.length) return json({ created: 0 });
    const { error } = await sb.from("repurpose_suggestions").insert(rows);
    if (error) return json({ error: error.message }, 403);
    return json({ created: rows.length });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});
