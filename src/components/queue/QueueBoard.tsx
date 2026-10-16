import { useMemo } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { CalendarDays, CalendarClock, CheckCircle2, Clock, Eye, AlertTriangle, Flame, Hourglass, Ban, ChevronRight } from "lucide-react";
import type { QueueItem } from "@/hooks/usePostCards";
import { STATUS_META } from "@/hooks/usePostCards";
import { postLabel } from "@/components/tracking/PostTracking";
import { PlatformIcon } from "@/components/layout/PlatformIcon";

type Item = QueueItem;

const itemDate = (i: Item) => {
  const s = i.postCard?.scheduled_for;
  return s ? new Date(s) : null;
};
// Board placement: scheduled time, otherwise the day the item was created.
const boardDate = (i: Item) => {
  const s = i.postCard?.scheduled_for ?? (i as { created_at?: string }).created_at;
  return s ? new Date(s) : null;
};

// Decorative mini bar charts on the KPI cards (heights in px).
const BARS: Record<string, number[]> = {
  cyan: [10, 18, 12, 24, 16, 28],
  coral: [22, 12, 20, 10, 24, 14],
  sky: [8, 14, 22, 12, 26, 18],
  emerald: [12, 20, 14, 26, 18, 24],
  gold: [24, 14, 20, 10, 22, 12],
};

export function QueueKpis({ items }: { items: Item[] }) {
  const today = startOfDay(new Date());
  const now = new Date();
  const k = useMemo(() => ({
    today: items.filter((i) => { const d = itemDate(i); return d && isSameDay(d, today); }).length,
    review: items.filter((i) => i.approval_status === "in_review").length,
    scheduled: items.filter((i) => { const d = itemDate(i); return d && d > now && i.approval_status !== "posted"; }).length,
    ready: items.filter((i) => i.approval_status === "approved").length,
    risk: items.filter((i) => i.approval_status === "needs_revision").length,
  }), [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const cards = [
    { label: "Posts Today", value: k.today, icon: CalendarClock, tone: "cyan", hint: "Scheduled for today" },
    { label: "Needs Review", value: k.review, icon: Eye, tone: "coral", hint: "Waiting in review" },
    { label: "Scheduled", value: k.scheduled, icon: Clock, tone: "sky", hint: "Upcoming scheduled times" },
    { label: "Ready to Post", value: k.ready, icon: CheckCircle2, tone: "emerald", hint: "Approved and ready" },
    { label: "At Risk", value: k.risk, icon: AlertTriangle, tone: "gold", hint: "Sent back for revision" },
  ];
  return (
    <div className="sm-qkpis grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="sm-qkpi" data-tone={c.tone} title={c.hint}>
          <span className="sm-qkpi-well"><c.icon /></span>
          <span className="sm-qkpi-meta">
            <span className="sm-qkpi-value">{c.value}</span>
            <span className="sm-qkpi-label">{c.label}</span>
          </span>
          <span className="sm-qkpi-bars" aria-hidden="true">
            {(BARS[c.tone] ?? BARS.cyan).map((h, i) => <i key={i} style={{ height: `${h}px` }} />)}
          </span>
        </div>
      ))}
    </div>
  );
}

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

