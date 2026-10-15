import { useEffect, useMemo, useState } from "react";
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

export function PublishComposer({ card, canPublish }: { card: PostCard; canPublish: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const c = card as PostCard & { target_account_ids?: string[]; publishing_status?: string; timezone?: string; apply_ai_disclosure?: boolean };

  const accounts = useQuery({
    queryKey: ["publish_accounts", card.client_id],
    enabled: !!card.client_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("social_accounts")
        .select("id,platform,account_name,handle,connection_status").eq("client_id", card.client_id!).eq("is_active", true).order("platform");
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const [mode, setMode] = useState<"now" | "schedule" | "manual">("now");
  const [justPublished, setJustPublished] = useState<string[] | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [tz, setTz] = useState(c.timezone || "America/New_York");
  const [disclosure, setDisclosure] = useState(!!c.apply_ai_disclosure);
  const [confirm, setConfirm] = useState<null | "now" | "schedule">(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const status = c.publishing_status || "idle";

  useEffect(() => {
    setTargets(c.target_account_ids ?? []);
    const d = card.scheduled_for ? new Date(card.scheduled_for) : new Date(Date.now() + 86400000);
    setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    if (card.scheduled_for) setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    else setTime(BEST_TIMES[card.platform]?.[0] ?? "09:00");
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!c.target_account_ids?.length && accounts.data) {
      setTargets(accounts.data.filter((a) => a.platform === card.platform && a.connection_status === "connected").map((a) => a.id));
    }
  }, [accounts.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(() => (accounts.data ?? []).filter((a) => targets.includes(a.id)), [accounts.data, targets]);
  const copy = card.draft_copy + (disclosure ? "\n\n#AIassisted" : "");
  const tagCount = (card.hashtags ?? []).length;
  const { approvalRequired } = useWorkspace();
  const isApproved = !approvalRequired || ["approved", "exported", "posted"].includes(card.approval_status);

  const checks = selected.map((a) => {
    const lim = LIMITS[a.platform] ?? LIMITS.linkedin;
    const full = copy.length + (card.hashtags ?? []).join(" ").length + 1;
    return { a, lim, full, overChars: full > lim.chars, overTags: tagCount > lim.tags };
  });
  const blocking = checks.some((x) => x.overChars);

  const toggle = (id: string) => setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const save = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("post_cards").update({
      target_account_ids: targets, timezone: tz, apply_ai_disclosure: disclosure, ...patch,
    } as never).eq("id", card.id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["post_cards"] });
  };

  const run = async () => {
    const kind = confirm;
    setConfirm(null);
    try {
      if (kind === "schedule") {
        const when = new Date(`${date}T${time}:00`);
        await save({ scheduled_for: when.toISOString(), publishing_status: "scheduled" });
        toast({ title: "Scheduled", description: `${selected.length} channel(s) · ${when.toLocaleString()} (${tz})` });
        return;
      }
      const xCount = selected.filter((a) => a.platform === "x").length;
      if (xCount) {
        const cap = URL_RE.test(copy) ? "x_link_post" : "x_text_post";
        const pre = await precheckUsage("x_spend", cap, xCount, card.client_id ?? null, true);
        if (!pre.ok) throw new Error(pre.reason === "not_in_tier" ? "X isn't included in your plan." : pre.reason === "paused" ? "X spend is paused by a usage alert." : "This post would cross your monthly X cap.");
        await precheckUsage("x_spend", cap, xCount, card.client_id ?? null, false);
      }
      setRunning(true);
      await save({ publishing_status: "publishing" });
      for (const a of selected) {
        for (let p = 0; p <= 100; p += 20) {
          setProgress((s) => ({ ...s, [a.id]: p }));
          await new Promise((r) => setTimeout(r, 180));
        }
      }
      await save({ publishing_status: "published" });
      setJustPublished(selected.map((a) => a.platform));
      toast({ title: "Published", description: `Recorded for ${selected.length} channel(s). Live sending turns on once platform apps are connected.` });
    } catch (e) {
      toast({ title: "Couldn't save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const reset = async () => {
    await save({ publishing_status: "idle" });
    setProgress({});
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
          {status === "idle" ? "Not scheduled" : status}
        </Badge>
      </div>

      <div role="tablist" aria-label="How to post" className="grid grid-cols-3 gap-1 rounded-lg border p-1">
        {([["now", "Publish now", Send], ["schedule", "Schedule", CalendarClock], ["manual", "Manual handoff", Copy]] as const).map(([m, label, Icon]) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        {mode === "now" ? "Sends to the selected channels right away." : mode === "schedule" ? "Queues the post for the date and time you pick." : "Copy the post and open the platform to post it yourself."}
      </p>

      {justPublished && status === "published" && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" /> Published to {justPublished.length} channel{justPublished.length > 1 ? "s" : ""}</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(justPublished)].map((p) => (
              <OpenPlatformButton key={p} clientId={card.client_id} platform={p} label={`View on ${LIMITS[p]?.label ?? p}`} />
            ))}
            <PostResultsButton postId={card.id} clientId={card.client_id ?? null} />
          </div>
        </div>
      )}

      {mode === "manual" ? (
        <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <OpenPlatformButton clientId={card.client_id} platform={card.platform} variant="default" size="default"
            copyText={`${copy}${tagCount ? "\n\n" + (card.hashtags ?? []).map((h) => "#" + h.replace(/^#/, "")).join(" ") : ""}`}
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
            <div className="grid grid-cols-3 gap-2">
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

          <Button className="w-full" disabled={!canPublish || !isApproved || !selected.length || blocking || running}
            onClick={() => setConfirm(mode === "schedule" ? "schedule" : "now")}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : mode === "schedule" ? <CalendarClock className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {mode === "schedule" ? "Schedule post" : "Publish now"}
          </Button>
          {status !== "idle" && !running && (
            <button onClick={reset} className="text-xs text-muted-foreground underline">
              {status === "scheduled" ? "Cancel schedule" : "Reset publishing status"}
            </button>
          )}
          <p className="text-xs text-muted-foreground">Live sending activates once each platform app is connected in Setup → Social connections.</p>
        </>
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "now" ? "Publish now?" : "Schedule this post?"}</DialogTitle>
            <DialogDescription>
              {confirm === "now" ? "This post will go out to:" : `Goes out ${new Date(`${date}T${time}:00`).toLocaleString()} (${tz}) on:`}
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
            <Button onClick={run}>{confirm === "now" ? "Publish" : "Schedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
