import { STATUS_META } from "@/hooks/usePostCards";
import headerBird from "@/assets/brand/socialmotive-header-bird.png.asset.json";
import { useMemo } from "react";
import { useDdiHandoff } from "@/hooks/useDdiHandoff";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { SetupChecklist } from "@/components/settings/SetupChecklist";
import { ReadinessPanel } from "@/components/dashboard/ReadinessPanel";
import { ExpirationAlerts } from "@/components/assets/ExpirationAlerts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sparkles, MessageSquare, Upload, CalendarDays,
  TrendingUp, TrendingDown, Minus, ArrowRight,
  Linkedin, Instagram, FileText, Image, FolderOpen,
  ShieldCheck, Eye, ShieldX, Archive, Info,
} from "lucide-react";

function PanelInfo({ description }: { description: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About this panel"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64 text-xs text-muted-foreground">
        {description}
      </PopoverContent>
    </Popover>
  );
}

const PLATFORM_ICON: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  instagram: Instagram,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = STATUS_META;
const PIPELINE_COLORS: Record<string, string> = Object.fromEntries(
  Object.keys(STATUS_META).map((status) => [status, `sm-pipeline sm-status-${status}`]),
);

const ASSET_HEALTH_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  generation_allowed: { label: "Usable", icon: ShieldCheck, color: "text-brand-success" },
  summarization_only: { label: "Summary Only", icon: Eye, color: "text-accent" },
  blocked: { label: "Blocked", icon: ShieldX, color: "text-destructive" },
  archived: { label: "Archived", icon: Archive, color: "text-muted-foreground" },
};

function cadenceColor(current: number, target: number) {
  if (target === 0) return "text-muted-foreground";
  const pct = current / target;
  if (pct >= 0.8) return "text-brand-success";
  if (pct >= 0.4) return "text-accent";
  return "text-destructive";
}

function WowIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (diff > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-0.5 text-brand-success text-[10px] font-medium">
            <TrendingUp className="h-3 w-3" />+{diff}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">vs last week ({previous})</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-destructive text-[10px] font-medium">
          <TrendingDown className="h-3 w-3" />{diff}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">vs last week ({previous})</TooltipContent>
    </Tooltip>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { cadence, pipeline, comments, recentCards, assetHealth, totalStats, isLoading } = useDashboardStats();
  const ddiContext = useDdiHandoff();

  const pipelineTotal = useMemo(
    () => pipeline.reduce((sum, p) => sum + p.count, 0),
    [pipeline]
  );

  return (
    <div className="sm-reference sm-dashboard animate-fade-in space-y-6">
      {ddiContext && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-3">
            <Badge variant="outline" className="border-primary text-primary">DDI Context</Badge>
            <span className="text-sm text-muted-foreground">
              Linked to entity <code className="text-primary font-mono text-xs">{ddiContext.entityId.slice(0, 12)}…</code>
              {ddiContext.surface && <> from <strong>{ddiContext.surface}</strong></>}
            </span>
          </CardContent>
        </Card>
      )}
      <div className="sm-dashboard-heading">
      <PageHeader
        title="Dashboard"
        description="Your content operations at a glance."
      />
      <div className="sm-dash-art" aria-hidden="true">
        <img src={headerBird.url} alt="" className="sm-dash-bird" />
        <p className="sm-dash-tagline">Turn strategy<br />into <span className="sm-dash-em-cyan">social</span> <span className="sm-dash-em-lime">momentum.</span></p>
      </div>
      </div>
      <SetupChecklist />
      <ReadinessPanel />

      {/* Total Stats Header */}
      <div className="sm-metric-row grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Posts This Week", value: totalStats.postsThisWeek, icon: FileText, tone: "cyan", bars: [3, 5, 2, 6, 4, 7, 5, 8, 6, 9] },
          { label: "Comments Today", value: totalStats.commentsToday, icon: MessageSquare, tone: "coral", bars: [2, 3, 5, 4, 6, 3, 7, 5, 8, 10] },
          { label: "Total Assets", value: totalStats.totalAssets, icon: Image, tone: "lime", bars: [4, 6, 3, 7, 5, 8, 4, 9, 6, 7] },
        ].map((s) => (
          <Card key={s.label} className={`sm-metric sm-tone-${s.tone}`}>
            <CardContent className="flex items-center gap-4 py-4 px-5">
              <div className="sm-icon-well">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{isLoading ? "–" : s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
              <div className="sm-kpi-bars" aria-hidden="true">
                {s.bars.map((h, i) => <span key={i} style={{ height: `${h * 10}%` }} />)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="sm-quick-actions grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Generate Posts", icon: Sparkles, path: "/generator", tone: "cyan" },
          { label: "Find Comments", icon: MessageSquare, path: "/comments", tone: "coral" },
          { label: "Upload Asset", icon: Upload, path: "/assets", tone: "gold" },
          { label: "View Queue", icon: CalendarDays, path: "/queue", tone: "violet" },
        ].map((a) => (
          <Button
            key={a.path}
            variant="outline"
            className={`sm-qa sm-tone-${a.tone} h-auto min-h-[52px] py-3 px-5 flex flex-row justify-start gap-4`}
            onClick={() => navigate(a.path)}
          >
            <a.icon className="h-6 w-6" />
            <span className="text-[15px] font-bold">{a.label}</span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
          </Button>
        ))}
      </div>


      <ExpirationAlerts />

      {isLoading ? (
        <div className="sm-dashboard-panels grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="sm-dashboard-panels grid md:grid-cols-2 gap-4">
          {/* Weekly Cadence Tracker with WoW */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Weekly Cadence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cadence.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No cadence targets set.{" "}
                  <button className="text-primary hover:underline" onClick={() => navigate("/strategy")}>
                    Configure targets →
                  </button>
                </p>
              ) : (
                cadence.map((c) => {
                  const Icon = PLATFORM_ICON[c.platform];
                  const pct = c.weekly_target > 0 ? Math.min((c.current_count / c.weekly_target) * 100, 100) : 0;
                  return (
                    <div key={`${c.platform}-${c.content_type}`} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className="capitalize">{c.platform}</span>
                          <span className="text-muted-foreground capitalize">· {c.content_type}s</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <WowIndicator current={c.current_count} previous={c.last_week_count} />
                          <span className={cadenceColor(c.current_count, c.weekly_target)}>
                            {c.current_count}/{c.weekly_target}
                          </span>
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Daily Comment Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Daily Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No engagement targets set.{" "}
                  <button className="text-primary hover:underline" onClick={() => navigate("/strategy")}>
                    Configure targets →
                  </button>
                </p>
              ) : (
                comments.map((c) => {
                  const Icon = PLATFORM_ICON[c.platform];
                  const pct = c.daily_target > 0 ? Math.min((c.current_count / c.daily_target) * 100, 100) : 0;
                  return (
                    <div key={c.platform} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className="capitalize">{c.platform}</span>
                        </span>
                        <span className={cadenceColor(c.current_count, c.daily_target)}>
                          {c.current_count}/{c.daily_target}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Content Pipeline Chart */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Content Pipeline</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/queue")}>
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stacked bar */}
              {pipelineTotal > 0 ? (
                <>
                  <div className="flex h-5 rounded-full overflow-hidden bg-secondary">
                    {pipeline
                      .filter((p) => p.count > 0)
                      .map((p) => (
                        <Tooltip key={p.status}>
                          <TooltipTrigger asChild>
                            <div
                              className={`${PIPELINE_COLORS[p.status] ?? "bg-muted"} transition-all cursor-pointer hover:opacity-80`}
                              style={{ width: `${(p.count / pipelineTotal) * 100}%` }}
                              onClick={() => navigate(`/queue?status=${p.status}`)}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {STATUS_LABELS[p.status]?.label}: {p.count}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {pipeline
                      .filter((p) => p.count > 0)
                      .map((p) => {
                        const meta = STATUS_LABELS[p.status];
                        return (
                          <button
                            key={p.status}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => navigate(`/queue?status=${p.status}`)}
                          >
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${PIPELINE_COLORS[p.status]}`} />
                            {meta?.label} ({p.count})
                          </button>
                        );
                      })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No post cards yet. Generate your first batch!</p>
              )}
            </CardContent>
          </Card>

          {/* Asset Library Health */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Asset Health
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/assets")}>
                  Library <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {assetHealth.map((a) => {
                  const meta = ASSET_HEALTH_META[a.permission_state];
                  if (!meta) return null;
                  return (
                    <div
                      key={a.permission_state}
                      className="flex items-center gap-3 rounded-lg border border-border/40 p-3"
                    >
                      <meta.icon className={`h-4 w-4 ${meta.color}`} />
                      <div>
                        <div className="text-lg font-bold">{a.count}</div>
                        <div className="text-[11px] text-muted-foreground">{meta.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/queue")}>
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentCards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No post cards yet. Generate your first batch!</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {recentCards.map((card) => {
                    const Icon = PLATFORM_ICON[card.platform];
                    const meta = STATUS_LABELS[card.approval_status] ?? { label: card.approval_status, color: "" };
                    return (
                      <div
                        key={card.id}
                        className="flex items-start gap-3 rounded-md border border-border/30 p-2.5 hover:border-border/60 transition-colors cursor-pointer"
                        onClick={() => navigate("/queue")}
                      >
                        <div className="mt-0.5">
                          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{card.draft_copy.slice(0, 80)}…</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                              {meta.label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground capitalize">{card.content_type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
