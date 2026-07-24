import { useMemo, useState } from "react";
import { addDays, addWeeks, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CalendarDays, FileText, MessageSquare, Instagram, Linkedin } from "lucide-react";
import { STATUS_META, type QueueItem } from "@/hooks/usePostCards";
import { cn } from "@/lib/utils";

interface WeeklyCalendarViewProps {
  items: QueueItem[];
  onItemClick: (item: QueueItem) => void;
  onReschedule?: (postCardId: string, date: Date, platform: "instagram" | "linkedin") => void;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
];

function itemDate(item: QueueItem): Date {
  const scheduled = item.postCard?.scheduled_for;
  return new Date(scheduled ?? item.created_at);
}

export function WeeklyCalendarView({ items, onItemClick }: WeeklyCalendarViewProps) {
  const [anchor, setAnchor] = useState<Date>(new Date());
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const grid = useMemo(() => {
    const map = new Map<string, QueueItem[]>();
    for (const item of items) {
      const d = itemDate(item);
      if (d < weekStart || d > weekEnd) continue;
      const key = `${format(d, "yyyy-MM-dd")}|${item.platform}`;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [items, weekStart, weekEnd]);

  const weekTotals = useMemo(() => {
    const totals: Record<string, { post: number; comment: number }> = {};
    for (const p of PLATFORMS) totals[p.value] = { post: 0, comment: 0 };
    for (const item of items) {
      const d = itemDate(item);
      if (d < weekStart || d > weekEnd) continue;
      if (!totals[item.platform]) totals[item.platform] = { post: 0, comment: 0 };
      totals[item.platform][item.type]++;
    }
    return totals;
  }, [items, weekStart, weekEnd]);

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(addWeeks(anchor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            <CalendarDays className="h-4 w-4 mr-1.5" />This week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(addWeeks(anchor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium ml-2">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const t = weekTotals[p.value] ?? { post: 0, comment: 0 };
            return (
              <div key={p.value} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1">
                <Icon className="h-3 w-3" />
                <span>{p.label}</span>
                <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px]">
                  {t.post}p · {t.comment}c
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className="grid grid-cols-[120px_repeat(7,minmax(0,1fr))] gap-2 mb-2">
            <div />
            {days.map((d) => (
              <div key={d.toISOString()} className="text-center">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {format(d, "EEE")}
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isSameDay(d, new Date()) && "text-primary"
                  )}
                >
                  {format(d, "MMM d")}
                </div>
              </div>
            ))}
          </div>

          {/* Platform rows */}
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.value}
                className="grid grid-cols-[120px_repeat(7,minmax(0,1fr))] gap-2 mb-2"
              >
                <div className="flex items-center gap-2 px-2 py-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {p.label}
                </div>
                {days.map((d) => {
                  const key = `${format(d, "yyyy-MM-dd")}|${p.value}`;
                  const cellItems = grid.get(key) ?? [];
                  return (
                    <Card
                      key={key}
                      className={cn(
                        "min-h-[120px] p-1.5 space-y-1 bg-card/50",
                        isSameDay(d, new Date()) && "ring-1 ring-primary/40"
                      )}
                    >
                      {cellItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/40">
                          —
                        </div>
                      ) : (
                        cellItems.map((item) => {
                          const meta = STATUS_META[item.approval_status];
                          const TypeIcon = item.type === "comment" ? MessageSquare : FileText;
                          return (
                            <button
                              key={`${item.type}-${item.id}`}
                              onClick={() => onItemClick(item)}
                              className={cn(
                                "w-full text-left rounded border px-1.5 py-1 text-[11px] leading-tight",
                                "hover:border-primary/50 transition-colors",
                                meta.color
                              )}
                              title={item.draft_copy}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <TypeIcon className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate font-medium">{meta.label}</span>
                              </div>
                              <div className="line-clamp-2 text-foreground/80">
                                {item.draft_copy || "(no copy)"}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
