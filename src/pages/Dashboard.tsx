import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExpirationAlerts } from "@/components/assets/ExpirationAlerts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles, MessageSquare, Upload, CalendarDays,
  TrendingUp, ArrowRight, Linkedin, Instagram,
} from "lucide-react";

const PLATFORM_ICON: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  instagram: Instagram,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Drafts", color: "bg-muted text-muted-foreground" },
  in_review: { label: "In Review", color: "bg-primary/20 text-primary" },
  needs_revision: { label: "Needs Revision", color: "bg-accent/20 text-accent" },
  approved: { label: "Approved", color: "bg-emerald-500/20 text-emerald-400" },
  exported: { label: "Exported", color: "bg-blue-500/20 text-blue-400" },
  posted: { label: "Posted", color: "bg-violet-500/20 text-violet-400" },
  archived: { label: "Archived", color: "bg-muted text-muted-foreground" },
};

function cadenceColor(current: number, target: number) {
  if (target === 0) return "text-muted-foreground";
  const pct = current / target;
  if (pct >= 0.8) return "text-emerald-400";
  if (pct >= 0.4) return "text-accent";
  return "text-destructive";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { cadence, pipeline, comments, recentCards, isLoading } = useDashboardStats();

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your content operations at a glance."
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Generate Posts", icon: Sparkles, path: "/generator" },
          { label: "Find Comments", icon: MessageSquare, path: "/comments" },
          { label: "Upload Asset", icon: Upload, path: "/assets" },
          { label: "View Queue", icon: CalendarDays, path: "/queue" },
        ].map((a) => (
          <Button
            key={a.path}
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5"
            onClick={() => navigate(a.path)}
          >
            <a.icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{a.label}</span>
          </Button>
        ))}
      </div>

      <ExpirationAlerts />

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Weekly Cadence Tracker */}
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
                        <span className={cadenceColor(c.current_count, c.weekly_target)}>
                          {c.current_count}/{c.weekly_target}
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

          {/* Content Pipeline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Content Pipeline</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/queue")}>
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {pipeline
                  .filter((p) => p.status !== "archived")
                  .map((p) => {
                    const meta = STATUS_LABELS[p.status] ?? { label: p.status, color: "" };
                    return (
                      <button
                        key={p.status}
                        className="rounded-lg border border-border/50 p-3 text-center hover:border-primary/30 transition-colors"
                        onClick={() => navigate(`/queue?status=${p.status}`)}
                      >
                        <div className="text-2xl font-bold">{p.count}</div>
                        <Badge variant="outline" className={`text-[10px] mt-1 ${meta.color}`}>
                          {meta.label}
                        </Badge>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
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
                <div className="space-y-3">
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
