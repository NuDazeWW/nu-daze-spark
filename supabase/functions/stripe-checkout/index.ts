// Creates Stripe Checkout Sessions. Never grants entitlements — only stripe-webhook does.
// All keys and price IDs are per-instance secrets: STRIPE_SECRET_KEY and optional
// STRIPE_PRICE_<TIER>_<MONTHLY|ANNUAL|NONPROFIT>. Without price IDs, prices come from the
// tier definitions table (inline price_data) so preview works with any test key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "npm:stripe@17";
import { z } from "npm:zod@3";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({
    action: z.literal("subscribe"),
    tier: z.enum(["starter", "team", "pro", "enterprise"]),
    cycle: z.enum(["monthly", "annual"]),
    nonprofit: z.boolean().default(false),
    return_url: z.string().url(),
  }),
  z.object({ action: z.literal("topup"), packs: z.number().int().min(1).max(20).default(1), return_url: z.string().url() }),
  z.object({ action: z.literal("portal"), return_url: z.string().url() }),
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

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const mode = key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live" : key ? "test" : "not_configured";

    if (b.action === "status") {
      const { data: role } = await userClient.rpc("workspace_role", { _user_id: u.user.id });
      if (role !== "owner" && role !== "admin") return json({ error: "Owners and admins only" }, 403);
      const tiers = ["STARTER", "TEAM", "PRO", "ENTERPRISE"];
      const priceIds = Object.fromEntries(tiers.flatMap((t) => ["MONTHLY", "ANNUAL", "NONPROFIT"].map((c) => [`${t}_${c}`, Boolean(Deno.env.get(`STRIPE_PRICE_${t}_${c}`))])));
      return json({ mode, webhook_secret: Boolean(Deno.env.get("STRIPE_WEBHOOK_SECRET")), price_ids: priceIds });
    }

    if (mode === "not_configured") return json({ error: "Payments are not connected on this workspace yet. Ask the owner to add the Stripe key." }, 409);

    // Billing actions are owner/admin only
    const { data: canBill } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!canBill) return json({ error: "Only owners and admins can manage billing." }, 403);

    const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: bill } = await admin.from("workspace_billing").select("*").maybeSingle();

    let customer = bill?.stripe_customer_id as string | null;
    if (!customer) {
      const c = await stripe.customers.create({ email: u.user.email ?? undefined, metadata: { workspace_user: u.user.id } });
      customer = c.id;
      await admin.from("workspace_billing").update({ stripe_customer_id: customer }).eq("id", true);
    }

    if (b.action === "portal") {
      const s = await stripe.billingPortal.sessions.create({ customer, return_url: b.return_url });
      return json({ url: s.url });
    }

    if (b.action === "topup") {
      const s = await stripe.checkout.sessions.create({
        mode: "payment", customer,
        line_items: [{ quantity: b.packs, price_data: { currency: "usd", unit_amount: 2500, product_data: { name: "SocialMotive 500-credit pack" } } }],
        metadata: { kind: "topup", packs: String(b.packs) },
        payment_intent_data: { setup_future_usage: "off_session" },
        success_url: `${b.return_url}?checkout=success`, cancel_url: `${b.return_url}?checkout=cancel`,
      });
      return json({ url: s.url });
    }

    // subscribe
    if (b.nonprofit && bill?.nonprofit_status !== "verified") return json({ error: "Nonprofit pricing applies once your 501(c)(3) is verified." }, 409);
    if (b.nonprofit && b.cycle !== "annual") return json({ error: "The nonprofit program is annual only." }, 400);
    const { data: tier } = await admin.from("subscription_tier_definitions").select("*").eq("tier_slug", b.tier).eq("is_current", true).order("version", { ascending: false }).limit(1).maybeSingle();
    if (!tier) return json({ error: "Unknown plan" }, 400);

    const cycleKey = b.nonprofit ? "NONPROFIT" : b.cycle.toUpperCase();
    const envPrice = Deno.env.get(`STRIPE_PRICE_${b.tier.toUpperCase()}_${cycleKey}`);
    const perMonth = b.nonprofit ? tier.nonprofit_annual_price_cents : b.cycle === "annual" ? tier.annual_price_cents : tier.monthly_price_cents;
    const subItem = envPrice
      ? { price: envPrice, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: b.cycle === "annual" ? perMonth * 12 : perMonth,
            recurring: { interval: b.cycle === "annual" ? "year" : "month" },
            product_data: { name: `SocialMotive ${tier.name}${b.nonprofit ? " (Nonprofit)" : ""}` },
          },
        };
    const fee = b.nonprofit ? tier.nonprofit_implementation_fee_cents : tier.implementation_fee_cents;
    const alreadyOnboarded = Boolean(bill?.stripe_subscription_id);
    const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [subItem as Stripe.Checkout.SessionCreateParams.LineItem];
    if (!alreadyOnboarded && fee > 0) {
      items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: fee, product_data: { name: `${tier.name} implementation & onboarding (one-time)` } } });
    }
    const s = await stripe.checkout.sessions.create({
      mode: "subscription", customer, line_items: items,
      metadata: { kind: "subscription", tier: b.tier, cycle: b.cycle, nonprofit: String(b.nonprofit), version: String(tier.version) },
      subscription_data: { metadata: { tier: b.tier, cycle: b.cycle, version: String(tier.version) } },
      success_url: `${b.return_url}?checkout=success`, cancel_url: `${b.return_url}?checkout=cancel`,
    });
    return json({ url: s.url });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Checkout failed" }, 500);
  }
});
