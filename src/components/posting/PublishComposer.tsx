import { deliveryLabel } from "@/lib/deliveryPresentation";
import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { readPackageDraft, writePackageDraft } from "@/lib/packageDrafts";
import { useReadiness } from "@/hooks/useReadiness";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostCard } from "@/hooks/usePostCards";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { XLinkMeter } from "@/components/billing/XLinkMeter";
import { precheckUsage, URL_RE } from "@/hooks/useBilling";
import { useWorkspace } from "@/hooks/useWorkspace";
import { OpenPlatformButton } from "@/components/posting/OpenPlatformButton";
import { PostResultsButton } from "@/components/publishing/PostResultsButton";
import { formatHashtags, outboundText } from "@/lib/contentPresentation";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CalendarClock, CheckCircle2, Clock, Loader2, Send, Sparkles, AlertTriangle, Link2, Copy } from "lucide-react";

type Account = { id: string; platform: string; account_name: string; handle: string | null; connection_status: string };

const LIMITS: Record<string, { chars: number; tags: number; label: string }> = {
  linkedin: { chars: 3000, tags: 5, label: "LinkedIn" },
  instagram: { chars: 2200, tags: 30, label: "Instagram" },
  facebook: { chars: 63206, tags: 10, label: "Facebook" },
  x: { chars: 280, tags: 3, label: "X" },
  youtube: { chars: 5000, tags: 15, label: "YouTube" },
};

const BEST_TIMES: Record<string, string[]> = {
  linkedin: ["08:30", "12:00", "17:30"],
  instagram: ["11:00", "13:00", "19:00"],
  facebook: ["09:00", "13:00", "15:00"],
  x: ["08:00", "12:00", "18:00"],
  youtube: ["14:00", "16:00", "20:00"],
};

const TIMEZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "UTC"];

const STATUS_STYLE: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  scheduled: "bg-primary/10 text-primary",
  publishing: "bg-accent/20 text-foreground",
  published: "bg-primary text-primary-foreground",
  failed: "bg-destructive/15 text-destructive",
};

function pad(n: number) { return String(n).padStart(2, "0"); }

