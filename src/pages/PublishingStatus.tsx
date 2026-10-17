import { PageHeader } from "@/components/shared/PageHeader";
import { PipelineNav } from "@/components/queue/PipelineNav";
import { TikTokMark, PinterestMark, ThreadsMark } from "@/components/publishing/PlatformMarks";
import { PostResultsButton } from "@/components/publishing/PostResultsButton";
import phoneTiktok from "@/assets/pub-phone-tiktok.jpg";
import phonePinterest from "@/assets/pub-phone-pinterest.jpg";
import phoneThreads from "@/assets/pub-phone-threads.jpg";
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
import { CheckCircle2, Clock, AlertTriangle, Loader2, Send, Bell, Coins, CalendarDays, ArrowRight, FileDown } from "lucide-react";
import { PublishingReportDialog } from "@/components/publishing/PublishingReportDialog";

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
  const [reportOpen, setReportOpen] = useState(false);
  const company = useQuery({
    queryKey: ["ws_company_name"],
    queryFn: async () => (await supabase.from("workspace_settings").select("company_name").maybeSingle()).data,
  });

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

  const Bars = ({ h }: { h: number[] }) => <span className="pub-bars" aria-hidden>{h.map((v, i) => <i key={i} style={{ height: v }} />)}</span>;
  const SUMMARY = [
    { k: "upcoming" as View, label: "Upcoming", n: groups.upcoming.length, Icon: Clock, a: "265 85% 68%", hint: "Scheduled posts waiting to be sent", bars: [14, 24, 30, 40, 34, 48] },
    { k: "published" as View, label: "Published", n: groups.published.length, Icon: CheckCircle2, a: "172 80% 50%", hint: "Successfully sent posts across all channels", bars: [16, 28, 40, 26, 34, 44] },
    { k: "failed" as View, label: "Failed", n: groups.failed.length, Icon: AlertTriangle, a: "350 85% 62%", hint: "Posts that failed to publish", bars: [18, 28, 20, 34, 42, 50] },
  ];
  const SOON_STYLE: Record<string, { b: string; mark: JSX.Element; art: string; copy: string }> = {
    tiktok: { b: "330 85% 58%", mark: <TikTokMark />, art: phoneTiktok, copy: "Reach new audiences with short-form video content." },
    pinterest: { b: "20 85% 60%", mark: <PinterestMark />, art: phonePinterest, copy: "Automatically publish to your boards and grow your audience." },
    threads: { b: "280 75% 62%", mark: <ThreadsMark />, art: phoneThreads, copy: "Share conversations and ideas on Threads, automatically." },
  };

  return (
    <div className="pub-stage -m-4 md:-m-6 lg:-m-8 space-y-6">
      <PageHeader title="Publishing Status" description="Every scheduled and sent post, with results for each channel.">
        <button type="button" className="pub-notify !py-2 !text-sm" onClick={() => setReportOpen(true)}><FileDown className="h-4 w-4" />Export report</button>
      </PageHeader>
      <PipelineNav />
      <PublishingReportDialog open={reportOpen} onOpenChange={setReportOpen} cards={cards ?? []} companyName={company.data?.company_name} />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY.map(({ k, label, n, Icon, a, hint, bars }) => (
          <button key={k} type="button" className="pub-card" style={{ ["--a" as string]: a }} onClick={() => setView(k)} aria-pressed={view === k}>
            <span className="pub-well"><Icon className="h-7 w-7" /></span>
            <span className="min-w-0 pr-12"><span className="pub-val block">{n}</span><span className="pub-lbl block">{label}</span><span className="pub-hint block">{hint}</span></span>
            <Bars h={bars} />
          </button>
        ))}
        <div className="pub-card" style={{ ["--a" as string]: "40 90% 60%" }}>
          <span className="pub-well"><Coins className="h-7 w-7" /></span>
          <span className="min-w-0 pr-12">
            <span className="block text-sm" style={{ color: "hsl(230 20% 85%)" }}>X spend this month</span>
            <span className="pub-val block mt-1">${(spentCents / 100).toFixed(2)}</span>
            <span className="pub-hint block">{capCents ? `of $${(capCents / 100).toFixed(2)} cap` : "No cap set"} · {xThisMonth} post{xThisMonth === 1 ? "" : "s"}</span>
          </span>
          <Bars h={[16, 26, 34, 42, 50]} />
        </div>
      </div>

      <div role="tablist" aria-label="Publishing status" className="pub-seg">
        {([["upcoming", "Upcoming", CalendarDays], ["published", "Published", CheckCircle2], ["failed", "Failed", AlertTriangle]] as const).map(([k, label, Icon]) => (
          <button key={k} role="tab" type="button" aria-selected={view === k} onClick={() => setView(k)}>
            <Icon className="h-4 w-4" />{label} ({groups[k].length})
          </button>
        ))}
      </div>

      {isLoading ? <div className="pub-panel p-8 text-sm" style={{ color: "hsl(230 20% 78%)" }}>Loading…</div> : list.length === 0 ? (
        <div className="pub-panel pub-panel-empty">
          <div className="relative z-10">
            <div className="pub-rings"><i /><i /><Send className="h-9 w-9" /></div>
            <p className="font-display text-2xl font-semibold">Nothing here yet.</p>
            <p className="mt-2 text-[15px]" style={{ color: "hsl(230 20% 78%)" }}>Open an approved post, go to the <b style={{ color: "hsl(0 0% 100%)" }}>Publish</b> tab, and schedule or publish it.</p>
          </div>
        </div>
      ) : (
        <div className="pub-panel p-4 space-y-3">
          {list.map((c) => {
            const s = pub(c); const meta = STATUS_META[s];
            const tgs = targets(c).map((id) => accMap.get(id)).filter(Boolean) as Acc[];
            return (
              <div key={c.id} className="pub-row space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs" style={{ color: "hsl(230 20% 72%)" }}>{postLabel(c)}</span>
                      {meta && <Badge variant="outline" className={meta.cls}><meta.icon className={`h-3 w-3 mr-1 ${s === "publishing" ? "animate-spin" : ""}`} />{meta.label}</Badge>}
                      {c.scheduled_for && <span className="text-xs" style={{ color: "hsl(230 20% 72%)" }}>{new Date(c.scheduled_for).toLocaleString()}</span>}
                    </div>
                    <p className="text-sm line-clamp-2">{c.draft_copy}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(s === "published" || c.approval_status === "posted") && <PostResultsButton postId={c.id} clientId={c.client_id} className="pub-notify !py-2 !text-sm" />}
                    <button type="button" className="pub-notify !py-2 !text-sm" onClick={() => setOpenId(c.id)}>Open package</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tgs.length === 0 && <span className="text-xs" style={{ color: "hsl(230 20% 72%)" }}>No channels selected</span>}
                  {tgs.map((a) => {
                    const ok = s === "published" && a.connection_status === "connected";
                    const failed = s === "failed" || (s === "published" && a.connection_status !== "connected");
                    return (
                      <div key={a.id} className="pub-chip">
                        <PlatformIcon platform={a.platform} className="h-3.5 w-3.5" />
                        <span>{PLATFORM_LABEL[a.platform] ?? a.platform}</span>
                        <span className={ok ? "text-success" : failed ? "text-destructive" : ""}>
                          {ok ? "✓ Sent" : failed ? "Account not connected" : s === "publishing" ? "Sending…" : "Queued"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="pub-h2">Coming soon</h2>
        <p className="mb-5 text-[15px]" style={{ color: "hsl(230 20% 78%)" }}>More channels are on the way. Be the first to know when they're available.</p>
        <div className="grid gap-5 md:grid-cols-3">
          {COMING_SOON.map((f) => {
            const joined = (notify.data ?? []).some((n) => n.feature_key === f.key);
            const st = SOON_STYLE[f.key];
            return (
              <div key={f.key} className="pub-soon" style={{ ["--b" as string]: st.b }}>
                <img src={st.art} alt="" aria-hidden className="pub-art" loading="lazy" />
                <div className="relative z-10 flex gap-4 pr-[34%]">
                  <span className="pub-tile flex-none">{st.mark}</span>
                  <div>
                    <p className="font-display text-xl font-semibold whitespace-nowrap">{f.name}</p>
                    <p className="text-[15px]" style={{ color: "hsl(230 20% 80%)" }}>{f.note}</p>
                    <p className="mt-2 text-[13px] leading-snug" style={{ color: "hsl(230 20% 72%)" }}>{st.copy}</p>
                  </div>
                </div>
                <button type="button" className="pub-notify relative z-10 mt-5" disabled={joined} onClick={() => joinWaitlist(f.key)}>
                  <Bell className="h-4 w-4" />{joined ? "You'll be notified" : "Notify me"}<ArrowRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <PostingPackageDrawer card={openCard} open={!!openCard} onOpenChange={(o) => !o && setOpenId(null)} canExport={isAdmin} onMarkExported={async (id) => { await supabase.from("post_cards").update({ approval_status: "exported" } as never).eq("id", id); qc.invalidateQueries({ queryKey: ["post_cards"] }); }} />
    </div>
  );
}
