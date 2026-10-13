import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Provider = z.enum(["openai", "fal", "stability", "midjourney", "runway", "luma", "kling", "pika"]);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), provider: Provider, api_key: z.string().trim().min(8).max(4000) }),
  z.object({ action: z.literal("delete"), provider: Provider }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Only owners and admins can manage AI providers." }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const b = parsed.data;
    if (b.action === "save") {
      const { error } = await admin.from("ai_provider_credentials").upsert({ provider: b.provider, api_key: b.api_key, updated_by: u.user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      await userClient.rpc("log_activity", { _action: "ai_provider_saved", _target: b.provider, _details: {} });
    } else {
      const { error } = await admin.from("ai_provider_credentials").delete().eq("provider", b.provider);
      if (error) throw error;
      await userClient.rpc("log_activity", { _action: "ai_provider_removed", _target: b.provider, _details: {} });
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
