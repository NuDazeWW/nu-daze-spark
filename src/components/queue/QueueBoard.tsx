import { useMemo } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { CalendarClock, CheckCircle2, Clock, Eye, AlertTriangle, Flame, Hourglass, Ban, ArrowRight } from "lucide-react";
import type { QueueItem } from "@/hooks/usePostCards";
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
    { label: "At Risk", value: k.risk, icon: AlertTriangle, tone: "crimson", hint: "Sent back for revision" },
  ];
  return (
    <div className="sm-qkpis grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5 mb-5">
      {cards.map((c) => (
        <div key={c.label} className="sm-qkpi" data-tone={c.tone} title={c.hint}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
            <c.icon className="sm-qkpi-icon h-4 w-4" />
          </div>
          <p className="sm-qkpi-value">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function QueueBoard({ items, renderItem }: { items: Item[]; renderItem: (i: Item) => React.ReactNode }) {
  const today = startOfDay(new Date());
  const days = [0, 1, 2, 3].map((n) => addDays(today, n));
  const cols = useMemo(() => {
    const buckets: Item[][] = [[], [], [], [], []];
    for (const i of items) {
      const d = boardDate(i);
      const idx = d ? days.findIndex((day) => isSameDay(d, day)) : -1;
      buckets[idx >= 0 ? idx : 4].push(i);
    }
    return buckets;
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const titles = [...days.map((d, n) => (n === 0 ? "Today" : format(d, "EEE"))), "Other dates"];
  const subs = [...days.map((d) => format(d, "MMM d")), "Earlier or later"];
  return (
    <div className="sm-qboard grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 items-start">
      {cols.map((list, idx) => (
        <section key={idx} className="sm-qcol" data-today={idx === 0 || undefined} aria-label={titles[idx]}>
          <header className="flex items-baseline justify-between px-1 pb-2">
            <div>
              <h3 className="text-sm font-semibold">{titles[idx]}</h3>
              <p className="text-[10px] font-mono text-muted-foreground">{subs[idx]}</p>
            </div>
            <span className="sm-qcol-count">{list.length}</span>
          </header>
          <div className="space-y-2.5">
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
          <div className="flex items-center gap-2 mb-2">
            <p.icon className="sm-qkpi-icon h-4 w-4" />
            <h3 className="text-sm font-semibold">{p.title}</h3>
            <span className="ml-auto sm-qcol-count">{p.list.length}</span>
          </div>
          {p.list.length === 0 ? <p className="text-xs text-muted-foreground">{p.empty}</p> : (
            <ul className="space-y-1">
              {p.list.slice(0, 4).map((i) => (
                <li key={i.id}>
                  <button onClick={() => onOpen(i)} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/50">
                    <PlatformIcon platform={i.platform} className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">{i.postCard ? postLabel(i.postCard) : "Comment"}</span>
                    <span className="truncate">{i.draft_copy}</span>
                    <ArrowRight className="h-3 w-3 ml-auto shrink-0 opacity-60" />
                  </button>
                </li>
              ))}
              {p.list.length > 4 && <li className="text-[10px] text-muted-foreground px-2">+{p.list.length - 4} more — use the status filter to see all</li>}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
