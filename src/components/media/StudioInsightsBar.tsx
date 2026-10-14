import type { StudioSettings } from "./StudioControls";
import { Gauge, Radar, Target, Lightbulb } from "lucide-react";

type Props = { settings: StudioSettings; assetCount: number; variationCount: number; hasCaption: boolean };

/** Brief signals derived only from the user's own choices — nothing invented. */
export function StudioInsightsBar({ settings, assetCount, variationCount, hasCaption }: Props) {
  const checks = [!!settings.audience, !!settings.cta, !!settings.voice, assetCount > 0, hasCaption, settings.enhance];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const next = !settings.audience ? "Pick a target audience so the visual speaks to someone specific."
    : !settings.cta ? "Choose a primary CTA to give the post a clear job."
    : assetCount === 0 ? "Select a source asset to ground the visual in real brand material."
    : variationCount < 2 ? "Generate another variation to compare angles."
    : !hasCaption ? "Write a caption, then add your favorite to the queue."
    : "Add your strongest variant to the queue for Preflight and approval.";
  const items = [
    { icon: Radar, label: "Observed signal", value: `${variationCount} variation${variationCount === 1 ? "" : "s"} · ${assetCount} source asset${assetCount === 1 ? "" : "s"}` },
    { icon: Target, label: "Likely driver", value: [settings.tone, settings.audience || "general audience"].join(" · ") },
    { icon: Gauge, label: "Brief completeness", value: `${pct}%`, bar: pct },
    { icon: Lightbulb, label: "Recommended next move", value: next },
  ];
  return (
    <section className="sm-card rounded-2xl border border-border/60 bg-card p-4" aria-label="AI insights">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ icon: Icon, label, value, bar }) => (
          <div key={label} className="flex gap-3 min-w-0">
            <span className="h-8 w-8 shrink-0 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center"><Icon className="h-4 w-4 text-primary" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-xs font-medium capitalize-first">{value}</p>
              {bar !== undefined && <div className="mt-1 h-1.5 rounded-full bg-muted/40"><div className="h-full rounded-full bg-primary" style={{ width: `${bar}%` }} /></div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
