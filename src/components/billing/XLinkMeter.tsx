import { Link } from "react-router-dom";
import { AlertTriangle, Link2 } from "lucide-react";
import { URL_RE, X_LINK_CENTS, X_TEXT_CENTS, fmtUsd, useBilling } from "@/hooks/useBilling";

/** Compose-time projection of X metered cost. Any URL anywhere = link rate. */
export function XLinkMeter({ text, xChannels }: { text: string; xChannels: number }) {
  const { snapshot } = useBilling();
  if (!xChannels || !snapshot) return null;
  const cap = snapshot.tier.allowances.x_cap_cents;
  if (cap <= 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
        <p>X isn't included in the {snapshot.tier.name} plan. <Link to="/settings/billing" className="font-medium text-primary underline">Upgrade to Team</Link> to post to X.</p>
      </div>
    );
  }
  const isLink = URL_RE.test(text);
  const per = isLink ? X_LINK_CENTS : X_TEXT_CENTS;
  const cost = per * xChannels;
  const used = snapshot.billing.x_spend_cents;
  const after = used + cost;
  const over = after > cap;
  return (
    <div className={`rounded-lg border p-3 text-xs ${over ? "border-destructive/40 bg-destructive/5" : "bg-muted/40"}`}>
      <p className="flex items-center gap-1.5 font-medium"><Link2 className="h-3.5 w-3.5" /> X metering — {isLink ? "link detected, $0.200 per post" : "no link, $0.015 per post"}</p>
      <p className="mt-1 text-muted-foreground">
        This post: {fmtUsd(cost, 2)} · <b className="text-foreground">{fmtUsd(after, 2)} of {fmtUsd(cap, 2)} used after this post</b>
      </p>
      {over && (
        <p className="mt-1 text-destructive">
          This would cross your monthly X cap. <Link to="/settings/billing" className="underline">Top up, add Managed X, or use your own X key</Link>. Other channels still publish.
        </p>
      )}
    </div>
  );
}
