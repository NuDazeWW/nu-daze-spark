import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePostCards, type PostCard } from "@/hooks/usePostCards";
import { useActiveClient } from "@/contexts/ClientContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { postLabel } from "@/components/tracking/PostTracking";
import { PostingPackageDrawer } from "@/components/queue/PostingPackageDrawer";
import { CheckCircle2, Clock, AlertTriangle, Loader2, Send, Bell } from "lucide-react";

type Acc = { id: string; platform: string; account_name: string; connection_status: string };
type View = "upcoming" | "published" | "failed";

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  scheduled: { label: "Scheduled", cls: "border-primary text-primary", icon: Clock },
  publishing: { label: "Publishing", cls: "border-warning text-warning", icon: Loader2 },
  published: { label: "Published", cls: "border-success text-success", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "border-destructive text-destructive", icon: AlertTriangle },
};

const COMING_SOON = [
  { key: "tiktok", name: "TikTok", note: "Direct publishing to TikTok" },
  { key: "pinterest", name: "Pinterest", note: "Pins and idea boards" },
  { key: "threads", name: "Threads", note: "Text posts from Meta" },
];

export default function PublishingStatus() {
  const { cards, isLoading, isAdmin } = usePostCards();
  const { activeClientId } = useActiveClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState<View>("upcoming");
  const [openId, setOpenId] = useState<string | null>(null);

  const accounts = useQuery({
    queryKey: ["status_accounts", activeClientId],
    queryFn: async () => {
      let q = supabase.from("social_accounts").select("id,platform,account_name,connection_status");
      if (activeClientId) q = q.eq("client_id", activeClientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Acc[];
    },
  });
  const accMap = useMemo(() => new Map((accounts.data ?? []).map((a) => [a.id, a])), [accounts.data]);

  const settings = useQuery({
    queryKey: ["ws_spend"],
    queryFn: async () => (await supabase.from("workspace_settings").select("x_monthly_spend_cap_cents").maybeSingle()).data,
  });
  const notify = useQuery({
    queryKey: ["notify_me", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("notify_me").select("feature_key").eq("user_id", user!.id)).data ?? [],
  });

  const pub = (c: PostCard) => (c as PostCard & { publishing_status?: string }).publishing_status ?? "idle";
  const targets = (c: PostCard) => (c as PostCard & { target_account_ids?: string[] }).target_account_ids ?? [];

  const groups = useMemo(() => {
    const g: Record<View, PostCard[]> = { upcoming: [], published: [], failed: [] };
    for (const c of cards ?? []) {
      const s = pub(c);
      if (s === "scheduled" || s === "publishing") g.upcoming.push(c);
      else if (s === "published") g.published.push(c);
      else if (s === "failed") g.failed.push(c);
    }
    g.upcoming.sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""));
    g.published.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return g;
  }, [cards]);

  const xThisMonth = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return groups.published.filter((c) => c.updated_at.startsWith(m))
      .reduce((n, c) => n + targets(c).filter((id) => accMap.get(id)?.platform === "x").length, 0);
  }, [groups.published, accMap]);
  const capCents = settings.data?.x_monthly_spend_cap_cents ?? 0;
  const spentCents = xThisMonth * 1; // demo estimate: ~$0.01 per X post

  const joinWaitlist = async (key: string) => {
    if (!user?.email) return;
    const { error } = await supabase.from("notify_me").insert({ user_id: user.id, feature_key: key, email: user.email });
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    else { toast({ title: "You're on the list", description: `We'll email ${user.email} when it's ready.` }); qc.invalidateQueries({ queryKey: ["notify_me"] }); }
  };

  const list = groups[view];
  const openCard = (cards ?? []).find((c) => c.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Publishing Status</h1>
        <p className="text-sm text-muted-foreground">Every scheduled and sent post, with results for each channel. Demo mode: sending is simulated.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {([
          ["upcoming", "Upcoming", groups.upcoming.length, Clock],
          ["published", "Published", groups.published.length, CheckCircle2],
          ["failed", "Failed", groups.failed.length, AlertTriangle],
        ] as const).map(([k, label, n, Icon]) => (
          <Card key={k} className={`cursor-pointer ${view === k ? "ring-2 ring-primary" : ""}`} onClick={() => setView(k)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div><p className="text-2xl font-semibold">{n}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">X spend this month</p>
            <p className="text-2xl font-semibold font-mono">${(spentCents / 100).toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">{capCents ? `of $${(capCents / 100).toFixed(2)} cap` : "No cap set"} · {xThisMonth} post{xThisMonth === 1 ? "" : "s"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({groups.upcoming.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({groups.published.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({groups.failed.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : list.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          <Send className="h-6 w-6 mx-auto mb-2" />
          Nothing here yet. Open an approved post, go to the <b>Publish</b> tab, and schedule or publish it.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const s = pub(c); const meta = STATUS_META[s];
            const tgs = targets(c).map((id) => accMap.get(id)).filter(Boolean) as Acc[];
            return (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{postLabel(c)}</span>
                        {meta && <Badge variant="outline" className={meta.cls}><meta.icon className={`h-3 w-3 mr-1 ${s === "publishing" ? "animate-spin" : ""}`} />{meta.label}</Badge>}
                        {c.scheduled_for && <span className="text-xs text-muted-foreground">{new Date(c.scheduled_for).toLocaleString()}</span>}
                      </div>
                      <p className="text-sm line-clamp-2">{c.draft_copy}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setOpenId(c.id)}>Open package</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tgs.length === 0 && <span className="text-xs text-muted-foreground">No channels selected</span>}
                    {tgs.map((a) => {
                      const ok = s === "published" && a.connection_status === "connected";
                      const failed = s === "failed" || (s === "published" && a.connection_status !== "connected");
                      return (
                        <div key={a.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
                          <PlatformIcon platform={a.platform} className="h-3.5 w-3.5" />
                          <span>{PLATFORM_LABEL[a.platform] ?? a.platform}</span>
                          <span className={ok ? "text-success" : failed ? "text-destructive" : "text-muted-foreground"}>
                            {ok ? "✓ Sent" : failed ? "Account not connected" : s === "publishing" ? "Sending…" : "Queued"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Coming soon</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {COMING_SOON.map((f) => {
            const joined = (notify.data ?? []).some((n) => n.feature_key === f.key);
            return (
              <Card key={f.key}><CardContent className="p-4 space-y-2">
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.note}</p>
                <Button size="sm" variant="outline" disabled={joined} onClick={() => joinWaitlist(f.key)}>
                  <Bell className="h-3.5 w-3.5 mr-1" />{joined ? "You'll be notified" : "Notify me"}
                </Button>
              </CardContent></Card>
            );
          })}
        </div>
      </div>

      <PostingPackageDrawer card={openCard} open={!!openCard} onOpenChange={(o) => !o && setOpenId(null)} canExport={isAdmin} />
    </div>
  );
}
