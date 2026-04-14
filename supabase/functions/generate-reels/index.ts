import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Validate user
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

    const { asset_ids } = await req.json();
    if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
      return new Response(JSON.stringify({ error: "asset_ids is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the uploaded assets
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from("source_assets")
      .select("*")
      .in("id", asset_ids);

    if (assetsError || !assets || assets.length === 0) {
      return new Response(JSON.stringify({ error: "Assets not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate reel content for each asset using AI
    const results = [];

    for (const asset of assets) {
      const assetContributors: string[] = asset.contributors || [];
      const contributorsLine = assetContributors.length > 0
        ? `\nContributors/People: ${assetContributors.join(", ")}`
        : "";

      const prompt = `You are a social media strategist for NuDaze, a premium content operations agency. Create an Instagram Reel post card for the following asset:

Title: ${asset.title}
Description: ${asset.description || "No description provided"}
Type: ${asset.asset_type}${contributorsLine}${asset.event_name ? `\nEvent: ${asset.event_name}` : ""}

Generate a JSON response with exactly these fields:
- draft_copy: Instagram Reel caption (engaging, with line breaks, emojis, and a hook in the first line). Max 2200 chars.${assetContributors.length > 0 ? ` Naturally mention or tag the contributors: ${assetContributors.join(", ")}.` : ""}
- objective: The strategic objective of this reel (1 sentence)
- audience: Target audience segment (1-2 words)
- campaign_pillar: Relevant content pillar (1-2 words)
- hashtags: Array of 10-15 relevant hashtags (without the # symbol)
- people_tags: Array of people/accounts to tag. MUST include these contributors: ${assetContributors.length > 0 ? assetContributors.join(", ") : "use placeholder handles"}. Add 1-2 more relevant handles if appropriate.
- org_tags: Array of 1-2 relevant organizations to tag
- rationale: Brief rationale for why this reel works (1-2 sentences)
- suggested_asset_description: Description of the ideal visual treatment for this reel (1 sentence)`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a social media strategist. Respond only with valid JSON, no markdown fences." },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_reel_card",
                description: "Create a reel post card with caption and metadata",
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
          tool_choice: { type: "function", function: { name: "create_reel_card" } },
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
        // Skip this asset but continue
        continue;
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error("No tool call in AI response for asset:", asset.id);
        continue;
      }

      let reelData;
      try {
        reelData = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI response for asset:", asset.id);
        continue;
      }

      // Merge asset contributors into people_tags (ensure they're always included)
      const aiPeopleTags: string[] = reelData.people_tags || [];
      const mergedPeopleTags = [...new Set([...assetContributors, ...aiPeopleTags])];

      // Create the post card
      const { data: postCard, error: pcError } = await supabaseAdmin
        .from("post_cards")
        .insert({
          platform: "instagram",
          content_type: "reel",
          draft_copy: reelData.draft_copy,
          objective: reelData.objective || null,
          audience: reelData.audience || null,
          campaign_pillar: reelData.campaign_pillar || null,
          hashtags: (reelData.hashtags || []).map((h: string) => h.replace(/^#/, "")),
          people_tags: mergedPeopleTags,
          org_tags: reelData.org_tags || [],
          rationale: reelData.rationale || null,
          suggested_asset_description: reelData.suggested_asset_description || null,
          source_references: [asset.id],
          approval_status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (pcError) {
        console.error("Error creating post card:", pcError.message);
        continue;
      }

      // Create initial version
      await supabaseAdmin.from("post_versions").insert({
        post_card_id: postCard.id,
        version_number: 1,
        draft_copy: reelData.draft_copy,
        hashtags: (reelData.hashtags || []).map((h: string) => h.replace(/^#/, "")),
        people_tags: reelData.people_tags || [],
        org_tags: reelData.org_tags || [],
        edit_source: "ai",
        created_by: user.id,
      });

      results.push({
        asset_id: asset.id,
        post_card_id: postCard.id,
        title: asset.title,
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
