import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays, addMonths, endOfMonth, format, isSameMonth, isToday, startOfMonth, startOfQuarter, addQuarters, endOfQuarter,
} from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight, Loader2, Undo2, Wand2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClient } from "@/contexts/ClientContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { STATUS_META, type ApprovalStatus } from "@/hooks/usePostCards";
import { postLabel } from "@/components/tracking/PostTracking";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  coverageTone, proposeFill, weekCoverage, weekStart, type Assignment, type CadenceTarget,
} from "@/lib/plannerFill";

type Row = {
  id: string; post_number: number | null; platform: string; content_type: string; approval_status: ApprovalStatus;
  scheduled_for: string | null; draft_copy: string; source_references: string[] | null;
};

const READY: ApprovalStatus[] = ["approved", "exported"];
const PLATFORMS = ["linkedin", "instagram", "facebook"];
const TYPES = ["post", "story", "reel", "carousel", "article"];
const TONE_COLOR: Record<string, string> = {
  full: "hsl(var(--brand-turquoise))", partial: "hsl(var(--brand-gold))", empty: "hsl(var(--brand-coral))", none: "hsl(var(--muted-foreground))",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ContentPlanner() {
  const { activeClientId, activeClient } = useActiveClient();
  const ws = useWorkspace();
  const canEdit = ws.canCreate;
  const qc = useQueryClient();
  const [view, setView] = useState<"month" | "quarter">("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [trayPlatform, setTrayPlatform] = useState("all");
  const [trayType, setTrayType] = useState("all");
  const [fillOpen, setFillOpen] = useState(false);
  const [undo, setUndo] = useState<{ id: string; scheduled_for: string | null }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [shiftDays, setShiftDays] = useState(7);

  const minMonth = startOfMonth(addMonths(new Date(), -1));
  const maxMonth = startOfMonth(addMonths(new Date(), 12));

  const postsQ = useQuery({
    queryKey: ["planner_posts", activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("post_cards")
        .select("id,post_number,platform,content_type,approval_status,scheduled_for,draft_copy,source_references")
        .eq("client_id", activeClientId!).neq("approval_status", "archived").neq("content_type", "comment");
      if (error) throw error;
      return data as Row[];
    },
  });
  const targetsQ = useQuery({
    queryKey: ["planner_targets", activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("cadence_targets").select("platform,content_type,weekly_target")
        .eq("client_id", activeClientId!).eq("is_active", true);
      if (error) throw error;
      const allowed = activeClient?.platforms ?? PLATFORMS;
      return (data as CadenceTarget[]).filter((t) => allowed.includes(t.platform) && t.content_type !== "comment");
    },
  });
  const assetsQ = useQuery({
    queryKey: ["planner_assets", activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("source_assets").select("id,expires_at,title")
        .eq("client_id", activeClientId!).not("expires_at", "is", null);
      if (error) throw error;
      return new Map(data.map((a) => [a.id, a]));
    },
  });

  const posts = postsQ.data ?? [];
  const targets = targetsQ.data ?? [];
  const scheduled = posts.filter((p) => p.scheduled_for);
  const stocked = scheduled.filter((p) => ["approved", "exported", "posted"].includes(p.approval_status));
  const unscheduled = posts.filter((p) => !p.scheduled_for && READY.includes(p.approval_status));
  const tray = unscheduled.filter((p) => (trayPlatform === "all" || p.platform === trayPlatform) && (trayType === "all" || p.content_type === trayType));

  const staleFor = (p: Row, when: string | null) => {
    if (!when || !assetsQ.data) return null;
    for (const ref of p.source_references ?? []) {
      const a = assetsQ.data.get(ref);
      if (a?.expires_at && new Date(a.expires_at) < new Date(when)) return a.title;
    }
    return null;
  };

  const byDay = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const p of scheduled) {
      const k = format(new Date(p.scheduled_for!), "yyyy-MM-dd");
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    m.forEach((list) => list.sort((a, b) => a.scheduled_for!.localeCompare(b.scheduled_for!)));
    return m;
  }, [scheduled]);

  async function writeDates(changes: { id: string; scheduled_for: string | null }[], action: string) {
    if (!changes.length) return;
    setBusy(true);
    const before = changes.map((c) => ({ id: c.id, scheduled_for: posts.find((p) => p.id === c.id)?.scheduled_for ?? null }));
    try {
      const results = await Promise.all(changes.map((c) =>
        supabase.from("post_cards").update({ scheduled_for: c.scheduled_for }).eq("id", c.id)));
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
      await Promise.all(changes.map((c) => {
        const p = posts.find((x) => x.id === c.id);
        return supabase.rpc("log_activity", {
          _action: action, _target: p ? postLabel(p) : c.id,
          _details: { post_card_id: c.id, from: before.find((b) => b.id === c.id)?.scheduled_for, to: c.scheduled_for },
        });
      }));
      setUndo(before);
      qc.invalidateQueries({ queryKey: ["planner_posts"] });
      qc.invalidateQueries({ queryKey: ["post_cards"] });
      toast.success(`${changes.length} post${changes.length === 1 ? "" : "s"} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update dates");
    } finally {
      setBusy(false);
    }
  }

  function dropOnDay(day: Date, id: string) {
    if (!canEdit) return;
    const p = posts.find((x) => x.id === id);
    if (!p) return;
    const base = p.scheduled_for ? new Date(p.scheduled_for) : null;
    const d = new Date(day);
    if (base) d.setHours(base.getHours(), base.getMinutes(), 0, 0);
    else d.setHours({ linkedin: 9, instagram: 12, facebook: 15 }[p.platform] ?? 10, 0, 0, 0);
    writeDates([{ id, scheduled_for: d.toISOString() }], p.scheduled_for ? "post_rescheduled" : "post_scheduled");
  }

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Quarter summaries for the next 4 quarters
  const quarters = useMemo(() => Array.from({ length: 4 }, (_, i) => {
    const qs = startOfQuarter(addQuarters(new Date(), i));
    const qe = endOfQuarter(qs);
    const gaps = new Map<string, number>();
    for (let w = weekStart(qs); w <= qe; w = addDays(w, 7)) {
      for (const c of weekCoverage(stocked, targets, w)) {
        if (c.have < c.target) gaps.set(`${cap(c.platform)} ${c.content_type}s`, (gaps.get(`${cap(c.platform)} ${c.content_type}s`) ?? 0) + c.target - c.have);
      }
    }
    return { label: `Q${Math.floor(qs.getMonth() / 3) + 1} ${format(qs, "yyyy")}`, gaps: [...gaps.entries()].sort((a, b) => b[1] - a[1]) };
  }), [stocked, targets]);

  if (!activeClientId) return <p className="text-muted-foreground">Select a client to plan content.</p>;

  const loading = postsQ.isLoading || targetsQ.isLoading;

  return (
    <div>
      <PageHeader title="Content Planner"
        description="Stock approved posts months ahead and see where your cadence has gaps. Nothing publishes automatically.">
        {undo && canEdit && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => { const u = undo; setUndo(null); writeDates(u, "post_schedule_undo").then(() => setUndo(null)); }}>
            <Undo2 className="h-4 w-4 mr-1" /> Undo last change
          </Button>
        )}
        {canEdit && (
          <Button size="sm" onClick={() => setFillOpen(true)} disabled={!unscheduled.length}>
            <Wand2 className="h-4 w-4 mr-1" /> Fill from Approved library
          </Button>
        )}
      </PageHeader>

      {/* Quarter summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        {quarters.map((q) => (
          <Card key={q.label} className="p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold">{q.label}</span>
              <span className="h-2 w-2 rounded-full" style={{ background: TONE_COLOR[!targets.length ? "none" : q.gaps.length ? "partial" : "full"] }} />
            </div>
            <p className="mt-1 text-sm">
              {!targets.length ? "No cadence targets set" : q.gaps.length ? `${q.gaps.reduce((s, g) => s + g[1], 0)} open slots` : "Fully stocked"}
            </p>
            {q.gaps.slice(0, 3).map(([k, n]) => <p key={k} className="text-xs text-muted-foreground">{n} {k} short</p>)}
          </Card>
        ))}
      </div>
      {!targets.length && !loading && (
        <p className="mb-4 text-sm text-muted-foreground">
          Set weekly targets in <Link to="/strategy" className="text-primary underline">Strategy &amp; Rules › Cadence</Link> to see gaps and use auto-fill.
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous" disabled={cursor <= minMonth}
              onClick={() => setCursor((c) => addMonths(c, view === "month" ? -1 : -3))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-40 text-center font-semibold">
              {view === "month" ? format(cursor, "MMMM yyyy") : `${format(cursor, "MMM")} – ${format(addMonths(cursor, 2), "MMM yyyy")}`}
            </span>
            <Button variant="outline" size="icon" aria-label="Next" disabled={cursor >= maxMonth}
              onClick={() => setCursor((c) => addMonths(c, view === "month" ? 1 : 3))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>Today</Button>
            <Tabs value={view} onValueChange={(v) => setView(v as "month" | "quarter")} className="ml-auto">
              <TabsList><TabsTrigger value="month">Month</TabsTrigger><TabsTrigger value="quarter">Quarter</TabsTrigger></TabsList>
            </Tabs>
          </div>

          {selected.size > 0 && canEdit && (
            <Card className="mb-3 flex flex-wrap items-center gap-2 p-2 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <span className="text-muted-foreground">Shift by</span>
              <Input type="number" className="h-8 w-20" value={shiftDays} onChange={(e) => setShiftDays(Number(e.target.value) || 0)} />
              <span className="text-muted-foreground">days</span>
              <Button size="sm" variant="outline" disabled={busy || !shiftDays} onClick={() => {
                writeDates([...selected].map((id) => {
                  const p = posts.find((x) => x.id === id)!;
                  return { id, scheduled_for: addDays(new Date(p.scheduled_for!), shiftDays).toISOString() };
                }), "post_rescheduled");
                setSelected(new Set());
              }}>Shift</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => {
                writeDates([...selected].map((id) => ({ id, scheduled_for: null })), "post_unscheduled"); setSelected(new Set());
              }}>Clear dates</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="h-4 w-4" /></Button>
            </Card>
          )}

          {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : view === "month" ? (
            <MonthGrid month={cursor} byDay={byDay} stocked={stocked} targets={targets} canEdit={canEdit}
              selected={selected} onToggle={toggle} onDrop={dropOnDay} staleFor={staleFor} />
          ) : (
            <QuarterList start={cursor} stocked={stocked} targets={targets} byDay={byDay} />
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {canEdit ? "Drag a post to another day to reschedule (keeps its time). Click a post's box to select it for bulk changes." : "You can view the plan; editors, admins and owners can reschedule."}
          </p>
        </div>

        {/* Unscheduled tray */}
        <Card className="w-full shrink-0 p-3 lg:w-72">
          <div className="mb-2 flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            <h2 className="font-semibold">Unscheduled</h2>
            <Badge variant="secondary" className="ml-auto">{unscheduled.length}</Badge>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Approved posts with no date. Drag one onto a day.</p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Select value={trayPlatform} onValueChange={setTrayPlatform}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All platforms</SelectItem>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{cap(p)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={trayType} onValueChange={setTrayType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All types</SelectItem>{TYPES.map((t) => <SelectItem key={t} value={t}>{cap(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {tray.length === 0 && <p className="text-xs text-muted-foreground">Nothing waiting.</p>}
            {tray.map((p) => <Chip key={p.id} p={p} draggable={canEdit} />)}
          </div>
        </Card>
      </div>

      <FillDialog open={fillOpen} onOpenChange={setFillOpen} pool={unscheduled} scheduled={stocked} targets={targets}
        posts={posts} busy={busy} onApply={(a) => writeDates(a, "post_autofilled").then(() => setFillOpen(false))} />
    </div>
  );
}

function Chip({ p, draggable, selected, onToggle, stale }: {
  p: Row; draggable: boolean; selected?: boolean; onToggle?: () => void; stale?: string | null;
}) {
  const faded = !READY.includes(p.approval_status) && p.approval_status !== "posted";
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
      onClick={onToggle}
      title={`${STATUS_META[p.approval_status].label} · ${p.draft_copy.slice(0, 140)}`}
      className={cn("rounded border px-1.5 py-1 text-[11px] leading-tight", STATUS_META[p.approval_status].color,
        draggable && "cursor-grab active:cursor-grabbing", faded && "opacity-50", selected && "ring-2 ring-primary")}
    >
      <div className="flex items-center gap-1">
        <span className="font-mono font-semibold">{postLabel(p)}</span>
        {stale && <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--brand-coral))" }} aria-label={`Source "${stale}" expires before this date`} />}
        {p.scheduled_for && <span className="ml-auto font-mono opacity-70">{format(new Date(p.scheduled_for), "HH:mm")}</span>}
      </div>
      <div className="truncate opacity-80">{cap(p.platform)} {p.content_type}</div>
    </div>
  );
}

function MonthGrid({ month, byDay, stocked, targets, canEdit, selected, onToggle, onDrop, staleFor }: {
  month: Date; byDay: Map<string, Row[]>; stocked: Row[]; targets: CadenceTarget[]; canEdit: boolean;
  selected: Set<string>; onToggle: (id: string) => void; onDrop: (d: Date, id: string) => void; staleFor: (p: Row, w: string | null) => string | null;
}) {
  const weeks: Date[] = [];
  for (let w = weekStart(startOfMonth(month)); w <= endOfMonth(month); w = addDays(w, 7)) weeks.push(w);
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-[repeat(7,minmax(0,1fr))_120px] gap-1 text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Week coverage"].map((d) => (
          <div key={d} className="px-1 font-mono text-muted-foreground">{d}</div>
        ))}
        {weeks.map((w) => {
          const cov = weekCoverage(stocked, targets, w);
          const tone = coverageTone(cov);
          return [
            ...Array.from({ length: 7 }, (_, i) => {
              const day = addDays(w, i);
              const list = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
              return (
                <div key={day.toISOString()}
                  onDragOver={(e) => canEdit && e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) onDrop(day, id); }}
                  className={cn("min-h-24 rounded border bg-card p-1", !isSameMonth(day, month) && "opacity-50", isToday(day) && "border-primary")}>
                  <div className="mb-1 font-mono text-[10px] text-muted-foreground">{format(day, "d")}</div>
                  <div className="space-y-1">
                    {list.map((p) => (
                      <Chip key={p.id} p={p} draggable={canEdit} selected={selected.has(p.id)}
                        onToggle={canEdit ? () => onToggle(p.id) : undefined} stale={staleFor(p, p.scheduled_for)} />
                    ))}
                  </div>
                </div>
              );
            }),
            <div key={`cov-${w.toISOString()}`} className="rounded border bg-card p-1.5" style={{ borderLeft: `3px solid ${TONE_COLOR[tone]}` }}>
              {cov.length === 0 ? <span className="text-muted-foreground">No targets</span> : cov.map((c) => (
                <div key={c.key} className="flex justify-between gap-1 text-[10px]">
                  <span className="truncate">{cap(c.platform)} {c.content_type}</span>
                  <span className="font-mono" style={{ color: c.have >= c.target ? TONE_COLOR.full : undefined }}>{c.have}/{c.target}</span>
                </div>
              ))}
            </div>,
          ];
        })}
      </div>
    </div>
  );
}

function QuarterList({ start, stocked, targets, byDay }: { start: Date; stocked: Row[]; targets: CadenceTarget[]; byDay: Map<string, Row[]> }) {
  const end = endOfMonth(addMonths(start, 2));
  const weeks: Date[] = [];
  for (let w = weekStart(start); w <= end; w = addDays(w, 7)) weeks.push(w);
  return (
    <div className="space-y-1.5">
      {weeks.map((w) => {
        const cov = weekCoverage(stocked, targets, w);
        const tone = coverageTone(cov);
        let total = 0;
        for (let i = 0; i < 7; i++) total += byDay.get(format(addDays(w, i), "yyyy-MM-dd"))?.length ?? 0;
        return (
          <Card key={w.toISOString()} className="flex flex-wrap items-center gap-3 p-2 text-sm" style={{ borderLeft: `4px solid ${TONE_COLOR[tone]}` }}>
            <span className="w-32 font-mono text-xs">{format(w, "MMM d")} – {format(addDays(w, 6), "MMM d")}</span>
            <span className="w-20 text-xs text-muted-foreground">{total} scheduled</span>
            <div className="flex flex-wrap gap-1.5">
              {cov.map((c) => (
                <Badge key={c.key} variant="outline" className="font-mono text-[10px]"
                  style={{ borderColor: c.have >= c.target ? TONE_COLOR.full : c.have ? TONE_COLOR.partial : TONE_COLOR.empty }}>
                  {cap(c.platform)} {c.content_type} {c.have}/{c.target}
                </Badge>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function FillDialog({ open, onOpenChange, pool, scheduled, targets, posts, busy, onApply }: {
  open: boolean; onOpenChange: (o: boolean) => void; pool: Row[]; scheduled: Row[]; targets: CadenceTarget[];
  posts: Row[]; busy: boolean; onApply: (a: Assignment[]) => void;
}) {
  const [from, setFrom] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(addMonths(new Date(), 6), "yyyy-MM-dd"));
  const [platforms, setPlatforms] = useState<string[]>(PLATFORMS);
  const [types, setTypes] = useState<string[]>(TYPES);
  const [proposal, setProposal] = useState<Assignment[] | null>(null);

  const run = () => {
    const f = new Date(`${from}T00:00:00`), t = new Date(`${to}T23:59:00`);
    if (f > t) return toast.error("Start date must be before end date");
    const maxEnd = addMonths(new Date(), 12);
    setProposal(proposeFill({
      pool: pool.filter((p) => platforms.includes(p.platform) && types.includes(p.content_type)),
      scheduled, targets: targets.filter((x) => platforms.includes(x.platform) && types.includes(x.content_type)),
      from: f, to: t > maxEnd ? maxEnd : t,
    }));
  };
  const flip = (list: string[], v: string, set: (l: string[]) => void) => { set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]); setProposal(null); };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setProposal(null); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Fill from Approved library</DialogTitle>
          <DialogDescription>Suggests dates for approved, unscheduled posts to meet your weekly targets. Review before applying — nothing is published.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setProposal(null); }} /></div>
          <div><Label>To (max 12 months)</Label><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setProposal(null); }} /></div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {PLATFORMS.map((p) => <label key={p} className="flex items-center gap-1.5"><Checkbox checked={platforms.includes(p)} onCheckedChange={() => flip(platforms, p, setPlatforms)} />{cap(p)}</label>)}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {TYPES.map((t) => <label key={t} className="flex items-center gap-1.5"><Checkbox checked={types.includes(t)} onCheckedChange={() => flip(types, t, setTypes)} />{cap(t)}</label>)}
        </div>
        {proposal && (
          <div className="max-h-64 overflow-y-auto rounded border p-2 text-sm">
            {proposal.length === 0 ? <p className="text-muted-foreground">No open slots match — targets may already be met, or no approved posts fit these filters.</p> :
              proposal.map((a) => {
                const p = posts.find((x) => x.id === a.id)!;
                return (
                  <div key={a.id} className="flex justify-between gap-2 py-0.5">
                    <span><span className="font-mono font-semibold">{postLabel(p)}</span> {cap(p.platform)} {p.content_type}</span>
                    <span className="font-mono text-xs">{format(new Date(a.scheduled_for), "EEE MMM d, HH:mm")}</span>
                  </div>
                );
              })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={run}>{proposal ? "Recalculate" : "Suggest dates"}</Button>
          <Button disabled={!proposal?.length || busy} onClick={() => proposal && onApply(proposal)}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Apply {proposal?.length ?? ""} dates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
