import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fmtUsd, meterTone, useBilling } from "@/hooks/useBilling";

const gb = (b: number) => (b / 1024 ** 3).toFixed(b < 1024 ** 3 ? 2 : 1);

/** Glanceable one line per bucket. Neutral <80%, amber 80%, red 100%. */
export function SidebarUsageMeter() {
  const { meters, daysLeft, snapshot } = useBilling();
  if (!meters || !snapshot) return null;
  const rows = [
    { key: "credits", label: "Credits", used: meters.credits.used, total: meters.credits.total, text: `${meters.credits.used.toLocaleString()} / ${meters.credits.total.toLocaleString()}` },
    { key: "text_drafts", label: "AI drafts", used: meters.text_drafts.used, total: meters.text_drafts.total, text: `${meters.text_drafts.used.toLocaleString()} / ${meters.text_drafts.total.toLocaleString()}` },
    meters.x_spend.total > 0
      ? { key: "x_spend", label: "X spend", used: meters.x_spend.used, total: meters.x_spend.total, text: `${fmtUsd(meters.x_spend.used, 2)} / ${fmtUsd(meters.x_spend.total)}` }
      : null,
    { key: "storage", label: "Storage", used: meters.storage.used, total: meters.storage.total, text: `${gb(meters.storage.used)} / ${gb(meters.storage.total)} GB` },
  ].filter(Boolean) as { key: string; label: string; used: number; total: number; text: string }[];
  const paused = snapshot.billing.paused_buckets;
  const worst = rows.reduce((w, r) => { const t = paused.includes(r.key) ? "red" : meterTone(r.used, r.total); return t === "red" ? "red" : t === "amber" && w !== "red" ? "amber" : w; }, "neutral" as string);

  return (
    <Link to="/settings/usage" className="block rounded-md border border-sidebar-border px-2.5 py-2 hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden" aria-label="Usage this cycle">
      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wide text-sidebar-foreground/60">
        <span>Usage</span><span>{daysLeft}d left</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const tone = paused.includes(r.key) ? "red" : meterTone(r.used, r.total);
          const pct = r.total > 0 ? Math.min(100, (r.used / r.total) * 100) : 0;
          return (
            <div key={r.key}>
              <div className="flex justify-between text-[11px] text-sidebar-foreground/80">
                <span>{r.label}{paused.includes(r.key) && " · paused"}</span>
                <span className="font-mono">{r.text}</span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-sidebar-foreground/10">
                <div className={cn("h-full rounded-full", tone === "red" ? "bg-destructive" : tone === "amber" ? "bg-warning" : "bg-sidebar-foreground/50")} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {worst !== "neutral" && (
        <p className={cn("mt-1.5 text-[11px] font-medium", worst === "red" ? "text-destructive" : "text-warning")}>
          {worst === "red" ? "Limit reached — unblock now →" : "Nearing a limit — top up →"}
        </p>
      )}
    </Link>
  );
}
