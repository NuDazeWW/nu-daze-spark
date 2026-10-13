import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SIZES: Record<string, string> = { square: "1024x1024", portrait: "1024x1536", landscape: "1536x1024" };
const UUID = /^[0-9a-f-]{36}$/i;

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
    const prompt = String(body.prompt ?? "").trim();
    const aspect = SIZES[body.aspect] ? body.aspect : "square";
    const style = String(body.style ?? "photographic").slice(0, 40);
    if (!UUID.test(clientId)) return json({ error: "Pick a client" }, 400);
    if (prompt.length < 5 || prompt.length > 2000) return json({ error: "Describe the image in 5–2000 characters" }, 400);

    const { data: ok } = await sb.rpc("user_can_access_client", { _user_id: user.id, _client_id: clientId });
    if (!ok) return json({ error: "No access to this client" }, 403);

    const { data: kit } = await sb.from("brand_kits").select("colors, fonts, tone").eq("client_id", clientId).maybeSingle();
    const colors = Array.isArray(kit?.colors) ? (kit!.colors as { name?: string; hex?: string }[]).map((c) => `${c.name ?? ""} ${c.hex ?? ""}`.trim()).filter(Boolean) : [];
    const brandLine = body.apply_brand !== false && (colors.length || kit?.tone)
      ? `\nBrand direction: ${colors.length ? `use this palette as dominant accents: ${colors.join(", ")}.` : ""} ${kit?.tone ? `Mood/tone: ${kit.tone}.` : ""}`
      : "";
    const fullPrompt = `${style} style social media visual. ${prompt}${brandLine}
Do not include any logos, watermarks, or brand names (a logo is added separately). Avoid text unless explicitly requested. Leave clean space in the bottom-right corner.`;

    // Credit pre-check: never generate on credit.
    const { data: pre, error: preErr } = await sb.rpc("consume_usage", { _bucket: "credits", _capability: "image_standard", _quantity: 1, _client_id: clientId, _dry_run: true });
    if (preErr) return json({ error: preErr.message }, 403);
    if (!(pre as { ok: boolean }).ok) return json({ error: "Not enough credits", code: "CREDITS_BLOCKED", detail: pre }, 402);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-image-2.5-sunburst", prompt: fullPrompt, size: SIZES[aspect], quality: "medium" }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("image gen failed", res.status, t);
      const msg = res.status === 429 ? "Too many requests — try again in a minute."
        : res.status === 402 ? "AI credits are used up for this workspace."
        : (() => { try { return JSON.parse(t)?.error?.message ?? "Image generation failed"; } catch { return "Image generation failed"; } })();
      return json({ error: msg }, res.status);
    }
    const out = await res.json();
    const b64 = out?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "The AI returned no image. Try a different description." }, 422);

    await sb.rpc("consume_usage", { _bucket: "credits", _capability: "image_standard", _quantity: 1, _client_id: clientId, _dry_run: false });
    // usage counter (service role; table is read-only to users)
    try {
      const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const ym = new Date().toISOString().slice(0, 7);
      const { data: row } = await admin.from("generation_counts").select("id, image_count").eq("client_id", clientId).eq("year_month", ym).maybeSingle();
      if (row) await admin.from("generation_counts").update({ image_count: row.image_count + 1 }).eq("id", row.id);
      else await admin.from("generation_counts").insert({ client_id: clientId, year_month: ym, image_count: 1, video_count: 0 });
    } catch (e) { console.error("count failed", e); }

    return json({ b64, prompt: fullPrompt, aspect });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
