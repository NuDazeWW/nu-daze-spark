import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth check
    const authHeader = req.headers.get("Authorization")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { urls } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "urls array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (urls.length > 20) {
      return new Response(
        JSON.stringify({ error: "Maximum 20 URLs per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results: { url: string; success: boolean; asset_id?: string; error?: string }[] = [];

    for (const url of urls) {
      try {
        // Scrape via Firecrawl
        const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown", "summary"],
            onlyMainContent: true,
          }),
        });

        if (!scrapeRes.ok) {
          const errData = await scrapeRes.json().catch(() => ({}));
          results.push({ url, success: false, error: errData.error || `Scrape failed (${scrapeRes.status})` });
          continue;
        }

        const scrapeData = await scrapeRes.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
        const summary = scrapeData.data?.summary || scrapeData.summary || "";
        const title = metadata.title || new URL(url).hostname;

        // Create source_asset
        const { data: asset, error: insertErr } = await adminClient
          .from("source_assets")
          .insert({
            title: title.slice(0, 200),
            description: (metadata.description || summary || "").slice(0, 500),
            asset_type: "link",
            permission_state: "generation_allowed",
            external_url: url,
            text_content: markdown.slice(0, 50000),
            is_nudaze_origin: false,
            created_by: user.id,
            updated_by: user.id,
          })
          .select("id")
          .single();

        if (insertErr) {
          results.push({ url, success: false, error: insertErr.message });
          continue;
        }

        // Create summary if we have content
        if (summary || markdown) {
          const keyTopics = metadata.keywords
            ? (typeof metadata.keywords === "string" ? metadata.keywords.split(",").map((k: string) => k.trim()) : metadata.keywords)
            : [];

          await adminClient.from("asset_summaries").insert({
            asset_id: asset.id,
            summary: (summary || markdown.slice(0, 500)).slice(0, 2000),
            key_topics: keyTopics.slice(0, 10),
            content_type_detected: metadata.ogType || "article",
            is_nudaze_origin: false,
            created_by: user.id,
          });
        }

        results.push({ url, success: true, asset_id: asset.id });
      } catch (e) {
        results.push({ url, success: false, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return new Response(
      JSON.stringify({ success: true, results, imported: successCount, total: urls.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("import-webpage error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
