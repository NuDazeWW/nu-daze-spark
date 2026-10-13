import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;
const GW = "https://ai.gateway.lovable.dev/v1/videos";

const gwError = async (res: Response) => {
  const t = await res.text();
  console.error("video gw", res.status, t);
  if (res.status === 429) return "Video generation is busy — wait for the current clip, then try again.";
  if (res.status === 402) return "AI credits are used up for this workspace.";
  try { return JSON.parse(t)?.error?.message ?? "Video generation failed"; } catch { return "Video generation failed"; }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI not configured" }, 500);
    const url = Deno.env.get("SUPABASE_URL")!;
    const sb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Invalid session" }, 401);
    const { data: canCreate } = await sb.rpc("can_create_content", { _user_id: user.id });
    if (!canCreate) return json({ error: "Only owners, admins and editors can generate media." }, 403);

    const body = await req.json().catch(() => ({}));
    const clientId = String(body.client_id ?? "");
    if (!UUID.test(clientId)) return json({ error: "Pick a client" }, 400);
    const { data: ok } = await sb.rpc("user_can_access_client", { _user_id: user.id, _client_id: clientId });
    if (!ok) return json({ error: "No access to this client" }, 403);

    if (body.action === "status") {
      const id = String(body.video_id ?? "");
      if (!/^[\w-]{4,200}$/.test(id)) return json({ error: "Bad video id" }, 400);
      const r = await fetch(`${GW}/${id}`, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) return json({ error: await gwError(r) }, r.status);
      const job = await r.json();
      if (job.status === "failed") return json({ status: "failed", error: job.error?.message ?? "Video generation failed" });
      if (job.status !== "completed") return json({ status: job.status, progress: job.progress ?? null });
      const path = `${user.id}/generated/${id}.mp4`;
      const dl = await fetch(`${GW}/${id}/content`, { headers: { Authorization: `Bearer ${key}` } });
      if (!dl.ok) return json({ error: await gwError(dl) }, dl.status);
      const bytes = new Uint8Array(await dl.arrayBuffer());
      const { error: up } = await sb.storage.from("source-assets").upload(path, bytes, { contentType: "video/mp4", upsert: true });
      if (up) return json({ error: up.message }, 500);
      return json({ status: "completed", path });
    }

    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 5 || prompt.length > 2000) return json({ error: "Describe the clip in 5–2000 characters" }, 400);
    const aspect = body.aspect === "16:9" ? "16:9" : "9:16";
    const dur = [4, 6, 8].includes(Number(body.duration)) ? Number(body.duration) : 6;
    const { data: kit } = await sb.from("brand_kits").select("colors, tone").eq("client_id", clientId).maybeSingle();
    const colors = Array.isArray(kit?.colors) ? (kit!.colors as { hex?: string }[]).map((c) => c.hex).filter(Boolean) : [];
    const brand = body.apply_brand !== false && (colors.length || kit?.tone)
      ? ` Brand direction: ${colors.length ? `accent colors ${colors.join(", ")}.` : ""} ${kit?.tone ? `Mood: ${kit.tone}.` : ""}` : "";
    const input = `Vertical-friendly social media clip for a Reel or Story. ${prompt}.${brand} Strong visual hook in the first second. Consider micro-detail, expression and timing. No logos, no watermarks, no brand names. No dialogue. Upbeat, tasteful background music.`;

    const r = await fetch(GW, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-omni-1.1-flash", input, response_format: { type: "video", resolution: "720p", duration: `${dur}s`, aspect_ratio: aspect } }),
    });
    if (!r.ok) return json({ error: await gwError(r) }, r.status);
    const job = await r.json();

    try {
      const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const ym = new Date().toISOString().slice(0, 7);
      const { data: row } = await admin.from("generation_counts").select("id, video_count").eq("client_id", clientId).eq("year_month", ym).maybeSingle();
      if (row) await admin.from("generation_counts").update({ video_count: row.video_count + 1 }).eq("id", row.id);
      else await admin.from("generation_counts").insert({ client_id: clientId, year_month: ym, image_count: 0, video_count: 1 });
    } catch (e) { console.error("count failed", e); }

    return json({ video_id: job.id, status: job.status });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
