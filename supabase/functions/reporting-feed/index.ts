// Read-only reporting feed for BI tools (Tableau, SAP, Power BI, Sigma, QuickSight).
// Authenticated by a per-provider key created in Connected Sources; only the key's hash is stored.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Use GET" }, 405);
  const url = new URL(req.url);
  const key = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("key") || "";
  if (!/^smr_[0-9a-f]{48}$/.test(key)) return json({ error: "A valid reporting key is required" }, 401);
  const { data: conn } = await admin.from("reporting_connectors").select("id,enabled").eq("key_hash", await sha256(key)).maybeSingle();
  if (!conn || !conn.enabled) return json({ error: "Reporting key not recognised or turned off" }, 401);

  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 90) || 90, 1), 730);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [{ data: posts, error }, { data: clients }, { data: results }, { data: reviews }] = await Promise.all([
    admin.from("post_cards").select("id,post_number,client_id,platform,content_type,approval_status,publishing_status,campaign_pillar,scheduled_for,posted_at,posted_url,created_at")
      .gte("created_at", since).neq("approval_status", "archived").order("created_at", { ascending: false }).limit(5000),
    admin.from("clients").select("id,name"),
    admin.from("post_results").select("post_card_id,impressions,reactions,comments,shares,clicks,saves,recorded_at").gte("recorded_at", since).order("recorded_at", { ascending: false }),
    admin.from("preflight_reviews").select("post_card_id,motive_score,created_at").order("created_at", { ascending: false }).limit(10000),
  ]);
  if (error) return json({ error: error.message }, 500);
  const cname = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const latest = new Map<string, any>();
  for (const r of results ?? []) if (!latest.has(r.post_card_id)) latest.set(r.post_card_id, r);
  const score = new Map<string, number | null>();
  for (const r of reviews ?? []) if (!score.has(r.post_card_id)) score.set(r.post_card_id, r.motive_score);

  const rows = (posts ?? []).map((p) => {
    const r = latest.get(p.id) ?? {};
    return {
      post_id: p.post_number ? `SM-${String(p.post_number).padStart(4, "0")}` : null,
      client: cname.get(p.client_id) ?? null,
      platform: p.platform, content_type: p.content_type, campaign_pillar: p.campaign_pillar,
      approval_status: p.approval_status, publishing_status: p.publishing_status,
      scheduled_for: p.scheduled_for, posted_at: p.posted_at, posted_url: p.posted_url, created_at: p.created_at,
      motive_score: score.get(p.id) ?? null,
      impressions: r.impressions ?? null, reactions: r.reactions ?? null, comments: r.comments ?? null,
      shares: r.shares ?? null, clicks: r.clicks ?? null, saves: r.saves ?? null, results_recorded_at: r.recorded_at ?? null,
    };
  });
  await admin.from("reporting_connectors").update({ last_used_at: new Date().toISOString() }).eq("id", conn.id);

  if (url.searchParams.get("format") === "csv") {
    const cols = Object.keys(rows[0] ?? { post_id: "" });
    const body = [cols.join(","), ...rows.map((r: any) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
    return new Response(body, { headers: { ...corsHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="socialmotive-publishing.csv"' } });
  }
  // `value` envelope works for OData-style readers (Power BI, SAP) and plain JSON readers alike.
  return json({ generated_at: new Date().toISOString(), days, count: rows.length, value: rows });
});
