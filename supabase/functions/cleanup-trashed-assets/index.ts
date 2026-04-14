import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find trashed assets older than 30 days
    const { data: expiredAssets, error: fetchError } = await supabase
      .from("source_assets")
      .select("id, file_path, title")
      .not("deleted_at", "is", null)
      .lt("deleted_at", thirtyDaysAgo.toISOString());

    if (fetchError) throw fetchError;

    if (!expiredAssets || expiredAssets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trashed assets to clean up", deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete storage files for assets that have them
    const filePaths = expiredAssets
      .map((a) => a.file_path)
      .filter(Boolean) as string[];

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("source-assets")
        .remove(filePaths);
      if (storageError) {
        console.error("Storage cleanup error:", storageError);
      }
    }

    // Delete associated summaries
    const ids = expiredAssets.map((a) => a.id);
    await supabase.from("asset_summaries").delete().in("asset_id", ids);

    // Permanently delete the assets
    const { error: deleteError } = await supabase
      .from("source_assets")
      .delete()
      .in("id", ids);

    if (deleteError) throw deleteError;

    const result = {
      message: `Permanently deleted ${ids.length} trashed asset(s) older than 30 days`,
      deleted: ids.length,
      titles: expiredAssets.map((a) => a.title),
    };

    console.log(result.message);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
