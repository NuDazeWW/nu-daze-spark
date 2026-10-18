// Charges AI drafts through consume_usage before an AI call. Hard stop at the allowance.
// Draft weights per action (keep in sync with src/lib/pricing.ts DRAFT_WEIGHTS).
export const DRAFT_WEIGHTS = {
  preflight_review: 1,
  preflight_rewrite: 1,
  repurpose_content: 1,
  analyze_voice: 5,
  brand_strategy_extract: 5,
} as const;

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };

/** Returns null when charged, or a Response to send back when blocked. */
export async function chargeDrafts(
  sb: Rpc, action: keyof typeof DRAFT_WEIGHTS, clientId: string | null,
  headers: Record<string, string>,
): Promise<Response | null> {
  const { data, error } = await sb.rpc("consume_usage", {
    _bucket: "text_drafts", _capability: action, _quantity: DRAFT_WEIGHTS[action],
    _client_id: clientId, _dry_run: false,
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
  }
  if (!data?.ok) {
    return new Response(JSON.stringify({
      error: "AI draft allowance reached. Ask an admin to add a 100-draft pack ($2).",
      reason: data?.reason ?? "insufficient", bucket: "text_drafts", required: data?.required, balance: data?.balance,
    }), { status: 402, headers: { ...headers, "Content-Type": "application/json" } });
  }
  return null;
}
