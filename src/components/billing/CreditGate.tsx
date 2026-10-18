import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, KeyRound, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { ADDONS, type AddonKind } from "@/lib/pricing";
import { fmtUsd, grantAddon, nextTier, precheckUsage, useBilling, useCreditWeights, type Bucket, type PrecheckResult } from "@/hooks/useBilling";

type GateRequest = { bucket: Bucket; capability: string; quantity?: number; clientId?: string | null; label?: string };
type Ctx = { ensure: (r: GateRequest) => Promise<boolean> };
const CreditGateCtx = createContext<Ctx>({ ensure: async () => true });

/** Use before any metered action: `if (!(await ensure({...}))) return;` — never generates on credit. */
export const useCreditGate = () => useContext(CreditGateCtx);

export function CreditGateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ req: GateRequest; res: PrecheckResult } | null>(null);
  const ensure = useCallback(async (req: GateRequest) => {
    try {
      const res = await precheckUsage(req.bucket, req.capability, req.quantity ?? 1, req.clientId ?? null, true);
      if (res.ok) return true;
      setState({ req, res });
      return false;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't check your balance");
      return false;
    }
  }, []);
  return (
    <CreditGateCtx.Provider value={{ ensure }}>
      {children}
      <InsufficientBalanceModal state={state} onClose={() => setState(null)} />
    </CreditGateCtx.Provider>
  );
}

function InsufficientBalanceModal({ state, onClose }: { state: { req: GateRequest; res: PrecheckResult } | null; onClose: () => void }) {
  const { snapshot, refresh } = useBilling();
  const weights = useCreditWeights();
  const [busy, setBusy] = useState<string | null>(null);
  if (!state) return null;
  const { req, res } = state;
  const tier = snapshot?.billing.tier_slug ?? "starter";
  const up = nextTier(tier);
  const isVideo = req.capability.startsWith("video");
  const isImage = req.capability.startsWith("image");
  const label = req.label ?? weights.data?.find((w) => w.capability === req.capability)?.label ?? req.capability;
  const unit = req.bucket === "x_spend" ? "¢" : req.bucket === "text_drafts" ? " drafts" : req.bucket.startsWith("video") ? " clips" : " credits";
  const kind: AddonKind | null = req.bucket === "credits" ? "media_credits" : req.bucket === "text_drafts" ? "ai_drafts"
    : req.bucket === "video_draft" ? "draft_clips" : req.bucket === "video_premium" ? "premium_clips" : null;
  const addon = kind ? ADDONS[kind] : null;
  const canBuy = snapshot?.can_control_spend;

  const title = res.reason === "paused" ? "This spend bucket is paused"
    : res.reason === "payment_method_required" ? "Add a payment method first"
    : res.reason === "not_in_tier" ? "Not included in your plan"
    : "Not enough balance for this action";

  const buy = async () => {
    setBusy("topup");
    try {
      await grantAddon(kind!, 1, `Granted from the ${label} limit screen`);
      toast.success(`${addon!.label} added`); refresh(); onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{label}. Nothing was generated or queued.</DialogDescription>
        </DialogHeader>

        {res.reason === "insufficient" && (
          <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-center">
            <div><p className="text-xs text-muted-foreground">This action</p><p className="font-display text-lg font-semibold">{res.required}{unit}</p></div>
            <div><p className="text-xs text-muted-foreground">Your balance</p><p className="font-display text-lg font-semibold">{res.balance}{unit}</p></div>
            <div><p className="text-xs text-muted-foreground">Shortfall</p><p className="font-display text-lg font-semibold text-destructive">{res.shortfall}{unit}</p></div>
          </div>
        )}
        {res.reason === "paused" && <p className="text-sm text-muted-foreground">A usage alert paused this bucket. An owner or admin can review the alert and resume it on the Usage page. Scheduled posting to free channels continues.</p>}
        {res.reason === "payment_method_required" && <p className="text-sm text-muted-foreground">AI media and X posting need a card on file so the balance can never go negative.</p>}

        <div className="space-y-2">
          {addon && res.reason !== "paused" && (
            <PathRow icon={<Coins className="h-4 w-4" />} title={`Add ${addon.label} · ${fmtUsd(addon.price_cents)}`}
              body={canBuy ? "Granted by an owner or admin and recorded on the workspace bill." : "Ask an owner or admin to add this pack."}>
              <Button size="sm" onClick={buy} disabled={!canBuy || busy === "topup"}>{busy === "topup" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add pack"}</Button>
            </PathRow>
          )}
          {up && (
            <PathRow icon={<TrendingUp className="h-4 w-4" />} title={`Upgrade to ${up[0].toUpperCase() + up.slice(1)}`}
              body={isVideo ? "Surge Pro includes 10 draft clips; Force Enterprise includes 50 draft and 10 premium clips." : "Higher monthly allowances across every bucket."}>
              <Button size="sm" variant={isVideo ? "default" : "outline"} asChild><Link to="/settings/billing" onClick={onClose}>See plans</Link></Button>
            </PathRow>
          )}
          {(isVideo || isImage || req.bucket === "x_spend") && (
            <PathRow icon={<KeyRound className="h-4 w-4" />} title="Bring your own key" body={req.bucket === "x_spend" ? "Use your own X developer key at no cost to your cap." : "Connect your own image or video tool — no credits used."}>
              <Button size="sm" variant="outline" asChild><Link to={req.bucket === "x_spend" ? "/settings/connections" : "/media-studio?tab=providers"} onClick={onClose}>Connect</Link></Button>
            </PathRow>
          )}
          {!canBuy && <p className="text-xs text-muted-foreground">Only owners and admins can add packs or change the plan.</p>}
        </div>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </DialogContent>
    </Dialog>
  );
}

function PathRow({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className="text-primary">{icon}</span>
      <div className="flex-1"><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{body}</p></div>
      {children}
    </div>
  );
}
