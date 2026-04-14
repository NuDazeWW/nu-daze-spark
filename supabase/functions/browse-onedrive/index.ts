import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_onedrive";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ONEDRIVE_API_KEY = Deno.env.get("MICROSOFT_ONEDRIVE_API_KEY");
    if (!ONEDRIVE_API_KEY) throw new Error("MICROSOFT_ONEDRIVE_API_KEY is not configured");

    // Auth check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, itemId, siteId, searchQuery } = await req.json();

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": ONEDRIVE_API_KEY,
      "Content-Type": "application/json",
    };

    let graphPath: string;

    switch (action) {
      case "list_root":
        graphPath = "/me/drive/root/children";
        break;
      case "list_folder":
        if (!itemId) throw new Error("itemId required for list_folder");
        graphPath = `/me/drive/items/${itemId}/children`;
        break;
      case "get_item":
        if (!itemId) throw new Error("itemId required for get_item");
        graphPath = `/me/drive/items/${itemId}`;
        break;
      case "download_content":
        if (!itemId) throw new Error("itemId required for download_content");
        graphPath = `/me/drive/items/${itemId}/content`;
        break;
      case "search":
        if (!searchQuery) throw new Error("searchQuery required for search");
        graphPath = `/me/drive/root/search(q='${encodeURIComponent(searchQuery)}')`;
        break;
      case "list_sharepoint_sites":
        graphPath = searchQuery
          ? `/sites?search=${encodeURIComponent(searchQuery)}`
          : `/sites?search=*`;
        break;
      case "list_site_drive":
        if (!siteId) throw new Error("siteId required for list_site_drive");
        graphPath = itemId
          ? `/sites/${siteId}/drive/items/${itemId}/children`
          : `/sites/${siteId}/drive/root/children`;
        break;
      case "list_site_drives":
        if (!siteId) throw new Error("siteId required for list_site_drives");
        graphPath = `/sites/${siteId}/drives`;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const url = `${GATEWAY_URL}${graphPath}`;
    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Graph API error [${response.status}]:`, errBody);
      return new Response(
        JSON.stringify({ error: `Microsoft Graph API error: ${response.status}`, details: errBody }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For download_content, return the redirected URL or content
    if (action === "download_content") {
      // The gateway may return a redirect or the content directly
      const contentType = response.headers.get("content-type") ?? "application/octet-stream";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Return text content for text-based files
      const text = await response.text();
      return new Response(JSON.stringify({ content: text, contentType }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("browse-onedrive error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