export function QueueBoard({ items, renderItem }: { items: Item[]; renderItem: (i: Item) => React.ReactNode }) {
  const { cols, titles, subs } = useMemo(() => {
    const today = startOfDay(new Date());
    // Columns: Today, then the three nearest days that actually hold content
    // (upcoming first, then most recent), then everything else.
    const byDay = new Map<string, Date>();
    for (const i of items) {
      const d = boardDate(i);
      if (d && !isSameDay(d, today)) byDay.set(dayKey(d), startOfDay(d));
    }
    const all = [...byDay.values()];
    const future = all.filter((d) => d > today).sort((x, y) => +x - +y);
    const past = all.filter((d) => d < today).sort((x, y) => +y - +x);
    const picked = [...future, ...past].slice(0, 3);
    for (let n = 1; picked.length < 3; n++) {
      const d = addDays(today, n);
      if (!picked.some((p) => isSameDay(p, d))) picked.push(d);
    }
    picked.sort((x, y) => {
      const fx = x > today, fy = y > today;
      if (fx !== fy) return fx ? -1 : 1;
      return fx ? +x - +y : +y - +x;
    });
    const days = [today, ...picked];
    const buckets: Item[][] = [[], [], [], [], []];
    for (const i of items) {
      const d = boardDate(i);
      const idx = d ? days.findIndex((day) => isSameDay(d, day)) : -1;
      buckets[idx >= 0 ? idx : 4].push(i);
    }
    const label = (d: Date) => {
      const diff = Math.round((+d - +today) / 86400000);
      return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : format(d, "EEE, MMM d");
    };
    const sub = (d: Date, list: Item[]) => {
      const sched = list.some((i) => i.postCard?.scheduled_for);
      return `${format(d, "EEE, MMM d")}${list.length ? (sched ? " · scheduled" : " · created") : ""}`;
    };
    return {
      cols: buckets,
      titles: [...days.map(label), "Earlier & later"],
      subs: [...days.map((d, n) => sub(d, buckets[n])), "Other dates"],
    };
  }, [items]);
  return (
    <div className="sm-qboard">
      {cols.map((list, idx) => (
        <section key={idx} className="sm-qcol" data-today={idx === 0 || undefined} aria-label={titles[idx]}>
          <header className="sm-qcol-head">
            <CalendarDays className="sm-qcol-icon" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold truncate">{titles[idx]}</h3>
              <p className="text-[10px] font-mono text-muted-foreground truncate">{subs[idx]}</p>
            </div>
            <span className="sm-qcol-count shrink-0">{list.length} {list.length === 1 ? "item" : "items"}</span>
          </header>
          <div className="space-y-2">
            {list.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">Nothing here</p>
              : list.map(renderItem)}
          </div>
        </section>
      ))}
    </div>
  );
}

export function QueueTriage({ items, onOpen }: { items: Item[]; onOpen: (i: Item) => void }) {
  const soon = Date.now() + 24 * 3600 * 1000;
  const panels = [
    { title: "Urgent Items", tone: "coral", icon: Flame, empty: "Nothing due in the next 24 hours.",
      list: items.filter((i) => { const d = itemDate(i); return d && d.getTime() < soon && !["approved", "exported", "posted", "archived"].includes(i.approval_status); }) },
    { title: "Pending Approvals", tone: "gold", icon: Hourglass, empty: "No items waiting for approval.",
      list: items.filter((i) => i.approval_status === "in_review") },
    { title: "Blocked Content", tone: "crimson", icon: Ban, empty: "No content sent back for revision.",
      list: items.filter((i) => i.approval_status === "needs_revision") },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3 mt-6">
      {panels.map((p) => (
        <div key={p.title} className="sm-qtriage" data-tone={p.tone}>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="sm-qtriage-well"><p.icon className="h-4 w-4" /></span>
            <h3 className="text-sm font-semibold">{p.title}</h3>
            <span className="ml-auto sm-qcol-count">{p.list.length} item{p.list.length !== 1 ? "s" : ""}</span>
          </div>
          {p.list.length === 0 ? <p className="text-xs text-muted-foreground">{p.empty}</p> : (
            <ul className="space-y-1.5">
              {p.list.slice(0, 4).map((i) => {
                const meta = STATUS_META[i.approval_status];
                const d = itemDate(i);
                return (
                  <li key={i.id}>
                    <button onClick={() => onOpen(i)} className="sm-qtriage-row">
                      <span className="sm-qplatform shrink-0" data-platform={i.platform} aria-label={i.platform}>
                        <PlatformIcon platform={i.platform} className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{i.draft_copy}</span>
                        <span className="block truncate text-[10px] text-muted-foreground font-mono">
                          {i.postCard ? postLabel(i.postCard) : "Comment"}
                          {d ? ` · ${format(d, "EEE, h:mm a")}` : ""}
                        </span>
                      </span>
                      <span className={`sm-qtriage-badge shrink-0 ${meta.color}`}>{meta.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </button>
                  </li>
                );
              })}
              {p.list.length > 4 && <li className="text-[10px] text-muted-foreground px-2 pt-1">+{p.list.length - 4} more — use the status filter to see all</li>}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
