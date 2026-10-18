import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { chargeDrafts } from "../_shared/metering.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI not configured" }, 500);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const samples: string[] = Array.isArray(body.sample_posts)
      ? body.sample_posts.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 10)
      : [];
    if (!name || samples.length < 2) {
      return json({ error: "name and at least 2 sample posts are required" }, 400);
    }

    const prompt = `Analyze these ${samples.length} real posts written by ${name}${body.role_title ? ` (${body.role_title})` : ""} and extract their personal writing voice.

POSTS:
${samples.map((s, i) => `--- Post ${i + 1} ---\n${s.slice(0, 2000)}`).join("\n\n")}

Derive only what the samples evidence. Be concrete and specific, not generic.`;

    const blocked = await chargeDrafts(sb, "analyze_voice", null, cors);
    if (blocked) return blocked;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert ghostwriter who reverse-engineers personal writing voices from samples. Never invent traits the samples don't show." },
          { role: "user", content: prompt },
        ],
        tools: [{ type: "function", function: {
          name: "voice_profile", description: "Extracted personal voice profile",
          parameters: { type: "object", additionalProperties: false,
            required: ["voice_traits", "topics", "banned_phrases", "pov_statement"],
            properties: {
              voice_traits: { type: "array", items: { type: "string" }, description: "4-8 concrete style traits, e.g. 'Opens with a personal anecdote', 'Short declarative sentences'" },
              topics: { type: "array", items: { type: "string" }, description: "Signature topics this person writes about" },
              banned_phrases: { type: "array", items: { type: "string" }, description: "Phrases/styles this person clearly avoids or that would sound unlike them" },
              pov_statement: { type: "string", description: "One sentence capturing their point of view / what they stand for" },
            } },
        } }],
        tool_choice: { type: "function", function: { name: "voice_profile" } },
      }),
    });
    if (r.status === 429) return json({ error: "AI rate limit reached. Try again shortly." }, 429);
    if (r.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);
    if (!r.ok) return json({ error: `AI error ${r.status}` }, 500);
    const d = await r.json();
    const call = d.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "AI returned no result" }, 500);
    const profile = JSON.parse(call.function.arguments);
    // Returns a reviewable draft — the client saves only after human confirmation.
    return json({ profile });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});
