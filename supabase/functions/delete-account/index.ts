import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sign in required" }, 401);
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") return json({ error: "Confirmation required" }, 400);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) return json({ error: "Sign in required" }, 401);
  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: owner } = await svc.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "owner").maybeSingle();
  if (owner) return json({ error: "Transfer workspace ownership to someone else before deleting your account." }, 409);
  const { error } = await svc.auth.admin.deleteUser(u.user.id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
