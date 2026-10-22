import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, Bookmark, ChevronDown, Eye, Heart, Mail, MessageCircle, MousePointerClick, Plug, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import powerBiLogo from "@/assets/logos/power-bi.svg";
import tableauLogo from "@/assets/logos/tableau.svg";
import sapLogo from "@/assets/logos/sap.svg";
import quickSightLogo from "@/assets/logos/quicksight.svg";

const METRICS = [
  { icon: Eye, name: "Impressions", desc: "How many times the post was shown on screen." },
  { icon: Heart, name: "Reactions", desc: "Likes and other reactions people left." },
  { icon: MessageCircle, name: "Comments", desc: "Replies people wrote on the post." },
  { icon: Share2, name: "Shares", desc: "Times the post was reposted or sent on." },
  { icon: MousePointerClick, name: "Clicks", desc: "Clicks on links, the profile or the post itself." },
  { icon: Bookmark, name: "Saves", desc: "Times people saved the post for later." },
];
const WINDOWS = [7, 30, 60, 90];
const PROVIDERS: Record<string, { name: string; logo?: string }> = {
  tableau: { name: "Tableau", logo: tableauLogo }, sap: { name: "SAP Analytics Cloud", logo: sapLogo },
  power_bi: { name: "Power BI", logo: powerBiLogo }, sigma: { name: "Sigma" }, quicksight: { name: "Amazon QuickSight", logo: quickSightLogo },
};
const NOTIF = "/settings/notifications";

type Pref = { id: string; email?: string; time_zone?: string; is_active?: boolean; daily_digest?: boolean; weekly_summary?: boolean; report_frequency?: string | null };

export function InsightsHeaderActions() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const { data: connectors = [] } = useQuery({
    queryKey: ["insights-live-connectors"],
    queryFn: async () => ((await supabase.from("reporting_connectors" as never).select("provider,enabled")).data ?? []) as { provider: string; enabled: boolean }[],
  });
  const { data: prefs = [] } = useQuery({
    queryKey: ["insights-summaries"],
    queryFn: async () => ((await supabase.from("notification_preferences").select("*")).data ?? []) as unknown as Pref[],
  });
  const live = connectors.filter((c) => c.enabled);
  const summaries = prefs.filter((p) => p.is_active !== false).flatMap((p) => {
    const who = [p.email, p.time_zone].filter(Boolean).join(" · ");
    const out: { key: string; label: string; who: string }[] = [];
    if (p.daily_digest) out.push({ key: p.id + "d", label: "Daily digest", who });
    if (p.weekly_summary) out.push({ key: p.id + "w", label: "Weekly summary", who });
    if (p.report_frequency && p.report_frequency !== "off") out.push({ key: p.id + "r", label: `Scheduled report (${p.report_frequency})`, who });
    return out;
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => setOpen(true)}>
        <Activity className="mr-1.5 h-4 w-4" />Capture
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <Plug className="mr-1.5 h-4 w-4" />Live Connectors
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">{live.length + 1}</Badge>
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Connected reporting tools</DropdownMenuLabel>
          {live.map((c) => {
            const p = PROVIDERS[c.provider] ?? { name: c.provider };
            return (
              <DropdownMenuItem key={c.provider} onClick={() => nav("/sources#reporting-connectors")}>
                {p.logo ? <img src={p.logo} alt="" className="mr-2 h-4 w-4" /> : <BarChart3 className="mr-2 h-4 w-4" />}{p.name}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem onClick={() => toast("Demo connector — not linked")}>
            <img src={powerBiLogo} alt="" className="mr-2 h-4 w-4" />Power BI
            <Badge variant="outline" className="ml-auto text-[10px]">Demo</Badge>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/sources#reporting-connectors">Manage connectors</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <Mail className="mr-1.5 h-4 w-4" />Summaries<ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Email summaries turned on</DropdownMenuLabel>
          {summaries.length === 0 ? (
            <div className="space-y-2 px-2 py-2">
              <p className="text-sm text-muted-foreground">No email summaries are turned on.</p>
              <Button size="sm" className="w-full" onClick={() => nav(NOTIF)}>Turn on summaries</Button>
            </div>
          ) : summaries.map((s) => (
            <DropdownMenuItem key={s.key} onClick={() => nav(NOTIF)} className="flex-col items-start">
              <span className="font-medium">{s.label}</span>
              {s.who && <span className="text-xs text-muted-foreground">{s.who}</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to={NOTIF}>Manage summaries</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm-luminous-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>What we capture</DialogTitle>
            <DialogDescription>Totals are summed across the last {days} days per post and platform.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            {WINDOWS.map((w) => (
              <Button key={w} size="sm" variant={w === days ? "default" : "outline"} onClick={() => setDays(w)}>{w} days</Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {METRICS.map(({ icon: Icon, name, desc }) => (
              <div key={name} className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0"><p className="font-medium">{name}</p><p className="text-sm text-muted-foreground">{desc}</p></div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
