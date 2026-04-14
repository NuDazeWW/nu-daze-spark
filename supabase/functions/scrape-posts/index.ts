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

    // Construct search query — bias toward actual social posts, not articles/blogs
    let searchQuery = customQuery;
    if (!searchQuery) {
      const topicParts = topics.length > 0 ? topics.slice(0, 3).join(" OR ") : "digital marketing AI branding";
      searchQuery = `site:linkedin.com/posts OR site:linkedin.com/feed ${topicParts} 2026`;
    } else {
      // Append social post site filters to custom queries too
      searchQuery = `${searchQuery} site:linkedin.com/posts OR site:linkedin.com/feed`;
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
NuDaze is a digital-first brand consultancy. We want to find SOCIAL MEDIA POSTS worth commenting on to build thought leadership.

Topics of interest: ${topics.join(", ") || "AI, digital marketing, branding, social media strategy"}
Brand categories: ${brandCategories.join(", ") || "general"}
Platform focus: ${platform}

ENGAGEMENT PRIORITY — CRITICAL:
- PRIORITIZE posts that show HIGH ENGAGEMENT: many comments, likes, reactions, reposts, or shares.
- Look for engagement signals in the scraped content: comment counts, like counts, reaction counts, "X comments", "X likes", viewer/impression numbers.
- Posts with active comment threads are MORE VALUABLE because NuDaze's comment will get more visibility.
- Boost relevance_score significantly for posts with high engagement (e.g. 50+ comments = major boost, 10+ = moderate boost).
- Include an estimated_engagement field with your best estimate of total engagement (likes + comments + shares) from what you can see, or 0 if unclear.

CRITICAL FILTERING RULES — STRICTLY EXCLUDE:
- Blog posts, articles, newsletters, or editorial content (e.g. medium.com articles, substack posts, news sites)
- Shopping pages, product listings, or e-commerce content
- Documentation, how-to guides, tutorials, or wiki pages
- Directory listings, tool comparison pages, or aggregator sites
- Any content that is NOT an actual social media post embedded on or from a social platform (LinkedIn, Instagram, X/Twitter, etc.)

ONLY include results that are:
- Actual social media posts (LinkedIn posts, Instagram posts, tweets, etc.)
- Posts from real people or brands discussing topics relevant to NuDaze
- Content where leaving a comment would be visible and valuable on a social platform

For each qualifying result, evaluate:
1. Relevance to NuDaze's positioning (0.0 to 1.0) — BOOSTED by engagement level
2. Risk assessment (safe / review_needed / blocked)
3. A recommended comment angle
4. A DRAFT COMMENT that NuDaze could post — 2-4 sentences, genuinely human, adds value, never generic or spammy

Return results SORTED by relevance_score descending (highest engagement + relevance first).
Return ONLY actual social media posts worth engaging with (relevance >= 0.5). If none qualify, return an empty array.`;

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
                        draft_comment: { type: "string", description: "A ready-to-post comment (2-4 sentences, human, insightful)" },
                        comment_tone: { type: "string", description: "Tone of the draft comment (e.g. supportive, insightful, curious)" },
                        estimated_engagement: { type: "number", description: "Estimated total engagement (likes+comments+shares) from visible signals, 0 if unknown" },
                      },
                      required: ["index", "topic", "relevance_score", "risk_flag", "recommended_comment_angle", "draft_comment"],
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

    // Build post+comment pairs
    const postsToInsert = [];
    const commentDrafts: { postIndex: number; draft_comment: string; comment_tone: string }[] = [];

    for (const eval_ of evaluations.posts || []) {
      const source = resultsForAI[eval_.index];
      if (!source) continue;
      if (existingUrls.has(source.url)) continue;

      const idx = postsToInsert.length;
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

      if (eval_.draft_comment) {
        commentDrafts.push({
          postIndex: idx,
          draft_comment: eval_.draft_comment,
          comment_tone: eval_.comment_tone || "insightful",
        });
      }
    }

    if (postsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "No new relevant social posts found (articles/blogs filtered out)." }),
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

    // Auto-create comment drafts for each discovered post
    let commentsCreated = 0;
    if (inserted && commentDrafts.length > 0) {
      const commentsToInsert = commentDrafts
        .filter((cd) => inserted[cd.postIndex])
        .map((cd) => ({
          external_post_id: inserted[cd.postIndex].id,
          draft_copy: cd.draft_comment,
          tone: cd.comment_tone,
          rationale: "Auto-generated during post discovery",
          approval_status: "draft" as const,
          created_by: user.id,
        }));

      if (commentsToInsert.length > 0) {
        const { data: createdComments, error: commentsError } = await supabaseAdmin
          .from("comments")
          .insert(commentsToInsert)
          .select();

        if (commentsError) {
          console.error("Error creating auto-comments:", commentsError.message);
        } else {
          commentsCreated = createdComments?.length || 0;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: inserted?.length || 0,
        comments_created: commentsCreated,
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
