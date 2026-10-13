import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TierAllowances = {
  brands: number; seats: number; dispatches: number; media_credits: number; text_drafts: number;
  x_cap_cents: number; storage_gb: number; absolute_daily_alert_cents: number;
  channels: string[]; features: string[]; overage_hourly_cents: number;
};
export type TierDefinition = {
  id: string; tier_slug: TierSlug; version: number; name: string; sort_order: number;
  monthly_price_cents: number; annual_price_cents: number; nonprofit_annual_price_cents: number;
  implementation_fee_cents: number; nonprofit_implementation_fee_cents: number;
  allowances: TierAllowances; is_current: boolean;
};
export type TierSlug = "starter" | "team" | "pro" | "enterprise";
export type Bucket = "credits" | "text_drafts" | "x_spend";

export type BillingSnapshot = {
  billing: {
    tier_slug: TierSlug; tier_definition_version: number; billing_cycle: string; billing_status: string;
    billing_mode: "self_serve_card" | "invoice"; cycle_start: string; cycle_end: string;
    payment_method_status: string; media_credits_used: number; bonus_credits: number; text_drafts_used: number;
    x_spend_cents: number; storage_bytes: number; paused_buckets: string[]; level2_degraded: boolean;
    anomaly_counters: Record<string, number>; resume_delegate_user_id: string | null; nonprofit_status: string;
  };
  tier: TierDefinition;
  current_version: number;
  storage_bytes_actual: number;
  role: string | null;
  can_control_spend: boolean;
};

export const fmtUsd = (cents: number, digits = 0) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const TIER_ORDER: TierSlug[] = ["starter", "team", "pro", "enterprise"];
export const nextTier = (t: TierSlug): TierSlug | null => TIER_ORDER[TIER_ORDER.indexOf(t) + 1] ?? null;

/** URL detection: any URL anywhere is treated as a metered link post. */
export const URL_RE = /(https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(com|org|net|io|co|ai|app|dev|ly|gl)(\/[^\s]*)?\b/i;
export const X_LINK_CENTS = 20;
export const X_TEXT_CENTS = 1.5;

export function useBilling() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["billing_snapshot"],
    enabled: Boolean(user),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("billing_snapshot");
      if (error) throw error;
      return data as unknown as BillingSnapshot;
    },
  });
  const s = q.data;
  const a = s?.tier?.allowances;
  const b = s?.billing;
  const meters = s && a && b ? {
    credits: { used: b.media_credits_used, total: a.media_credits + b.bonus_credits },
    text_drafts: { used: b.text_drafts_used, total: a.text_drafts },
    x_spend: { used: b.x_spend_cents, total: a.x_cap_cents },
    storage: { used: s.storage_bytes_actual, total: a.storage_gb * 1024 ** 3 },
  } : null;
  const daysLeft = b ? Math.max(0, Math.ceil((new Date(b.cycle_end).getTime() - Date.now()) / 86400000)) : 0;
  return {
    snapshot: s ?? null, meters, daysLeft, loading: q.isLoading,
    hasFeature: (f: string) => Boolean(a?.features?.includes(f)),
    refresh: () => { qc.invalidateQueries({ queryKey: ["billing_snapshot"] }); qc.invalidateQueries({ queryKey: ["guardrail_alerts"] }); },
  };
}

export function useTierDefinitions() {
  return useQuery({
    queryKey: ["tier_definitions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_tier_definitions").select("*").eq("is_current", true).order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as TierDefinition[];
    },
  });
}

export function useCreditWeights() {
  return useQuery({
    queryKey: ["credit_weights"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_weight_definitions").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type PrecheckResult = { ok: boolean; reason?: string; required?: number; balance?: number; shortfall?: number; after?: number; bucket?: string };

export async function precheckUsage(bucket: Bucket, capability: string, quantity = 1, clientId: string | null = null, dryRun = true) {
  const { data, error } = await supabase.rpc("consume_usage", {
    _bucket: bucket, _capability: capability, _quantity: quantity, _client_id: clientId ?? undefined, _dry_run: dryRun,
  });
  if (error) throw error;
  return data as unknown as PrecheckResult;
}

export function meterTone(used: number, total: number) {
  if (total <= 0) return "neutral" as const;
  const pct = used / total;
  return pct >= 1 ? ("red" as const) : pct >= 0.8 ? ("amber" as const) : ("neutral" as const);
}

export async function startCheckout(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", { body: { return_url: window.location.origin + window.location.pathname, ...body } });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as { context: Response }).context.json()).error ?? msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  if (data?.url) window.location.href = data.url;
  return data;
}
