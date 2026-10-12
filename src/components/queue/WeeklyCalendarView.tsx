import { useMemo, useState } from "react";
import { openInNewTab } from "@/lib/openInNewTab";
import { addDays, addWeeks, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CalendarDays, FileText, MessageSquare, Instagram, Linkedin, Facebook, ExternalLink } from "lucide-react";
import { useClientSocialAccounts, postingUrl } from "@/hooks/useClientSocialAccounts";
import { STATUS_META, type QueueItem } from "@/hooks/usePostCards";
import { postLabel } from "@/components/tracking/PostTracking";
import { cn } from "@/lib/utils";
import { commentLabel } from "@/lib/contentPresentation";

interface WeeklyCalendarViewProps {
  items: QueueItem[];
  onItemClick: (item: QueueItem) => void;
  onReschedule?: (postCardId: string, date: Date, platform: "instagram" | "linkedin" | "facebook") => void;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "facebook", label: "Facebook", icon: Facebook },
];

function itemDate(item: QueueItem): Date {
  const scheduled = item.postCard?.scheduled_for;
  return new Date(scheduled ?? item.created_at);
}

export function WeeklyCalendarView({ items, onItemClick, onReschedule }: WeeklyCalendarViewProps) {
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
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
                  const isDragOver = dragOverKey === key;
                  return (
                    <Card
                      key={key}
                      onDragOver={(e) => {
                        if (!onReschedule) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverKey !== key) setDragOverKey(key);
                      }}
                      onDragLeave={() => {
                        if (dragOverKey === key) setDragOverKey(null);
                      }}
                      onDrop={(e) => {
                        if (!onReschedule) return;
                        e.preventDefault();
                        setDragOverKey(null);
                        const id = e.dataTransfer.getData("text/post-card-id");
                        if (id) onReschedule(id, d, p.value as "instagram" | "linkedin" | "facebook");
                      }}
                      className={cn(
                        "min-h-[120px] p-1.5 space-y-1 bg-card/50 transition-colors",
                        isSameDay(d, new Date()) && "ring-1 ring-primary/40",
                        isDragOver && "ring-2 ring-primary bg-primary/5"
                      )}
                    >
                      {cellItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/40">
                          {isDragOver ? "Drop here" : "—"}
                        </div>
                      ) : (
                        cellItems.map((item) => {
                          const meta = STATUS_META[item.approval_status];
                          const TypeIcon = item.type === "comment" ? MessageSquare : FileText;
                          const draggable = item.type === "post" && !!onReschedule;
                          return (
                            <Button variant="ghost"
                              key={`${item.type}-${item.id}`}
                              onClick={() => onItemClick(item)}
                              draggable={draggable}
                              onDragStart={(e) => {
                                if (!draggable) return;
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/post-card-id", item.id);
                              }}
                              className={cn(
                                "w-full h-auto block whitespace-normal text-left rounded border px-1.5 py-1 text-xs leading-tight",
                                "hover:border-primary/50 transition-colors",
                                draggable && "cursor-grab active:cursor-grabbing",
                                meta.color
                              )}
                              title={draggable ? "Drag to reschedule" : item.draft_copy}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <TypeIcon className="h-2.5 w-2.5 shrink-0" />
                                 <span className="min-w-0 break-words font-medium">
                                   {item.postCard ? postLabel(item.postCard) : commentLabel(item.comment?.external_posts)}
                                </span>
                              </div>
                               <div className="text-[11px] mb-1 flex items-center gap-1">{meta.label}
                                 {item.postCard && ["approved", "exported"].includes(item.approval_status) && <CalendarOpenIcon card={item.postCard} />}
                               </div>
                              <div className="line-clamp-2 text-foreground/80">
                                {item.draft_copy || "(no copy)"}
                              </div>
                            </Button>
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

function CalendarOpenIcon({ card }: { card: NonNullable<QueueItem["postCard"]> }) {
  const { data: accounts = [] } = useClientSocialAccounts(card.client_id);
  const url = postingUrl(card.platform, accounts.find((a) => a.platform === card.platform));
  if (!url) return null;
  return (
    <span role="link" tabIndex={0} aria-label={`Copy and open ${card.platform}`} title={`Copy & open ${card.platform}`}
      className="ml-auto inline-flex rounded p-0.5 hover:bg-foreground/10"
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText([card.draft_copy, (card.hashtags ?? []).join(" ")].filter(Boolean).join("\n\n")).catch(() => {});
        openInNewTab(url);
      }}>
      <ExternalLink className="h-3 w-3" />
    </span>
  );
}
