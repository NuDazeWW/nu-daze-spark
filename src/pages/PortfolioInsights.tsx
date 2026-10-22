import { PageHeader } from "@/components/shared/PageHeader";
import { InsightsHeaderActions } from "@/components/insights/InsightsHeaderActions";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePostCards } from "@/hooks/usePostCards";
import { useActiveClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { AlertTriangle, CheckCircle2, PieChart } from "lucide-react";

const LIVE = ["approved", "exported", "posted"];
const DAY = 86400000;

function Bar({ label, value, max, extra }: { label: React.ReactNode; value: number; max: number; extra?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm"><span className="flex items-center gap-2 capitalize">{label}</span><span className="font-mono text-xs text-muted-foreground">{value}{extra}</span></div>
      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>
    </div>
  );
}

export default function PortfolioInsights() {
  const { cards, isLoading } = usePostCards();
  const { activeClientId } = useActiveClient();
  const { data: targets = [] } = useQuery({
    queryKey: ["cadence-targets", activeClientId],
    queryFn: async () => {
      let q = supabase.from("cadence_targets").select("platform, content_type, weekly_target").eq("is_active", true);
      if (activeClientId) q = q.eq("client_id", activeClientId);
      const { data } = await q; return data ?? [];
    },
  });

  const s = useMemo(() => {
    const since = Date.now() - 30 * DAY;
    const recent = cards.filter((c) => !c.is_sample && new Date(c.created_at).getTime() >= since);
    const count = (key: (c: typeof cards[number]) => string | null | undefined) => {
      const m = new Map<string, number>();
      recent.forEach((c) => { const k = key(c) || "Unassigned"; m.set(k, (m.get(k) ?? 0) + 1); });
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const pillars = count((c) => c.campaign_pillar);
    const platforms = count((c) => c.platform);
    const types = count((c) => c.content_type);
    const statuses = count((c) => c.approval_status);
    const weekStart = Date.now() - 7 * DAY;
    const nextWeek = Date.now() + 7 * DAY;
    const gaps = targets.map((t) => {
      const have = cards.filter((c) => !c.is_sample && c.platform === t.platform && c.content_type === t.content_type && LIVE.includes(c.approval_status) &&
        ((c.scheduled_for && new Date(c.scheduled_for).getTime() <= nextWeek && new Date(c.scheduled_for).getTime() >= Date.now()) || new Date(c.updated_at).getTime() >= weekStart)).length;
      return { ...t, have, short: Math.max(0, t.weekly_target - have) };
    }).sort((a, b) => b.short - a.short);
    const total = recent.length;
    const top = pillars[0];
    const insights: string[] = [];
    if (top && total >= 4 && top[1] / total > 0.5) insights.push(`"${top[0]}" makes up ${Math.round((top[1] / total) * 100)}% of recent content — consider balancing other pillars.`);
    platforms.filter(([, n]) => n <= 1).forEach(([p]) => insights.push(`${PLATFORM_LABEL[p] ?? p} has had little or no content in 30 days.`));
    const stuck = recent.filter((c) => c.approval_status === "in_review" && Date.now() - new Date(c.updated_at).getTime() > 3 * DAY).length;
    if (stuck) insights.push(`${stuck} post${stuck > 1 ? "s have" : " has"} been waiting in review for over 3 days.`);
    const unassigned = pillars.find(([k]) => k === "Unassigned");
    if (unassigned) insights.push(`${unassigned[1]} post${unassigned[1] > 1 ? "s have" : " has"} no content pillar, which hides them from strategy tracking.`);
    return { total, pillars, platforms, types, statuses, gaps, insights };
  }, [cards, targets]);

  const max = (rows: [string, number][]) => Math.max(1, ...rows.map((r) => r[1]));
  const metrics = [
    { id: "posts", label: "Posts (30 days)", value: s.total, accent: "cyan" },
    { id: "pillars", label: "Pillars in use", value: s.pillars.filter(([k]) => k !== "Unassigned").length, accent: "violet" },
    { id: "platforms", label: "Platforms active", value: s.platforms.length, accent: "magenta" },
    { id: "gaps", label: "Weekly gaps", value: s.gaps.filter((g) => g.short > 0).length, accent: "gold" },
  ] as const;

  return (
    <div className="sm-reference sm-insights space-y-6">
      <PageHeader title="Portfolio Insights" description="How your content is balanced across pillars, platforms and formats over the last 30 days — and where you're falling short this week.">
        <InsightsHeaderActions />
      </PageHeader>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          <div className="sm-metric-row grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ id, label, value, accent }) => (
              <Card key={id} accent={accent} emphasis="standard" className="sm-metric"><CardContent className="py-5"><div className="text-xs text-muted-foreground">{label}</div><div className="text-3xl font-semibold font-display tabular-nums mt-2">{value}</div></CardContent></Card>
            ))}
          </div>
          <Card accent="gold" emphasis="featured" className="sm-insights-action">
            <CardHeader><CardTitle className="text-base">What to act on</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {s.insights.length ? s.insights.map((i) => <p key={i} className="flex gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />{i}</p>)
                : <p className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success" /> Your portfolio looks balanced.</p>}
            </CardContent>
          </Card>
          <div className="sm-breakdowns grid gap-4 lg:grid-cols-3">
            <Card accent="violet" emphasis="standard"><CardHeader><CardTitle className="text-base">Content pillars</CardTitle></CardHeader>
              <CardContent className="space-y-3">{s.pillars.length ? s.pillars.map(([k, v]) => <Bar key={k} label={k} value={v} max={max(s.pillars)} />) : <p className="text-sm text-muted-foreground">No posts yet.</p>}</CardContent></Card>
            <Card accent="cyan" emphasis="standard"><CardHeader><CardTitle className="text-base">Platforms</CardTitle></CardHeader>
              <CardContent className="space-y-3">{s.platforms.map(([k, v]) => <Bar key={k} label={<><PlatformIcon platform={k} className="h-4 w-4" />{PLATFORM_LABEL[k] ?? k}</>} value={v} max={max(s.platforms)} />)}</CardContent></Card>
            <Card accent="magenta" emphasis="standard"><CardHeader><CardTitle className="text-base">Formats & status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {s.types.map(([k, v]) => <Bar key={k} label={k} value={v} max={max(s.types)} />)}
                <div className="flex flex-wrap gap-1.5 pt-2">{s.statuses.map(([k, v]) => <Badge key={k} variant="outline" className="capitalize">{k.replace("_", " ")} · {v}</Badge>)}</div>
              </CardContent></Card>
          </div>
          <Card accent="gold" emphasis="standard">
            <CardHeader><CardTitle className="text-base">This week vs. cadence targets</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {s.gaps.length ? s.gaps.map((g) => (
                <div key={`${g.platform}-${g.content_type}`} className="flex items-center gap-3">
                  <PlatformIcon platform={g.platform} className="h-4 w-4" />
                  <div className="flex-1"><Bar label={`${PLATFORM_LABEL[g.platform] ?? g.platform} ${g.content_type}`} value={g.have} max={g.weekly_target} extra={` / ${g.weekly_target}`} /></div>
                  {g.short > 0 ? <Badge variant="outline" className="border-warning text-warning">{g.short} short</Badge> : <Badge variant="outline" className="border-success text-success">On track</Badge>}
                </div>
              )) : <p className="text-sm text-muted-foreground">No cadence targets set. Add them in Strategy & Rules.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
