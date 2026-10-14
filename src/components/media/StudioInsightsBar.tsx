import type { StudioSettings } from "./StudioControls";
import { BarChart3, Gauge, Radar, Target, Lightbulb } from "lucide-react";

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
    { icon: Radar, tone: "lime", label: "Observed signal", value: `${variationCount} variation${variationCount === 1 ? "" : "s"} · ${assetCount} source asset${assetCount === 1 ? "" : "s"}` },
    { icon: Target, tone: "citrine", label: "Likely driver", value: [settings.tone, settings.audience || "general audience"].join(" · ") },
    { icon: Gauge, tone: "cyan", label: "Brief completeness", value: `${pct}%`, bar: pct },
    { icon: Lightbulb, tone: "violet", label: "Recommended next move", value: next },
  ];
  return (
    <section className="sm-studio-panel p-3 grid gap-3 md:grid-cols-[200px_repeat(2,minmax(0,1fr))] xl:grid-cols-[220px_repeat(4,minmax(0,1fr))] items-stretch" aria-label="Insights">
      <div className="flex items-center gap-3 px-1">
        <span className="sm-well sm-well-cyan"><BarChart3 className="h-5 w-5" /></span>
        <div><p className="font-display text-sm font-semibold">Insights</p><p className="text-[11px] text-muted-foreground leading-snug">Based on your choices in this studio.</p></div>
      </div>
      {items.map(({ icon: Icon, tone, label, value, bar }) => (
        <div key={label} className="sm-insight-tile flex gap-3 min-w-0 rounded-xl p-2.5">
          <span className={`sm-well sm-well-${tone}`}><Icon className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-semibold sm-tone-text-${tone}`}>{label}</p>
            <p className="text-xs leading-snug first-letter:uppercase">{value}</p>
            {bar !== undefined && <div className="mt-1.5 h-1.5 rounded-full bg-muted/40"><div className="h-full rounded-full bg-primary" style={{ width: `${bar}%` }} /></div>}
          </div>
        </div>
      ))}
    </section>
  );
}
