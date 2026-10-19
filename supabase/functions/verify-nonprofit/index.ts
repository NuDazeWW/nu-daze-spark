import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  ein: z.string().regex(/^\d{2}-?\d{7}$/).optional(),
  country: z.string().min(2).max(2),
  legal_name: z.string().max(200).optional(),
  state: z.string().max(2).optional(),
  application_id: z.string().uuid().optional(),
});

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(inc|incorporated|corp|corporation|the)/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sign in required" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return json({ error: "Sign in required" }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const b = parsed.data;

  let result: Record<string, unknown>;
  if (b.country.toUpperCase() !== "US") {
    // IRS data only covers US organizations; never call the lookup for others.
    result = { result: "skipped_non_us", route: b.country.toUpperCase() === "CA" ? "manual_cra" : "manual_international" };
  } else if (!b.ein) {
    return json({ error: "EIN required for US organizations" }, 400);
  } else {
    const ein = b.ein.replace("-", "");
    const sourceUrl = `https://projects.propublica.org/nonprofits/organizations/${ein}`;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`, { signal: ctl.signal });
      clearTimeout(t);
      if (r.status === 404) result = { result: "miss", route: "manual_irs", source: "ProPublica Nonprofit Explorer", source_url: sourceUrl };
      else if (!r.ok) result = { result: "error", route: "manual_irs" };
      else {
        const d = await r.json();
        const o = d.organization ?? {};
        const is501c3 = Number(o.subsection_code) === 3;
        const nameOk = !b.legal_name || norm(o.name ?? "") === norm(b.legal_name) || norm(o.name ?? "").includes(norm(b.legal_name));
        const stateOk = !b.state || (o.state ?? "").toUpperCase() === b.state.toUpperCase();
        result = {
          result: is501c3 && nameOk && stateOk ? "match" : "partial",
          route: is501c3 && nameOk && stateOk ? "document_review" : "manual_irs",
          matched_name: o.name ?? null, state: o.state ?? null, subsection_code: o.subsection_code ?? null,
          source: "ProPublica Nonprofit Explorer", citation: d.data_source ?? null, source_url: sourceUrl,
        };
      }
    } catch {
      result = { result: "timeout", route: "manual_irs" };
    }
  }

  if (b.application_id) {
    await supabase.from("nonprofit_applications").update({
      corroboration: result, matched_name: (result.matched_name as string) ?? null, review_route: result.route as string,
    }).eq("id", b.application_id);
  }
  return json(result);
});
