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

    // Load retention settings
    const { data: settings, error: settingsErr } = await supabase
      .from("retention_settings")
      .select("*")
      .eq("is_active", true);

    if (settingsErr) throw settingsErr;

    const getRetentionDays = (tableName: string, fallback: number) => {
      const setting = settings?.find((s: any) => s.table_name === tableName);
      return setting?.retention_days ?? fallback;
    };

    const results: Record<string, number> = {};

    // Log this cleanup as a background job
    const { data: job } = await supabase
      .from("background_jobs")
      .insert({
        job_type: "cleanup",
        status: "running",
        started_at: new Date().toISOString(),
        metadata: { trigger: "weekly_retention" },
      })
      .select("id")
      .single();

    // 1. background_jobs: delete completed jobs older than retention (default 30 days)
    const bjDays = getRetentionDays("background_jobs", 30);
    const bjCutoff = new Date();
    bjCutoff.setDate(bjCutoff.getDate() - bjDays);
    const { data: deletedJobs } = await supabase
      .from("background_jobs")
      .delete()
      .eq("status", "completed")
      .lt("completed_at", bjCutoff.toISOString())
      .select("id");
    results.background_jobs_completed = deletedJobs?.length ?? 0;

    // Delete failed jobs older than 90 days
    const bjFailedDays = getRetentionDays("background_jobs_failed", 90);
    const bjFailedCutoff = new Date();
    bjFailedCutoff.setDate(bjFailedCutoff.getDate() - bjFailedDays);
    const { data: deletedFailedJobs } = await supabase
      .from("background_jobs")
      .delete()
      .eq("status", "failed")
      .lt("completed_at", bjFailedCutoff.toISOString())
      .select("id");
    results.background_jobs_failed = deletedFailedJobs?.length ?? 0;

    // 2. external_posts: delete blocked posts older than 30 days
    const epBlockedDays = getRetentionDays("external_posts_blocked", 30);
    const epBlockedCutoff = new Date();
    epBlockedCutoff.setDate(epBlockedCutoff.getDate() - epBlockedDays);
    const { data: deletedBlockedPosts } = await supabase
      .from("external_posts")
      .delete()
      .eq("risk_flag", "blocked")
      .lt("created_at", epBlockedCutoff.toISOString())
      .select("id");
    results.external_posts_blocked = deletedBlockedPosts?.length ?? 0;

    // Delete safe posts older than 90 days that have no approved comments
    const epSafeDays = getRetentionDays("external_posts_safe", 90);
    const epSafeCutoff = new Date();
    epSafeCutoff.setDate(epSafeCutoff.getDate() - epSafeDays);

    // Find safe posts older than cutoff
    const { data: oldSafePosts } = await supabase
      .from("external_posts")
      .select("id")
      .eq("risk_flag", "safe")
      .lt("created_at", epSafeCutoff.toISOString());

    if (oldSafePosts && oldSafePosts.length > 0) {
      const oldIds = oldSafePosts.map((p: any) => p.id);
      // Check which have approved comments
      const { data: postsWithApproved } = await supabase
        .from("comments")
        .select("external_post_id")
        .in("external_post_id", oldIds)
        .eq("approval_status", "approved");

      const protectedIds = new Set(
        (postsWithApproved ?? []).map((c: any) => c.external_post_id)
      );
      const toDelete = oldIds.filter((id: string) => !protectedIds.has(id));

      if (toDelete.length > 0) {
        // Delete comments first
        await supabase.from("comments").delete().in("external_post_id", toDelete);
        await supabase.from("external_posts").delete().in("id", toDelete);
      }
      results.external_posts_safe = toDelete.length;
    } else {
      results.external_posts_safe = 0;
    }

    // 3. asset_summaries: delete for archived assets older than 90 days
    const asDays = getRetentionDays("asset_summaries", 90);
    const asCutoff = new Date();
    asCutoff.setDate(asCutoff.getDate() - asDays);

    const { data: archivedAssets } = await supabase
      .from("source_assets")
      .select("id")
      .eq("permission_state", "archived")
      .lt("updated_at", asCutoff.toISOString());

    if (archivedAssets && archivedAssets.length > 0) {
      const archivedIds = archivedAssets.map((a: any) => a.id);
      const { data: deletedSummaries } = await supabase
        .from("asset_summaries")
        .delete()
        .in("asset_id", archivedIds)
        .select("id");
      results.asset_summaries = deletedSummaries?.length ?? 0;
    } else {
      results.asset_summaries = 0;
    }

    // Mark job complete
    if (job?.id) {
      const now = new Date();
      await supabase
        .from("background_jobs")
        .update({
          status: "completed",
          completed_at: now.toISOString(),
          metadata: { trigger: "weekly_retention", results },
        })
        .eq("id", job.id);
    }

    const summary = `Retention cleanup complete: ${JSON.stringify(results)}`;
    console.log(summary);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Retention cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
