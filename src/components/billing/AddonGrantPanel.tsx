import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtUsd, grantAddon, useBilling } from "@/hooks/useBilling";
import { ADDONS, type AddonKind } from "@/lib/pricing";

/** Launch mechanism for add-ons: owners/admins grant packs; each grant is recorded once. */
export function AddonGrantPanel() {
  const { snapshot, refresh } = useBilling();
  const [busy, setBusy] = useState<AddonKind | null>(null);
  const isAdmin = snapshot?.role === "owner" || snapshot?.role === "admin";
  const add = async (k: AddonKind) => {
    setBusy(k);
    try { await grantAddon(k, 1, "Granted from Billing"); toast.success(`${ADDONS[k].label} added`); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Add-on packs are granted by an owner or admin and recorded on the workspace bill. Media credits are for images only; video uses separate clip allowances. Clip packs stay valid for 12 months.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(ADDONS) as AddonKind[]).map((k) => (
          <div key={k} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
            <span className="min-w-0">{ADDONS[k].label} · <span className="font-semibold">{fmtUsd(ADDONS[k].price_cents)}</span></span>
            {isAdmin && (
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => add(k)}>
                {busy === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
              </Button>
            )}
          </div>
        ))}
      </div>
      {!isAdmin && <p className="text-xs text-muted-foreground">Ask an owner or admin to add a pack.</p>}
    </div>
  );
}
