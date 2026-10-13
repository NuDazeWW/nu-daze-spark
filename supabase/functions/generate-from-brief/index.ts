import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const CHANNELS: Record<string, { platform: string; content_type: string; guide: string }> = {
  linkedin_post: { platform: "linkedin", content_type: "post", guide: "LinkedIn post: professional, strategic, B2B insight, strong first line, short paragraphs, under 1300 chars." },
  instagram_feed: { platform: "instagram", content_type: "post", guide: "Instagram feed caption: visual-first, socially native, hook in first 125 chars, scannable line breaks." },
  facebook_post: { platform: "facebook", content_type: "post", guide: "Facebook post: conversational and community-oriented, clear hook in the first line, short paragraphs, question or prompt to spark comments, minimal hashtags (0-3), under 1500 chars." },
  instagram_story: {
    platform: "instagram",
    content_type: "story",
    guide: `Instagram Story: return a complete, production-ready 2-3 frame storyboard inside draft_copy, never a caption alone. Use this exact structure for every frame:
FRAME [number] — [purpose]
Visual: [specific scene, asset treatment, composition, or motion]
On-screen text: [final concise words to display]
Spoken/voiceover: [final script, or "None"]
Sticker/interaction: [specific sticker and prompt, or "None"]
Transition: [how the frame moves to the next, or "End"]
After the frames add:
STORY CAPTION: [final optional supporting caption]
CTA/LINK: [final action and link-sticker wording].
Keep on-screen text brief and include at least one purposeful interaction across the sequence.`,
  },
  instagram_reel: {
    platform: "instagram",
    content_type: "reel",
    guide: `Instagram Reel: return a complete, production-ready Reel outline and script inside draft_copy, never a caption alone. Use this exact structure:
REEL CONCEPT: [one sentence]
DURATION: [recommended total seconds]
0:00-0:03 HOOK
Visual/shot: [specific footage, framing, and action]
Spoken/voiceover: [final word-for-word script]
On-screen text: [final words to display]
Then add enough timestamped beats to cover the full Reel. Every beat must include Visual/shot, Spoken/voiceover, and On-screen text.
END FRAME/CTA: [specific final visual, final spoken line, on-screen CTA]
EDITING NOTES: [pace, cuts, transitions, music/audio direction, captions]
FINAL CAPTION: [platform-ready caption]
Do not use placeholders, omit timing, or summarize the script.`,
  },
};

