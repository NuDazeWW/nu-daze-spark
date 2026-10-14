import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, KeyRound, Loader2, Sigma } from "lucide-react";
import tableauLogo from "@/assets/logos/tableau.svg";
import sapLogo from "@/assets/logos/sap.svg";
import powerBiLogo from "@/assets/logos/power-bi.svg";
import quickSightLogo from "@/assets/logos/quicksight.svg";

const LOGOS: Record<string, string> = { tableau: tableauLogo, sap: sapLogo, power_bi: powerBiLogo, quicksight: quickSightLogo };
import { useToast } from "@/hooks/use-toast";

const PROVIDERS = [
  { key: "tableau", name: "Tableau", how: "Data → New Data Source → Web Data Connector or 'JSON file' via URL. Paste the CSV or JSON link." },
  { key: "sap", name: "SAP Analytics Cloud", how: "Create a model → Import data → OData services. Use the JSON link; rows are in 'value'." },
  { key: "power_bi", name: "Power BI", how: "Get data → Web. Paste the CSV link, or the JSON link and expand 'value'. Set a scheduled refresh." },
  { key: "sigma", name: "Sigma", how: "Use a CSV upload from the link, or load it through your warehouse's HTTP/external stage." },
  { key: "quicksight", name: "Amazon QuickSight", how: "Schedule the CSV link into S3 (e.g. Lambda/EventBridge), then create a dataset from S3." },
] as const;

type Row = { provider: string; enabled: boolean; key_prefix: string | null; key_created_at: string | null; last_used_at: string | null };
const FEED = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/reporting-feed`;

export function ReportingConnectors({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ name: string; key: string; how: string } | null>(null);
  const { data } = useQuery({
    queryKey: ["reporting_connectors"], enabled: isAdmin,
    queryFn: async () => ((await supabase.from("reporting_connectors" as never).select("provider,enabled,key_prefix,key_created_at,last_used_at")).data ?? []) as Row[],
  });
  const byKey = new Map((data ?? []).map((r) => [r.provider, r]));
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Copied" }); };

  const createKey = async (p: (typeof PROVIDERS)[number]) => {
    setBusy(p.key);
    const { data: key, error } = await supabase.rpc("create_reporting_key" as never, { _provider: p.key } as never);
    setBusy(null);
    if (error) return toast({ title: "Couldn't create key", description: error.message, variant: "destructive" });
    setIssued({ name: p.name, key: key as unknown as string, how: p.how });
    qc.invalidateQueries({ queryKey: ["reporting_connectors"] });
  };
  const toggle = async (p: string, enabled: boolean) => {
    await supabase.from("reporting_connectors" as never).update({ enabled } as never).eq("provider", p);
    qc.invalidateQueries({ queryKey: ["reporting_connectors"] });
  };

  return (
    <section className="sm-rep mt-8">
      <h2 className="sm-src-h2">Reporting Connectors</h2>
      <p className="sm-src-sub">Send publishing and results data to your reporting tools. Each tool gets its own read-only key.</p>
      <div className="sm-rep-grid">
        {PROVIDERS.map((p) => {
          const r = byKey.get(p.key);
          const on = !!r?.key_prefix && r.enabled;
          return (
            <article key={p.key} className="sm-rep-card">
              <div className="sm-rep-head">
                <span className="sm-rep-logo">{LOGOS[p.key] ? <img src={LOGOS[p.key]} alt={`${p.name} logo`} /> : <Sigma aria-label={`${p.name} logo unavailable`} />}</span>
                <p className="sm-rep-name">{p.name}</p>
                <span className={on ? "sm-rep-status sm-rep-on" : "sm-rep-status"}>{on ? "Connected" : r?.key_prefix ? "Off" : "Not set up"}</span>
              </div>
              {r?.key_prefix && <p className="font-mono text-[11px] text-muted-foreground">Key {r.key_prefix}… · {r.last_used_at ? `last read ${new Date(r.last_used_at).toLocaleString()}` : "not used yet"}</p>}
              {isAdmin ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button className="sm-src-btn" disabled={busy === p.key} onClick={() => createKey(p)}>{busy === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : r?.key_prefix ? <KeyRound className="h-4 w-4" /> : null}{r?.key_prefix ? "New key" : "Connect"}</Button>
                  {r?.key_prefix && <Button variant="outline" className="sm-src-btn-soft" onClick={() => toggle(p.key, !r.enabled)}>{r.enabled ? "Turn off" : "Turn on"}</Button>}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center">An admin can connect this.</p>}
            </article>
          );
        })}
      </div>
      <Dialog open={!!issued} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{issued?.name} key</DialogTitle><DialogDescription>Copy this now — it won't be shown again. Creating a new key replaces this one.</DialogDescription></DialogHeader>
          {issued && (
            <div className="space-y-3 text-sm">
              {[["Key", issued.key], ["CSV link", `${FEED}?format=csv&days=90&key=${issued.key}`], ["JSON link", `${FEED}?days=90&key=${issued.key}`]].map(([l, v]) => (
                <div key={l} className="space-y-1"><p className="text-xs font-medium">{l}</p>
                  <div className="flex gap-2"><code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">{v}</code><Button size="icon" variant="outline" onClick={() => copy(v)} aria-label={`Copy ${l}`}><Copy className="h-3.5 w-3.5" /></Button></div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{issued.how} You can also send the key as a "Bearer" Authorization header. Change days= (up to 730) for a longer history.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
