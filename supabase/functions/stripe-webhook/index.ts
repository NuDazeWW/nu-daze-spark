// The only path that grants entitlements. Signature-verified and idempotent.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const ok = (b: unknown = { received: true }, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!key || !secret) return ok({ error: "Stripe not configured" }, 503);
  const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return ok({ error: "Missing signature" }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), sig, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch (e) {
    console.error("Bad signature", e);
    return ok({ error: "Invalid signature" }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Idempotency: claim the event id first; duplicates hit the primary key and are ignored.
  const { error: dupErr } = await db.from("stripe_processed_events").insert({ event_id: event.id, event_type: event.type });
  if (dupErr) return ok({ received: true, duplicate: true });

  const log = (action: string, details: Record<string, unknown>) =>
    db.from("activity_log").insert({ actor_id: null, action, target: "billing", details: { event_id: event.id, ...details } });

  try {
    const { data: bill } = await db.from("workspace_billing").select("*").maybeSingle();
    const internal = bill?.billing_status === "internal";

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status !== "paid" && s.mode === "payment") break;
        if (s.metadata?.kind === "topup") {
          const packs = Number(s.metadata.packs ?? 1);
          await db.from("workspace_billing").update({ bonus_credits: (bill?.bonus_credits ?? 0) + 500 * packs, payment_method_status: internal ? "internal" : "valid", updated_at: new Date().toISOString() }).eq("id", true);
          await db.from("usage_events").insert({ bucket: "credits", capability: "topup", quantity: packs, credits: -500 * packs, cost_cents: 0 });
          await log("credits_topped_up", { packs });
        } else if (s.metadata?.kind === "subscription" && !internal) {
          await db.from("workspace_billing").update({
            tier_slug: s.metadata.tier, tier_definition_version: Number(s.metadata.version ?? 1),
            billing_cycle: s.metadata.cycle, billing_status: "active", payment_method_status: "valid",
            stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null,
            updated_at: new Date().toISOString(),
          }).eq("id", true);
          await log("subscription_started", { tier: s.metadata.tier, cycle: s.metadata.cycle });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        if (internal) break;
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0] as Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number };
        const start = (sub as unknown as { current_period_start?: number }).current_period_start ?? item?.current_period_start;
        const end = (sub as unknown as { current_period_end?: number }).current_period_end ?? item?.current_period_end;
        const patch: Record<string, unknown> = {
          stripe_subscription_id: sub.id,
          billing_status: sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : sub.status,
          updated_at: new Date().toISOString(),
        };
        if (sub.metadata?.tier && sub.metadata.tier !== bill?.tier_slug) {
          // Tier change: new tier at its current version
          const { data: t } = await db.from("subscription_tier_definitions").select("version").eq("tier_slug", sub.metadata.tier).eq("is_current", true).maybeSingle();
          patch.tier_slug = sub.metadata.tier;
          patch.tier_definition_version = t?.version ?? 1;
        }
        if (start) patch.cycle_start = new Date(start * 1000).toISOString();
        if (end) patch.cycle_end = new Date(end * 1000).toISOString();
        await db.from("workspace_billing").update(patch).eq("id", true);
        break;
      }
      case "customer.subscription.deleted": {
        if (internal) break;
        await db.from("workspace_billing").update({ billing_status: "canceled", stripe_subscription_id: null, updated_at: new Date().toISOString() }).eq("id", true);
        await log("subscription_canceled", {});
        break;
      }
      case "invoice.paid": {
        if (internal) break;
        const inv = event.data.object as Stripe.Invoice;
        const patch: Record<string, unknown> = { payment_method_status: "valid", billing_status: "active", updated_at: new Date().toISOString() };
        if (inv.billing_reason === "subscription_cycle" && bill) {
          // Cycle boundary: roll included clips one month, then re-pin and reset meters.
          await db.rpc("roll_clip_allowances");
          const { data: t } = await db.from("subscription_tier_definitions").select("version").eq("tier_slug", bill.tier_slug).eq("is_current", true).maybeSingle();
          Object.assign(patch, {
            tier_definition_version: t?.version ?? bill.tier_definition_version,
            media_credits_used: 0, text_drafts_used: 0, x_spend_cents: 0,
            paused_buckets: [], level2_degraded: false, anomaly_counters: {},
          });
          await log("billing_cycle_renewed", { version: patch.tier_definition_version });
        }
        await db.from("workspace_billing").update(patch).eq("id", true);
        break;
      }
      case "invoice.payment_failed": {
        if (internal) break;
        await db.from("workspace_billing").update({ payment_method_status: "failed", billing_status: "past_due", updated_at: new Date().toISOString() }).eq("id", true);
        await log("payment_failed", {});
        break;
      }
    }
    return ok();
  } catch (e) {
    console.error(e);
    // Release the claim so Stripe's retry can process it.
    await db.from("stripe_processed_events").delete().eq("event_id", event.id);
    return ok({ error: "Processing failed" }, 500);
  }
});
