import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Provider = z.enum(["linkedin", "meta", "x", "google"]);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), provider: Provider, client_id: z.string().trim().min(3).max(300), client_secret: z.string().trim().min(3).max(2000) }),
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
    if (!isAdmin) return json({ error: "Only owners and admins can manage developer apps." }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const b = parsed.data;
    if (b.action === "save") {
      await admin.from("publishing_credentials").delete().eq("provider", b.provider);
      const { error } = await admin.from("publishing_credentials").insert({
        provider: b.provider, client_id: b.client_id, client_secret: b.client_secret, updated_by: u.user.id,
      });
      if (error) throw error;
      await userClient.rpc("log_activity", { _action: "developer_app_saved", _target: b.provider, _details: {} });
    } else {
      const { error } = await admin.from("publishing_credentials").delete().eq("provider", b.provider);
      if (error) throw error;
      await userClient.rpc("log_activity", { _action: "developer_app_removed", _target: b.provider, _details: {} });
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
