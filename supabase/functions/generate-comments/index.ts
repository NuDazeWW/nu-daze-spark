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

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!anonKey) {
      return new Response(JSON.stringify({ error: "Anon key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { external_post_ids } = await req.json();
    if (!Array.isArray(external_post_ids) || external_post_ids.length === 0) {
      return new Response(JSON.stringify({ error: "external_post_ids is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch external posts
    const { data: posts, error: postsError } = await supabaseAdmin
      .from("external_posts")
      .select("*")
      .in("id", external_post_ids);

    if (postsError || !posts || posts.length === 0) {
      return new Response(JSON.stringify({ error: "External posts not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch brand voice rules for context
    const { data: voiceRules } = await supabaseAdmin
      .from("brand_voice_rules")
      .select("rule_name, rule_content")
      .eq("is_active", true)
      .limit(10);

    const brandContext = voiceRules && voiceRules.length > 0
      ? `\n\nBrand Voice Rules:\n${voiceRules.map((r: any) => `- ${r.rule_name}: ${r.rule_content}`).join("\n")}`
      : "";

    // Fetch engagement targets for context
    const { data: engTargets } = await supabaseAdmin
      .from("engagement_targets")
      .select("platform, daily_target, risk_tolerance, topic_category")
      .eq("is_active", true)
      .limit(5);

    const engContext = engTargets && engTargets.length > 0
      ? `\n\nEngagement Targets:\n${engTargets.map((t: any) => `- ${t.platform}: ${t.daily_target}/day, risk: ${t.risk_tolerance}${t.topic_category ? `, topic: ${t.topic_category}` : ""}`).join("\n")}`
      : "";

    // Text draft metering: one draft per eligible post, pre-checked before any AI call.
    const eligible = posts.filter((p: any) => p.risk_flag !== "blocked");
    const clientId = eligible[0]?.client_id ?? null;
    const { data: pre, error: preErr } = await anonClient.rpc("consume_usage", { _bucket: "text_drafts", _capability: "text_draft", _quantity: Math.max(eligible.length, 1), _client_id: clientId, _dry_run: true });
    if (preErr) {
      return new Response(JSON.stringify({ error: preErr.message }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!(pre as { ok: boolean }).ok) {
      return new Response(JSON.stringify({ error: "Not enough text drafts left this cycle", code: "CREDITS_BLOCKED", detail: pre }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = [];

    for (const post of posts) {
      // Skip blocked posts
      if (post.risk_flag === "blocked") continue;

      const prompt = `You are a social media engagement strategist for NuDaze. Generate a thoughtful, authentic comment for the following external post.

External Post Details:
- Author: ${post.author_name || "Unknown"}
- Platform: ${post.platform}
- Topic: ${post.topic || "General"}
- Content: ${post.post_content || "No content available"}
- Recommended angle: ${post.recommended_comment_angle || "Not specified"}
- Risk flag: ${post.risk_flag}
${post.risk_notes ? `- Risk notes: ${post.risk_notes}` : ""}${brandContext}${engContext}

Requirements:
- Sound genuinely human and informed, NEVER generic or spammy
- Add value to the conversation (insight, agreement with nuance, a related perspective)
- Subtly position NuDaze as knowledgeable without being self-promotional
- Keep it concise (2-4 sentences max)
- Match the platform's tone (LinkedIn = professional, Instagram = conversational)
- If risk_flag is "review_needed", be extra cautious and neutral`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a social media engagement specialist. Respond only with valid JSON via the tool call." },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_comment",
                description: "Create an engagement comment for an external post",
                parameters: {
                  type: "object",
                  properties: {
                    draft_copy: { type: "string", description: "The comment text" },
                    tone: { type: "string", description: "Tone of the comment (e.g. supportive, insightful, curious)" },
                    rationale: { type: "string", description: "Brief rationale for why this comment approach works" },
                  },
                  required: ["draft_copy", "tone", "rationale"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_comment" } },
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
        console.error("No tool call in AI response for post:", post.id);
        continue;
      }

      let commentData;
      try {
        commentData = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI response for post:", post.id);
        continue;
      }

      // Insert comment
      const { data: comment, error: cError } = await supabaseAdmin
        .from("comments")
        .insert({
          external_post_id: post.id,
          draft_copy: commentData.draft_copy,
          tone: commentData.tone || null,
          rationale: commentData.rationale || null,
          approval_status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (cError) {
        console.error("Error creating comment:", cError.message);
        continue;
      }

      results.push({
        external_post_id: post.id,
        comment_id: comment.id,
        author: post.author_name,
        tone: commentData.tone,
      });
    }

    return new Response(
      JSON.stringify({ success: true, results, count: results.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-comments error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
