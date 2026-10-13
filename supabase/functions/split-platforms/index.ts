import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TARGETS: Record<string, { platform: string; content_type: string; guide: string }> = {
  linkedin_post: { platform: "linkedin", content_type: "post", guide: "LinkedIn post: professional B2B insight, strong first line, short paragraphs, under 1300 chars, 3-5 hashtags." },
  instagram_feed: { platform: "instagram", content_type: "post", guide: "Instagram feed caption: visual-first, hook in first 125 chars, scannable line breaks, 5-15 hashtags. Start with 'VISUAL:' one line describing the image, then the caption." },
  instagram_story: { platform: "instagram", content_type: "story", guide: "Instagram Story: 2-3 frame storyboard. Each frame: FRAME n — purpose / Visual / On-screen text / Spoken/voiceover / Sticker/interaction / Transition. End with STORY CAPTION and CTA/LINK." },
  instagram_reel: { platform: "instagram", content_type: "reel", guide: "Instagram Reel script: REEL CONCEPT, DURATION, 0:00-0:03 HOOK (Visual/shot, Spoken, On-screen text), timestamped beats, END FRAME/CTA, EDITING NOTES, FINAL CAPTION." },
  facebook_post: { platform: "facebook", content_type: "post", guide: "Facebook post: conversational, community-oriented, question to spark comments, 0-3 hashtags, under 1500 chars." },
  youtube_short: { platform: "youtube", content_type: "reel", guide: "YouTube Short (vertical, up to 60s): TITLE (under 70 chars), 0:00-0:03 HOOK, timestamped beats (Visual, Spoken, On-screen text), END FRAME/CTA (subscribe or watch next), DESCRIPTION (2-3 lines, searchable keywords)." },
  x_post: { platform: "x", content_type: "post", guide: "X post: under 270 characters total, punchy single idea, 0-2 hashtags, no thread." },
};

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
    const { data: can } = await sb.rpc("can_create_content", { _user_id: user.id });
    if (!can) return json({ error: "You don't have permission to create drafts." }, 403);

    const body = await req.json().catch(() => ({}));
    const id = String(body.post_card_id ?? "");
    const targets: string[] = (Array.isArray(body.targets) ? body.targets : []).filter((t: string) => TARGETS[t]).slice(0, 7);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !targets.length) return json({ error: "post_card_id and at least one target required" }, 400);

    const { data: p } = await sb.from("post_cards").select("id,client_id,platform,content_type,draft_copy,objective,audience,hashtags").eq("id", id).maybeSingle();
    if (!p) return json({ error: "Post not found" }, 404);
    if (!p.draft_copy?.trim()) return json({ error: "This post has no copy to adapt." }, 400);

    const { data: voice } = await sb.from("brand_voice_rules").select("rule_name,rule_content").eq("is_active", true).eq("client_id", p.client_id).limit(15);

    const prompt = `Original ${p.platform} ${p.content_type}:
"""${p.draft_copy}"""
${p.objective ? `Objective: ${p.objective}\n` : ""}${p.audience ? `Audience: ${p.audience}\n` : ""}
Brand voice rules:
${(voice ?? []).map((v: any) => `- ${v.rule_name}: ${v.rule_content}`).join("\n") || "(none)"}

Adapt this SAME core message for each target below, written natively for that platform. Keep the message and facts identical; change format, length, tone and structure. Never invent stats, names or claims. Return one variant per target, in order.
${targets.map((t) => `- ${t}: ${TARGETS[t].guide}`).join("\n")}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior social content strategist adapting one message across platforms. Never fabricate. Avoid generic AI phrasing." },
          { role: "user", content: prompt },
        ],
        tools: [{ type: "function", function: {
          name: "variants", description: "Platform variants",
          parameters: { type: "object", additionalProperties: false, required: ["variants"], properties: {
            variants: { type: "array", items: { type: "object", additionalProperties: false,
              required: ["target", "draft_copy", "hashtags", "why"],
              properties: {
                target: { type: "string", enum: targets },
                draft_copy: { type: "string" },
                hashtags: { type: "array", items: { type: "string" } },
                why: { type: "string", description: "One sentence: what was changed for this platform and why" },
              } } },
          } },
        } }],
        tool_choice: { type: "function", function: { name: "variants" } },
      }),
    });
    if (r.status === 429) return json({ error: "AI rate limit reached. Try again shortly." }, 429);
    if (r.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);
    if (!r.ok) return json({ error: `AI error ${r.status}` }, 500);
    const d = await r.json();
    const call = d.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "AI returned no result" }, 500);
    const variants = (JSON.parse(call.function.arguments).variants ?? [])
      .filter((v: any) => TARGETS[v.target] && v.draft_copy?.trim())
      .map((v: any) => ({
        target: v.target, platform: TARGETS[v.target].platform, content_type: TARGETS[v.target].content_type,
        draft_copy: v.draft_copy, why: v.why ?? "",
        hashtags: (v.hashtags ?? []).map((h: string) => h.replace(/^#/, "")).slice(0, 15),
      }));
    return json({ variants });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});
