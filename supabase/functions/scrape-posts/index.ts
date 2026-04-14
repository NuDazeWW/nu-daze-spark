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
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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

    // Get optional body params
    const body = await req.json().catch(() => ({}));
    const platform = body.platform || "linkedin"; // default to linkedin
    const customQuery = body.query || "";

    // Fetch engagement targets and brand context for search query construction
    const { data: engTargets } = await supabaseAdmin
      .from("engagement_targets")
      .select("platform, topic_category, min_relevance_threshold")
      .eq("is_active", true)
      .limit(10);

    const { data: voiceRules } = await supabaseAdmin
      .from("brand_voice_rules")
      .select("rule_name, category")
      .eq("is_active", true)
      .limit(5);

    // Build search queries from engagement targets
    const topics = engTargets
      ?.filter((t: any) => t.topic_category)
      .map((t: any) => t.topic_category) || [];

    const brandCategories = voiceRules
      ?.map((r: any) => r.category)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) || [];

    // Construct search query
    let searchQuery = customQuery;
    if (!searchQuery) {
      const topicParts = topics.length > 0 ? topics.slice(0, 3).join(" OR ") : "digital marketing AI branding";
      searchQuery = `${platform} ${topicParts} industry insights 2026`;
    }

    console.log("Searching Firecrawl with query:", searchQuery);

    // Search with Firecrawl
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!searchResponse.ok) {
      const errData = await searchResponse.json().catch(() => ({}));
      console.error("Firecrawl search error:", searchResponse.status, errData);
      return new Response(
        JSON.stringify({ error: `Search failed: ${errData.error || searchResponse.status}` }),
        { status: searchResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.data || [];

    if (searchResults.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "No results found for the search query." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing URLs to avoid duplicates
    const { data: existingPosts } = await supabaseAdmin
      .from("external_posts")
      .select("external_url");
    const existingUrls = new Set((existingPosts || []).map((p: any) => p.external_url));

    // Use AI to evaluate each result for relevance and risk
    const evaluationPrompt = `You are evaluating web search results for NuDaze's social media engagement strategy.
NuDaze is a digital-first brand consultancy. We want to find posts worth commenting on to build thought leadership.

Topics of interest: ${topics.join(", ") || "AI, digital marketing, branding, social media strategy"}
Brand categories: ${brandCategories.join(", ") || "general"}
Platform focus: ${platform}

For each search result, evaluate:
1. Is this a real social media post or article worth engaging with? (not a generic directory/tool page)
2. Relevance to NuDaze's positioning (0.0 to 1.0)
3. Risk assessment (safe / review_needed / blocked)
4. A recommended comment angle

Return ONLY results worth engaging with (relevance >= 0.5).`;

    const resultsForAI = searchResults.slice(0, 8).map((r: any, i: number) => ({
      index: i,
      url: r.url,
      title: r.title || "",
      description: r.description || "",
      content: (r.markdown || "").substring(0, 500),
    }));

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: evaluationPrompt },
          {
            role: "user",
            content: `Evaluate these search results:\n${JSON.stringify(resultsForAI, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_evaluations",
              description: "Submit evaluated posts worth engaging with",
              parameters: {
                type: "object",
                properties: {
                  posts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Index from the input array" },
                        author_name: { type: "string", description: "Extracted author name if available" },
                        topic: { type: "string", description: "Primary topic category" },
                        relevance_score: { type: "number", description: "0.0 to 1.0" },
                        risk_flag: { type: "string", enum: ["safe", "review_needed", "blocked"] },
                        risk_notes: { type: "string", description: "Risk context if review_needed" },
                        recommended_comment_angle: { type: "string", description: "How NuDaze should engage" },
                        post_summary: { type: "string", description: "Brief summary of the post content" },
                      },
                      required: ["index", "topic", "relevance_score", "risk_flag", "recommended_comment_angle"],
                    },
                  },
                },
                required: ["posts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_evaluations" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI evaluation error:", aiResponse.status);
      return new Response(
        JSON.stringify({ error: "AI evaluation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "AI found no relevant posts." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let evaluations;
    try {
      evaluations = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI evaluations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const postsToInsert = [];
    for (const eval_ of evaluations.posts || []) {
      const source = resultsForAI[eval_.index];
      if (!source) continue;
      if (existingUrls.has(source.url)) continue;

      postsToInsert.push({
        external_url: source.url,
        platform: platform as "linkedin" | "instagram",
        author_name: eval_.author_name || null,
        post_content: eval_.post_summary || source.description || source.content?.substring(0, 500) || null,
        topic: eval_.topic || null,
        relevance_score: eval_.relevance_score,
        risk_flag: eval_.risk_flag || "safe",
        risk_notes: eval_.risk_notes || null,
        recommended_comment_angle: eval_.recommended_comment_angle || null,
      });
    }

    if (postsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "No new relevant posts found (duplicates filtered)." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("external_posts")
      .insert(postsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save discovered posts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: inserted?.length || 0,
        posts: inserted,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-posts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
