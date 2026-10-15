import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MediaRef {
  asset_id: string;
  // array of https or data:image/... URLs the model can "see"
  images: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const asset_ids: string[] = Array.isArray(body.asset_ids) ? body.asset_ids.filter((x: unknown) => typeof x === "string").slice(0, 25) : [];
    const ALLOWED_PLATFORMS = ["instagram", "linkedin", "facebook", "x"];
    const platform: string = ALLOWED_PLATFORMS.includes(body.platform) ? body.platform : "instagram";
    const content_type: string = typeof body.content_type === "string" ? body.content_type.slice(0, 40) : "post";
    const analyze_visually: boolean = !!body.analyze_visually;
    const topic: string = typeof body.topic === "string" ? body.topic.trim().slice(0, 4000) : "";
    const variantCount = Math.min(5, Math.max(1, Number(body.count) || 1));
    const bodyClientId: string | null = typeof body.client_id === "string" ? body.client_id : null;
    const mediaRefs: MediaRef[] = Array.isArray(body.media) ? body.media : [];
    const mediaMap = new Map(mediaRefs.map((m) => [m.asset_id, m.images ?? []]));

    if (asset_ids.length === 0 && topic.length < 10) {
      return new Response(JSON.stringify({ error: "Pick at least one asset, or describe the idea (10+ characters) for a text-led post." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // deno-lint-ignore no-explicit-any
    let assets: any[] = [];
    if (asset_ids.length > 0) {
      // Read with caller's session so RLS applies
      const { data, error: assetsError } = await anonClient.from("source_assets").select("*").in("id", asset_ids);
      if (assetsError || !data || data.length === 0) {
        return new Response(JSON.stringify({ error: "Assets not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      assets = data;
    } else {
      // Text-led mode: one pseudo-source per requested variant, no media
      assets = Array.from({ length: variantCount }, (_, i) => ({
        id: null, client_id: bodyClientId, title: variantCount > 1 ? `Thought leadership (angle ${i + 1} of ${variantCount})` : "Thought leadership",
        description: topic, asset_type: "text idea", contributors: [], event_name: null,
      }));
    }

    // Load strategy context scoped to the asset's client
    const clientId = assets[0].client_id ?? bodyClientId ?? null;
    let hashtagBanks: { bank_name: string; category: string; hashtags: string[] }[] = [];
    let brandVoice: { rule_name: string; description: string | null }[] = [];
    let platformRules: { platform: string; rule_name: string; description: string | null }[] = [];

    if (clientId) {
      const [hb, bv, pr] = await Promise.all([
        supabaseAdmin.from("hashtag_banks").select("bank_name, category, hashtags").eq("is_active", true).eq("client_id", clientId),
        supabaseAdmin.from("brand_voice_rules").select("rule_name, description").eq("client_id", clientId),
        supabaseAdmin.from("platform_rules").select("platform, rule_name, description").eq("client_id", clientId).eq("platform", platform),
      ]);
      hashtagBanks = hb.data ?? [];
      brandVoice = bv.data ?? [];
      platformRules = pr.data ?? [];
    }

    const hashtagBankContext = hashtagBanks.length > 0
      ? `\n\nAvailable Hashtag Banks (prioritize these when relevant):\n${hashtagBanks.map((b) => `- ${b.bank_name} (${b.category}): ${b.hashtags.join(", ")}`).join("\n")}`
      : "";
    const brandVoiceContext = brandVoice.length > 0
      ? `\n\nBrand Voice Rules:\n${brandVoice.map((r) => `- ${r.rule_name}${r.description ? `: ${r.description}` : ""}`).join("\n")}`
      : "";
    const platformRulesContext = platformRules.length > 0
      ? `\n\n${platform} Platform Rules:\n${platformRules.map((r) => `- ${r.rule_name}${r.description ? `: ${r.description}` : ""}`).join("\n")}`
      : "";

    const results = [];

    for (const asset of assets) {
      const assetContributors: string[] = asset.contributors || [];
      const contributorsLine = assetContributors.length > 0
        ? `\nContributors/People: ${assetContributors.join(", ")}`
        : "";

      const visualImages = analyze_visually ? (mediaMap.get(asset.id) ?? []) : [];
      const visualNote = visualImages.length > 0
        ? `\n\nIMPORTANT: You have been given ${visualImages.length} image${visualImages.length !== 1 ? "s" : ""} showing the actual media${asset.asset_type === "video" ? " (sampled frames from the video)" : ""}. Base the draft copy on what is actually visible — describe scenes, subjects, mood, colors, setting, and any visible text. Do not invent details that are not present.`
        : "";

      const textLed = !asset.id;
      const limits: Record<string, string> = {
        instagram: "Max 2200 chars, use line breaks and emojis.",
        linkedin: "Max 3000 chars, professional tone, strategic hook.",
        facebook: "Aim for 80-250 words, conversational, community-aware.",
        x: "Max 280 chars INCLUDING hashtags, punchy, one idea.",
      };
      const textLedNote = textLed
        ? `\n\nThis is a TEXT-LED thought-leadership post: no image or video is attached. Make the words carry it — a specific insight, a clear point of view, and a concrete example. Use only facts stated in the idea above; do not invent statistics, clients, or quotes.${variantCount > 1 ? ` Take a distinctly different angle and opening hook from the other ${variantCount - 1} variants (this is ${asset.title}).` : ""}`
        : (topic ? `\n\nExtra direction from the user: ${topic}` : "");

      const prompt = `You are a social media strategist for NuDaze. Create a ${platform} ${content_type} post card for the following ${textLed ? "idea" : "asset"}.

Title: ${asset.title}
${textLed ? "Idea / key message" : "Description"}: ${asset.description || "No description provided"}
Type: ${asset.asset_type}${contributorsLine}${asset.event_name ? `\nEvent: ${asset.event_name}` : ""}${visualNote}${textLedNote}${brandVoiceContext}${platformRulesContext}

Generate a JSON response with exactly these fields:
- draft_copy: ${platform} ${content_type} caption (engaging, platform-appropriate, with hook in first line). ${limits[platform] ?? limits.linkedin}${assetContributors.length > 0 ? ` Naturally mention or tag the contributors: ${assetContributors.join(", ")}.` : ""}
- objective: Strategic objective (1 sentence)
- audience: Target audience segment (1-2 words)
- campaign_pillar: Relevant content pillar (1-2 words)
- hashtags: Array of ${platform === "instagram" ? "10-15" : "3-6"} relevant hashtags (without #). Prioritize hashtag bank entries when relevant.${hashtagBankContext}
- people_tags: Array of handles. MUST include contributors: ${assetContributors.length > 0 ? assetContributors.join(", ") : "use placeholders if none"}. Add 1-2 more if appropriate.
- org_tags: Array of 1-2 relevant organizations
- rationale: Brief rationale (1-2 sentences)${visualImages.length > 0 ? ", referencing what's visible in the media" : ""}
- suggested_asset_description: ${visualImages.length > 0 ? "Describe how the visible media should be treated/edited for this post" : "Describe the ideal visual treatment"} (1 sentence)`;

      const userContent: unknown[] = [{ type: "text", text: prompt }];
      for (const url of visualImages) {
        userContent.push({ type: "image_url", image_url: { url } });
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: "You are a social media strategist. Respond only via the provided function." },
            { role: "user", content: visualImages.length > 0 ? userContent : prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_post_card",
                description: "Create a post card with caption and metadata",
                parameters: {
                  type: "object",
                  properties: {
                    draft_copy: { type: "string" },
                    objective: { type: "string" },
                    audience: { type: "string" },
                    campaign_pillar: { type: "string" },
                    hashtags: { type: "array", items: { type: "string" } },
                    people_tags: { type: "array", items: { type: "string" } },
                    org_tags: { type: "array", items: { type: "string" } },
                    rationale: { type: "string" },
                    suggested_asset_description: { type: "string" },
                  },
                  required: ["draft_copy", "objective", "audience", "campaign_pillar", "hashtags", "rationale", "suggested_asset_description"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_post_card" } },
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI error:", status, await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error("No tool call in AI response for asset:", asset.id);
        continue;
      }

      let cardData;
      try {
        cardData = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI response for asset:", asset.id);
        continue;
      }

      const aiPeopleTags: string[] = cardData.people_tags || [];
      const mergedPeopleTags = [...new Set([...assetContributors, ...aiPeopleTags])];

      const { data: postCard, error: pcError } = await supabaseAdmin
        .from("post_cards")
        .insert({
          platform,
          content_type,
          client_id: asset.client_id,
          draft_copy: cardData.draft_copy,
          objective: cardData.objective || null,
          audience: cardData.audience || null,
          campaign_pillar: cardData.campaign_pillar || null,
          hashtags: (cardData.hashtags || []).map((h: string) => h.replace(/^#/, "")),
          people_tags: mergedPeopleTags,
          org_tags: cardData.org_tags || [],
          rationale: cardData.rationale || null,
          suggested_asset_description: cardData.suggested_asset_description || null,
          source_references: [asset.id],
          approval_status: "draft",
          created_by: user.id,
        } as never)
        .select()
        .single();

      if (pcError) {
        console.error("Error creating post card:", pcError.message);
        continue;
      }

      await supabaseAdmin.from("post_versions").insert({
        post_card_id: postCard.id,
        version_number: 1,
        draft_copy: cardData.draft_copy,
        hashtags: (cardData.hashtags || []).map((h: string) => h.replace(/^#/, "")),
        people_tags: mergedPeopleTags,
        org_tags: cardData.org_tags || [],
        edit_source: "ai",
        created_by: user.id,
      });

      results.push({
        asset_id: asset.id,
        post_card_id: postCard.id,
        title: asset.title,
        platform,
        content_type,
        draft_copy: cardData.draft_copy,
        objective: cardData.objective,
        audience: cardData.audience,
        campaign_pillar: cardData.campaign_pillar,
        hashtags: cardData.hashtags || [],
        people_tags: mergedPeopleTags,
        org_tags: cardData.org_tags || [],
        rationale: cardData.rationale,
        visually_analyzed: visualImages.length > 0,
      });
    }

    return new Response(
      JSON.stringify({ success: true, results, count: results.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-reels error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