export function PublishComposer({ card, canPublish, initialMode = "now" }: { card: PostCard; canPublish: boolean; initialMode?: "now" | "schedule" | "manual" }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const draftKey = `${user?.id}:${card.client_id}:${card.id}:publish`;
  const locked = useRef(false);
  const readiness = useReadiness(card);
  const outcomes = useQuery({ queryKey: ["delivery_operations", card.id, card.updated_at], queryFn: async () => { const { data, error } = await supabase.from("delivery_operations").select("*").eq("post_card_id", card.id).order("created_at"); if (error) throw error; return data ?? []; } });
  const qc = useQueryClient();
  const c = card as PostCard & { target_account_ids?: string[]; publishing_status?: string; timezone?: string; apply_ai_disclosure?: boolean };

  const accounts = useQuery({
    queryKey: ["publish_accounts", card.client_id],
    enabled: !!card.client_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("social_accounts")
        .select("id,platform,account_name,handle,connection_status").eq("client_id", card.client_id ?? "").eq("is_active", true).order("platform");
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const [mode, setMode] = useState<"now" | "schedule" | "manual">(initialMode);
  useEffect(() => setMode(initialMode), [initialMode]);
  const [justPublished, setJustPublished] = useState<string[] | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [tz, setTz] = useState(c.timezone || "America/New_York");
  const [disclosure, setDisclosure] = useState(!!c.apply_ai_disclosure);
  const [confirm, setConfirm] = useState<null | "now" | "schedule">(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const status = card.delivery_status !== "idle" ? card.delivery_status : c.publishing_status || "idle";
  const capabilities = useQuery({ queryKey: ["delivery_capabilities"], queryFn: async () => { const { data, error } = await supabase.from("delivery_capabilities").select("*"); if (error) throw error; return data ?? []; } });

  useEffect(() => {
    const saved = readPackageDraft<{ targets?: string[]; date?: string; time?: string; tz?: string; disclosure?: boolean }>(draftKey, {});
    setTargets(saved.targets ?? c.target_account_ids ?? []);
    if (saved.date) { setDate(saved.date); setTime(saved.time ?? "09:00"); setTz(saved.tz ?? "UTC"); setDisclosure(saved.disclosure ?? false); return; }
    const d = card.scheduled_for ? new Date(card.scheduled_for) : new Date(Date.now() + 86400000);
    setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    if (card.scheduled_for) setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    else setTime(BEST_TIMES[card.platform]?.[0] ?? "09:00");
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!readPackageDraft<{ targets?: string[] }>(draftKey, {}).targets?.length && !c.target_account_ids?.length && accounts.data) {
      setTargets(accounts.data.filter((a) => a.platform === card.platform && a.connection_status === "connected").map((a) => a.id));
    }
  }, [accounts.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (date) writePackageDraft(draftKey, { targets, date, time, tz, disclosure }); }, [draftKey, targets, date, time, tz, disclosure]);

  const selected = useMemo(() => (accounts.data ?? []).filter((a) => targets.includes(a.id)), [accounts.data, targets]);
  const canSend = (platform: string) => capabilities.data?.some(c => c.platform === platform && c.live_enabled && c.dispatch_ready && c.verified_at) ?? false;
  const allLive = selected.length > 0 && selected.every(a => canSend(a.platform));
  const actionLabel = allLive ? "Publish live now" : "Stage for delivery";
  const copy = card.draft_copy + (disclosure ? "\n\n#AIassisted" : "");
  const tagCount = (card.hashtags ?? []).length;
  const { approvalRequired } = useWorkspace();
  const isApproved = !approvalRequired || ["approved", "exported", "posted"].includes(card.approval_status);

  const checks = selected.map((a) => {
    const lim = LIMITS[a.platform] ?? LIMITS.linkedin;
    const full = outboundText(card.draft_copy, card.hashtags, disclosure).length;
    return { a, lim, full, overChars: full > lim.chars, overTags: tagCount > lim.tags };
  });
  const blocking = checks.some((x) => x.overChars);

  const toggle = (id: string) => setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const run = async () => {
    if (locked.current) return;
    locked.current = true;
    const kind = confirm;
    setConfirm(null); setRunning(true);
    try {
      // Convert wall-clock input in the selected timezone, not the browser's timezone.
      let when: string | null = null;
      if (kind === "schedule") {
        const local = new Date(`${date}T${time}:00Z`);
        if (!Number.isFinite(local.getTime())) throw new Error("Pick a valid date and time. Your input was kept.");
        let epoch = local.getTime();
        for (let i = 0; i < 3; i++) {
          const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(epoch));
          const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
          const wall = Date.parse(`${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:00Z`);
          epoch += local.getTime() - wall;
        }
        if (epoch <= Date.now() + 60000) throw new Error("That time has passed. Pick a future time; your input was kept.");
        when = new Date(epoch).toISOString();
      }
      const { data, error } = await supabase.rpc("submit_delivery", { _post: card.id, _accounts: targets, _when: when ?? undefined, _timezone: tz, _disclosure: disclosure });
      if (error) throw error;
      const result = data as { status?: string };
      toast({ title: result.status === "scheduled" ? "Scheduled" : result.status === "partial" ? "Channel results differ" : "Staged — not sent", description: "Saved channel outcomes. No content was sent to a platform." });
      await qc.invalidateQueries({ queryKey: ["post_cards"] });
      qc.invalidateQueries({ queryKey: ["delivery_operations"] });
      qc.invalidateQueries({ queryKey: ["authoritative_readiness"] });
    } catch (e) {
      toast({ title: "Delivery was not saved", description: `${(e as Error).message}. Your input was kept.`, variant: "destructive" });
    } finally { locked.current = false; setRunning(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Publishing</p>
          <p className="text-xs text-muted-foreground">Pick channels, set the time, then publish or schedule.</p>
        </div>
        <Badge className={`capitalize ${STATUS_STYLE[status] ?? STATUS_STYLE.idle}`}>
          {status === "publishing" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          {status === "idle" ? "Not scheduled" : status === "published" ? "Delivery recorded · verification unavailable" : deliveryLabel(status)}
        </Badge>
      </div>

      <div role="tablist" aria-label="How to post" className="flex flex-wrap gap-1 rounded-lg border p-1">
        {([["now", actionLabel, Send], ["schedule", "Schedule", CalendarClock], ["manual", "Manual handoff", Copy]] as const).map(([m, label, Icon]) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        {mode === "now" ? allLive ? "Sends immediately to the accounts you picked." : "Saves this post for delivery. It will not be sent to a platform." : mode === "schedule" ? "Queues the post for the date and time you pick." : "Copy the post and open the platform to post it yourself."}
      </p>

      <p className="text-xs text-muted-foreground">{readiness.isError ? "Checks unavailable" : readiness.data?.label ?? "Checks pending"}</p>
      {outcomes.data?.map(o => <div key={o.id} className="rounded-md border p-3 text-xs"><b>{o.platform}</b> · {o.deliveryLabel(status)}<p className="text-muted-foreground">{o.reason}</p></div>)}
      {mode === "manual" ? (
        <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <OpenPlatformButton clientId={card.client_id} platform={card.platform} variant="default" size="default"
            copyText={outboundText(card.draft_copy, card.hashtags, disclosure)}
            label={`Copy post & open ${LIMITS[card.platform]?.label ?? card.platform}`} />
        </div>
        <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Copy the caption and hashtags, open the platform, paste and post. Mark it Posted when it's live.
        </p>
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Channels</Label>
            {accounts.isLoading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> :
              !(accounts.data ?? []).length ? (
                <p className="text-sm text-muted-foreground">No accounts yet. <Link to="/settings/connections" className="text-primary underline">Connect accounts</Link></p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(accounts.data ?? []).map((a) => {
                    const on = targets.includes(a.id);
                    const connected = a.connection_status === "connected";
                    return (
                      <button key={a.id} disabled={!connected} onClick={() => toggle(a.id)}
                        title={connected ? "" : "Connect this account first"}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                        <span className={`h-2 w-2 rounded-full ${connected ? "bg-primary" : "bg-muted-foreground/40"}`} />
                        <span className="font-semibold">{LIMITS[a.platform]?.label ?? a.platform}</span>
                        <span>{canSend(a.platform) ? "Live sending verified" : "Staging only"}</span>
                        <span className="text-muted-foreground">{a.handle ? `@${a.handle.replace(/^@/, "")}` : a.account_name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            {(accounts.data ?? []).some((a) => a.connection_status !== "connected") && (
              <Link to="/settings/connections" className="inline-flex items-center gap-1 text-xs text-primary"><Link2 className="h-3 w-3" /> Connect more accounts</Link>
            )}
          </section>

          {checks.length > 0 && (
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Platform checks</Label>
              {checks.map(({ a, lim, full, overChars, overTags }) => (
                <div key={a.id} className="space-y-1 rounded-lg border p-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{lim.label}</span>
                    <span className={overChars ? "text-destructive font-semibold" : "text-muted-foreground"}>{full.toLocaleString()} / {lim.chars.toLocaleString()} chars</span>
                  </div>
                  <Progress value={Math.min(100, (full / lim.chars) * 100)} className="h-1.5" />
                  <p className={`text-xs ${overTags ? "text-destructive" : "text-muted-foreground"}`}>
                    {tagCount} hashtags {overTags ? `· over the recommended ${lim.tags}` : `· within ${lim.tags}`}
                  </p>
                  {progress[a.id] !== undefined && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      {progress[a.id] >= 100 ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <Progress value={progress[a.id]} className="h-1.5 flex-1" />
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {mode === "schedule" && <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">When</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <select value={tz} onChange={(e) => setTz(e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
                {TIMEZONES.map((z) => <option key={z} value={z}>{z.replace("America/", "").replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Best times for {LIMITS[card.platform]?.label ?? card.platform}:
              {(BEST_TIMES[card.platform] ?? []).map((t) => (
                <button key={t} onClick={() => setTime(t)} className={`rounded border px-2 py-0.5 ${time === t ? "border-primary text-primary" : "hover:bg-muted"}`}>{t}</button>
              ))}
            </div>
          </section>}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Add AI-assisted disclosure</p>
              <p className="text-xs text-muted-foreground">Appends #AIassisted to the caption.</p>
            </div>
            <Switch checked={disclosure} onCheckedChange={setDisclosure} />
          </div>

          <XLinkMeter text={copy} xChannels={selected.filter((a) => a.platform === "x").length} />

          {!isApproved && (
            <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4" /> Approve this post before publishing or scheduling.
            </p>
          )}

          <Button className="w-full" disabled={!canPublish || card.is_sample || !isApproved || !selected.length || blocking || running || !readiness.data?.canDeliver}
            onClick={() => setConfirm(mode === "schedule" ? "schedule" : "now")}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : mode === "schedule" ? <CalendarClock className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {mode === "schedule" ? "Schedule post" : actionLabel}
          </Button>
          {status === "scheduled" && canPublish && <Button variant="outline" onClick={async () => { const { error } = await supabase.rpc("cancel_delivery_schedule", { _post: card.id }); if (error) toast({ title: "Could not cancel schedule", description: error.message, variant: "destructive" }); else { toast({ title: "Schedule canceled" }); qc.invalidateQueries({ queryKey: ["post_cards"] }); } }}>Cancel schedule</Button>}
          <p className="text-xs text-muted-foreground">Live sending isn't available yet: it needs approved platform apps, connected in Workspace Settings → Social Connections. Scheduled posts are staged, not sent.</p>
        </>
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "now" ? "Stage for delivery?" : "Schedule this post?"}</DialogTitle>
            <DialogDescription>
              {confirm === "now" ? "This saves the post for these channels. Nothing is sent to a platform:" : `Scheduled for ${date} ${time} (${tz}). Staged only; not sent. Channels:`}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm">
            {selected.map((a) => (
              <li key={a.id} className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" />
                <b>{LIMITS[a.platform]?.label}</b> {a.handle ? `@${a.handle.replace(/^@/, "")}` : a.account_name}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button onClick={run} disabled={running}>{confirm === "now" ? "Stage" : "Schedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
