// INACTIVE upgrade path for live delivery. The database job process_scheduled_posts stages
// scheduled posts today. When a client instance connects its own approved platform apps,
// the job hands staged attempts to this function for real dispatch. Until then it refuses.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
  if (!user) return json({ error: "Invalid session" }, 401);
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Admins only" }, 403);
  if (Deno.env.get("LIVE_DISPATCH_ENABLED") !== "true") {
    return json({ active: false, message: "Live dispatch is inactive until this instance connects its own approved platform apps." }, 409);
  }
  return json({ active: false, message: "Live dispatch adapters are not installed in this build." }, 501);
});