async function callAI(key: string, prompt: string, tool: any) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a senior social content strategist. Never fabricate facts, statistics, or claims beyond what the brief provides. Avoid generic AI phrasing." },
        { role: "user", content: prompt },
      ],
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: tool.name } },
    }),
  });
  if (r.status === 429) throw { status: 429, message: "AI rate limit reached. Try again shortly." };
  if (r.status === 402) throw { status: 402, message: "AI credits exhausted. Please add funds." };
  if (!r.ok) throw { status: 500, message: `AI error ${r.status}` };
  const d = await r.json();
  const call = d.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw { status: 500, message: "AI returned no result" };
  return JSON.parse(call.function.arguments);
}

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

    const { brief_id, mode, voice_profile_id } = await req.json();
    const { data: brief } = await sb.from("campaign_briefs").select("*").eq("id", brief_id).maybeSingle();
    if (!brief) return json({ error: "Brief not found" }, 404);

    const briefText = `Title: ${brief.title}
Campaign type: ${brief.campaign_type}
Objective: ${brief.objective ?? "(missing)"}
Target audience: ${brief.target_audience ?? "(missing)"}
Core message: ${brief.core_message ?? "(missing)"}
Proof points: ${(brief.proof_points ?? []).join(" | ") || "(none)"}
Primary CTA: ${brief.primary_cta ?? "(missing)"}
Destination URL: ${brief.destination_url ?? "(none)"}
Success metric: ${brief.success_metric ?? "(missing)"}
Timing: ${brief.timing_window ?? "(none)"}
Constraints: ${brief.constraints ?? "(none)"}`;

    if (mode === "review") {
      const res = await callAI(key, `Review this campaign brief for completeness before content generation. Identify missing information, contradictory inputs, and vague/low-specificity statements. Ask concrete questions.\n\n${briefText}`, {
        name: "review_brief",
        description: "Brief quality review",
        parameters: {
          type: "object",
          properties: {
            score: { type: "number", description: "0-100 readiness" },
            questions: { type: "array", items: { type: "string" } },
            issues: { type: "array", items: { type: "string" } },
          },
          required: ["score", "questions", "issues"],
          additionalProperties: false,
        },
      });
      return json(res);
    }

    if (brief.status !== "approved") return json({ error: "Brief must be approved before generating." }, 400);

    const [{ data: voice }, { data: rules }, { data: execVoice }] = await Promise.all([
      sb.from("brand_voice_rules").select("rule_name, rule_content").eq("is_active", true).eq("client_id", brief.client_id).limit(15),
      sb.from("platform_rules").select("platform, rule_name, rule_content").eq("is_active", true).eq("client_id", brief.client_id).limit(20),
      voice_profile_id
        ? sb.from("voice_profiles").select("*").eq("id", voice_profile_id).eq("is_active", true).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const channels = (brief.target_channels ?? []).filter((c: string) => CHANNELS[c]);
    if (!channels.length) return json({ error: "No target channels selected" }, 400);

    const res = await callAI(key, `Create ONE platform-neutral master content object from this approved brief, then adapt it into a platform-native variant for each channel. Each variant must preserve the same approved message but reflect genuinely different platform behavior (not resized text). Only use proof points supplied in the brief. Treat each channel guide as a required output contract. For Stories and Reels, draft_copy must contain the complete production outline and final word-for-word script in the requested structure; a caption by itself is invalid.

BRIEF
${briefText}

BRAND VOICE
${(voice ?? []).map((v: any) => `- ${v.rule_name}: ${v.rule_content}`).join("\n") || "(none)"}

PLATFORM RULES
${(rules ?? []).map((r: any) => `- [${r.platform}] ${r.rule_name}: ${r.rule_content}`).join("\n") || "(none)"}
${execVoice ? `
WRITE AS (executive voice — every variant must sound like this person, first person):
${execVoice.name}${execVoice.role_title ? `, ${execVoice.role_title}` : ""}
Voice traits: ${(execVoice.voice_traits ?? []).join("; ") || "(none)"}
Signature topics: ${(execVoice.topics ?? []).join("; ") || "(none)"}
Point of view: ${execVoice.pov_statement ?? "(none)"}
Never use these phrases/styles: ${(execVoice.banned_phrases ?? []).join("; ") || "(none)"}` : ""}

CHANNELS
${channels.map((c: string) => `- ${c}: ${CHANNELS[c].guide}`).join("\n")}`, {
      name: "create_content_set",
      description: "Master content object with platform variants",
      parameters: {
        type: "object",
        properties: {
          master: {
            type: "object",
            properties: {
              title: { type: "string" },
              core_message: { type: "string" },
              cta: { type: "string" },
              rationale: { type: "string" },
            },
            required: ["title", "core_message", "cta", "rationale"],
            additionalProperties: false,
          },
          variants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                channel: { type: "string", enum: channels },
                draft_copy: { type: "string", description: "Complete channel-native deliverable. For Stories and Reels this must include the full production outline, all on-screen text, and final spoken/voiceover script—not only a caption." },
                hashtags: { type: "array", items: { type: "string" } },
                suggested_asset_description: { type: "string" },
                rationale: { type: "string", description: "Which brief fields drove this output and why" },
              },
              required: ["channel", "draft_copy", "hashtags", "suggested_asset_description", "rationale"],
              additionalProperties: false,
            },
          },
        },
        required: ["master", "variants"],
        additionalProperties: false,
      },
    });

    const { data: mco, error: mErr } = await sb.from("master_content_objects").insert({
      client_id: brief.client_id,
      brief_id: brief.id,
      brief_version: brief.version,
      title: res.master.title,
      core_message: res.master.core_message,
      proof_points: brief.proof_points ?? [],
      cta: res.master.cta,
      destination_url: brief.destination_url,
      rationale: res.master.rationale,
      owner_id: user.id,
      created_by: user.id,
    }).select().single();
    if (mErr) return json({ error: mErr.message }, 500);

    const rows = res.variants.filter((v: any) => CHANNELS[v.channel]).map((v: any) => ({
      client_id: brief.client_id,
      brief_id: brief.id,
      master_content_id: mco.id,
      platform: CHANNELS[v.channel].platform,
      content_type: CHANNELS[v.channel].content_type,
      objective: brief.objective,
      audience: brief.target_audience,
      campaign_pillar: brief.title,
      draft_copy: v.draft_copy,
      hashtags: v.hashtags,
      suggested_asset_description: v.suggested_asset_description,
      rationale: `Source: brief "${brief.title}" v${brief.version}. ${v.rationale}`,
      approval_status: "draft",
      created_by: user.id,
      import_source: "brief",
      voice_profile_id: execVoice?.id ?? null,
    }));
    const { error: pErr } = await sb.from("post_cards").insert(rows);
    if (pErr) {
      await sb.from("master_content_objects").delete().eq("id", mco.id);
      return json({ error: pErr.message }, 500);
    }

    return json({ master_content_id: mco.id, variants: rows.length });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message ?? "Unexpected error" }, e?.status ?? 500);
  }
});
