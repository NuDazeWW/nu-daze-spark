import { formatHashtags } from "@/lib/contentPresentation";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, endOfDay, format, isToday, isTomorrow, startOfDay } from "date-fns";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Rocket, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePostCards, STATUS_META, type PostCard } from "@/hooks/usePostCards";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { OpenPlatformButton } from "@/components/posting/OpenPlatformButton";
import { postLabel } from "@/components/tracking/PostTracking";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const READY = ["approved", "exported"];
const fullCopy = (c: PostCard) =>
  [c.draft_copy, formatHashtags(c.hashtags)].filter(Boolean).join("\n\n");

/** Decision-first daily view: what needs a decision, what goes out next, what's at risk. */
export function ReadinessPanel() {
  const navigate = useNavigate();
  const { cards, comments, isLoading } = usePostCards() as any;
  const { user } = useAuth();
  const { activeClientId } = useActiveClient();

  // Latest Motive Score per post, to flag low-scoring drafts at a glance.
  const { data: lowScores = {} } = useQuery({
    queryKey: ["motive_scores", activeClientId],
    enabled: !!user && !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preflight_reviews")
        .select("post_card_id, motive_score, created_at")
        .eq("client_id", activeClientId!)
        .not("motive_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const latest: Record<string, number> = {};
      for (const r of data ?? []) if (!(r.post_card_id in latest)) latest[r.post_card_id] = r.motive_score!;
      return latest;
    },
  });

  const { decisions, ready, risks, lowScore, commentsWaiting } = useMemo(() => {
    const now = new Date();
    const tomorrowEnd = endOfDay(addDays(now, 1));
    const weekEnd = endOfDay(addDays(now, 7));
    const posts = (cards as PostCard[]).filter((c) => c.content_type !== "comment");
    const decisions = posts
      .filter((c) => c.approval_status === "in_review" || c.approval_status === "needs_revision")
      .sort((a, b) => (a.scheduled_for ?? "9").localeCompare(b.scheduled_for ?? "9"));
    const ready = posts
      .filter((c) => READY.includes(c.approval_status) && c.scheduled_for)
      .filter((c) => { const d = new Date(c.scheduled_for!); return d >= startOfDay(now) && d <= tomorrowEnd; })
      .sort((a, b) => a.scheduled_for!.localeCompare(b.scheduled_for!));
    const risks = posts
      .filter((c) => c.scheduled_for && !["approved", "exported", "posted", "archived"].includes(c.approval_status))
      .filter((c) => { const d = new Date(c.scheduled_for!); return d <= weekEnd; })
      .sort((a, b) => a.scheduled_for!.localeCompare(b.scheduled_for!));
    const lowScore = posts.filter((c) =>
      !["approved", "exported", "posted", "archived"].includes(c.approval_status) &&
      (lowScores[c.id] ?? 100) < 60 && !risks.some((r) => r.id === c.id));
    const commentsWaiting = (comments ?? []).filter((c: any) => c.approval_status === "draft" || c.approval_status === "in_review").length;
    return { decisions, ready, risks, lowScore, commentsWaiting };
  }, [cards, comments, lowScores]);

  if (isLoading) return null;

  const when = (iso: string) => {
    const d = new Date(iso);
    return `${isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEE MMM d")} · ${format(d, "h:mm a")}`;
  };

  return (
    <section aria-label="Today's readiness" className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Today at a glance</h2>
          <p className="text-sm text-muted-foreground">What needs a decision, what goes out next, and what's at risk.</p>
        </div>
        {commentsWaiting > 0 && (
          <Button variant="ghost" size="sm" onClick={() => navigate("/queue?type=comment")}>
            {commentsWaiting} comment{commentsWaiting === 1 ? "" : "s"} waiting <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Column icon={ClipboardCheck} title="Decisions needed" count={decisions.length} empty="Nothing waiting on a decision.">
          {decisions.slice(0, 6).map((c) => (
            <Row key={c.id} card={c} sub={c.scheduled_for ? when(c.scheduled_for) : "Not scheduled"}>
              <Button size="sm" variant="outline" onClick={() => navigate(`/queue?post=${c.id}`)}>Review</Button>
            </Row>
          ))}
          {decisions.length > 6 && <More n={decisions.length - 6} onClick={() => navigate("/queue?status=in_review")} />}
        </Column>

        <Column icon={Rocket} title="Ready to post · today & tomorrow" count={ready.length} empty="Nothing approved is scheduled for today or tomorrow.">
          {ready.map((c) => (
            <Row key={c.id} card={c} sub={when(c.scheduled_for!)}>
              <OpenPlatformButton clientId={c.client_id} platform={c.platform} copyText={fullCopy(c)} label="Copy & post" />
            </Row>
          ))}
        </Column>

        <Column icon={AlertTriangle} title="At risk · next 7 days" count={risks.length + lowScore.length} tone="risk" empty="Every scheduled post this week is approved.">
          {risks.slice(0, 6).map((c) => (
            <Row key={c.id} card={c} sub={`${when(c.scheduled_for!)} · not approved yet`}>
              <Button size="sm" variant="outline" onClick={() => navigate(`/queue?post=${c.id}`)}>Fix</Button>
            </Row>
          ))}
          {lowScore.slice(0, Math.max(0, 6 - risks.length)).map((c) => (
            <Row key={c.id} card={c} sub={`Motive Score ${lowScores[c.id]}/100 — needs stronger copy`}>
              <Button size="sm" variant="outline" onClick={() => navigate(`/queue?post=${c.id}`)}>Fix</Button>
            </Row>
          ))}
          {risks.length + lowScore.length > 6 && <More n={risks.length + lowScore.length - 6} onClick={() => navigate("/queue")} />}
        </Column>
      </div>
    </section>
  );
}

function Column({ icon: Icon, title, count, empty, tone, children }: {
  icon: React.ElementType; title: string; count: number; empty: string; tone?: "risk"; children: React.ReactNode;
}) {
  return (
    <Card className={tone === "risk" && count > 0 ? "border-destructive/40" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${tone === "risk" && count > 0 ? "text-destructive" : "text-primary"}`} />{title}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {count === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-success" />{empty}</p>
        ) : children}
      </CardContent>
    </Card>
  );
}

function Row({ card, sub, children }: { card: PostCard; sub: string; children: React.ReactNode }) {
  const meta = STATUS_META[card.approval_status];
  return (
    <div className="rounded-md border border-border/50 p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-mono text-[11px] font-semibold">{postLabel(card)}</span>
        <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
        <span className="text-[11px] text-muted-foreground">{cap(card.platform)} · {card.content_type}</span>
      </div>
      <p className="text-sm line-clamp-2">{card.draft_copy}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{sub}</span>
        {children}
      </div>
    </div>
  );
}

function More({ n, onClick }: { n: number; onClick: () => void }) {
  return <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onClick}>+{n} more <ArrowRight className="h-3 w-3 ml-1" /></Button>;
}
