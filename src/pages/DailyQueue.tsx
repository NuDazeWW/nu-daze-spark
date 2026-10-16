import { PipelineNav } from "@/components/queue/PipelineNav";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStatusDates, postLabel, matchesPostNumber } from "@/components/tracking/PostTracking";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePostCards, STATUS_META, type ApprovalStatus, type QueueItemType } from "@/hooks/usePostCards";
import { PostCardItem } from "@/components/queue/PostCardItem";
import { CommentCardItem } from "@/components/queue/CommentCardItem";
import { PostCardEditDialog } from "@/components/queue/PostCardEditDialog";
import { CommentEditDialog } from "@/components/queue/CommentEditDialog";
import { ScheduleImportDialog } from "@/components/queue/ScheduleImportDialog";
import { DeleteConfirmDialog } from "@/components/strategy/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WeeklyCalendarView } from "@/components/queue/WeeklyCalendarView";
import { QueueBoard, QueueKpis, QueueTriage } from "@/components/queue/QueueBoard";
import {
  CalendarDays, Search, AlertCircle, Inbox, FileText, MessageSquare, LayoutGrid, Upload, List, Plus,
} from "lucide-react";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "in_review", label: "In Review" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "approved", label: "Approved" },
  { value: "exported", label: "Exported" },
  { value: "posted", label: "Posted" },
  { value: "archived", label: "Archived" },
];

const TYPE_FILTERS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "post", label: "Posts", icon: FileText },
  { value: "comment", label: "Comments", icon: MessageSquare },
];

export default function DailyQueue() {
  const { queueItems, cards, isLoading, error, isAdmin, updateStatus, updateCard, updateComment, deleteCard, deleteComment, reschedulePost } = usePostCards();

  const [search, setSearch] = useState("");
  const statusDates = useStatusDates();
  const [params, setParams] = useSearchParams();
  const jumpId = params.get("post");
  useEffect(() => {
    if (!jumpId) return;
    const c = cards.find((x) => x.id === jumpId);
    if (!c) return;
    setSearch(postLabel(c)); setStatusFilter("all"); setPlatformFilter("all"); setTypeFilter("all");
    if (params.get("edit")) { const qi = queueItems.find((q) => q.type === "post" && q.id === jumpId); if (qi) setEditingPostCard(qi); }
    setParams({}, { replace: true });
  }, [jumpId, cards, queueItems, params, setParams]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingPostCard, setEditingPostCard] = useState<typeof queueItems[0] | null>(null);
  const [editingComment, setEditingComment] = useState<typeof queueItems[0] | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ id: string; type: QueueItemType } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<"board" | "list" | "calendar">("board");

  const filtered = useMemo(() => {
    return queueItems.filter((item) => {
      if (statusFilter !== "all" && item.approval_status !== statusFilter) return false;
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (search) {
        if (item.postCard && matchesPostNumber(item.postCard, search)) return true;
        const q = search.toLowerCase();
        const searchable = [
          item.draft_copy,
          item.postCard ? postLabel(item.postCard) : null,
          item.postCard?.objective,
          item.postCard?.campaign_pillar,
          item.postCard?.audience,
          item.comment?.external_posts?.author_name,
          item.comment?.external_posts?.topic,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [queueItems, search, statusFilter, platformFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of queueItems) {
      counts[item.approval_status] = (counts[item.approval_status] || 0) + 1;
    }
    return counts;
  }, [queueItems]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { post: 0, comment: 0 };
    for (const item of queueItems) counts[item.type]++;
    return counts;
  }, [queueItems]);

  const activeCount = queueItems.filter((c) => !["archived", "posted"].includes(c.approval_status)).length;

  const platforms = useMemo(() => Array.from(new Set(queueItems.map((q) => q.platform))).sort(), [queueItems]);

  const renderItem = (item: typeof queueItems[0]) => {
            if (item.type === "comment" && item.comment) {
              return (
                <CommentCardItem
                  key={`comment-${item.id}`}
                  comment={item.comment}
                  isAdmin={isAdmin}
                  onEdit={() => setEditingComment(item)}
                  onStatusChange={(status) => updateStatus.mutate({ id: item.id, status, itemType: "comment" })}
                  onDelete={() => setDeletingItem({ id: item.id, type: "comment" })}
                  isUpdating={updateStatus.isPending}
                />
              );
            }
            if (item.postCard) {
              return (
                <PostCardItem
                  key={`post-${item.id}`}
                  card={item.postCard}
                  isAdmin={isAdmin}
                  onEdit={() => setEditingPostCard(item)}
                  onStatusChange={(status, notes) => updateStatus.mutate({ id: item.id, status, notes, itemType: "post" })}
                  onDelete={() => setDeletingItem({ id: item.id, type: "post" })}
                  isUpdating={updateStatus.isPending}
                  statusDates={statusDates[item.id]}
                />
              );
            }
            return null;
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Daily Content Queue" description="Review, edit, approve, and export generated post cards and comments." />
        <div className="space-y-3 py-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Daily Content Queue" description="Review, edit, approve, and export generated post cards and comments." />
        <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription>Failed to load queue: {error.message}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="sm-reference sm-queue animate-fade-in">
      <PageHeader
        title="Daily Content Queue"
        description={`${activeCount} active item${activeCount !== 1 ? "s" : ""} in the pipeline · ${typeCounts.post} post${typeCounts.post !== 1 ? "s" : ""} · ${typeCounts.comment} comment${typeCounts.comment !== 1 ? "s" : ""}`}
      />
      <PipelineNav className="mt-4" />

      <ScheduleImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <QueueKpis items={queueItems} />

      {/* Single-row toolbar: search, filters, view, actions */}
      <div className="sm-qtoolbar flex flex-wrap items-center gap-2 mb-5">
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search queue" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts, captions, or tags…" className="pl-9 h-9" />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger aria-label="Platform" className="h-9 w-[160px]"><SelectValue placeholder="All Platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms ({queueItems.length})</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">{p} ({queueItems.filter((q) => q.platform === p).length})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger aria-label="Status" className="h-9 w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((sf) => (
              <SelectItem key={sf.value} value={sf.value}>
                {sf.value === "all" ? "All Statuses" : sf.label} ({sf.value === "all" ? queueItems.length : (statusCounts[sf.value] || 0)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger aria-label="Type" className="h-9 w-[140px]"><SelectValue placeholder="All Items" /></SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>
                {tf.value === "all" ? "All Items" : tf.label} ({tf.value === "all" ? queueItems.length : (typeCounts[tf.value] || 0)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div role="group" aria-label="View" className="flex items-center gap-1 rounded-full border p-1">
          {([["board", LayoutGrid, "Board"], ["list", List, "List"], ["calendar", CalendarDays, "Calendar"]] as const).map(([v, Icon, l]) => (
            <Button key={v} size="sm" variant={view === v ? "default" : "ghost"} aria-pressed={view === v} onClick={() => setView(v)} className="rounded-full h-8 px-3 text-sm">
              <Icon className="h-4 w-4 mr-1.5" />{l}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="h-9">
            <Link to="/generator"><Plus className="h-4 w-4 mr-1.5" />New Post</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />Import schedule
          </Button>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={queueItems.length === 0 ? CalendarDays : Inbox}
          title={queueItems.length === 0 ? "Queue is empty" : "No matching items"}
          description={
            queueItems.length === 0
              ? "Generate post cards or comments to populate the queue."
              : "Try adjusting your search or filters."
          }
        />
      ) : view === "board" ? (
        <QueueBoard items={filtered} renderItem={renderItem} />
      ) : view === "calendar" ? (
        <WeeklyCalendarView
          items={filtered}
          onItemClick={(item) => {
            if (item.type === "comment") setEditingComment(item);
            else setEditingPostCard(item);
          }}
          onReschedule={(id, date, platform) => {
            const card = cards.find((c) => c.id === id);
            const existing = card?.scheduled_for ? new Date(card.scheduled_for) : null;
            const target = new Date(date);
            if (existing) {
              target.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
            } else {
              target.setHours(12, 0, 0, 0);
            }
            reschedulePost.mutate({
              id,
              scheduled_for: target.toISOString(),
              platform: card?.platform !== platform ? platform : undefined,
            });
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 items-start">
          {filtered.map(renderItem)}
        </div>
      )}

      {queueItems.length > 0 && (
        <QueueTriage items={queueItems} onOpen={(i) => (i.type === "comment" ? setEditingComment(i) : setEditingPostCard(i))} />
      )}

      {/* Post card edit dialog */}
      {editingPostCard?.postCard && (
        <PostCardEditDialog
          open={!!editingPostCard}
          onOpenChange={(o) => { if (!o) setEditingPostCard(null); }}
          card={editingPostCard.postCard}
          onSave={(updates) => {
            updateCard.mutate({ id: editingPostCard.id, ...updates } as any);
            setEditingPostCard(null);
          }}
          isPending={updateCard.isPending}
        />
      )}

      {/* Comment edit dialog */}
      {editingComment?.comment && (
        <CommentEditDialog
          open={!!editingComment}
          onOpenChange={(o) => { if (!o) setEditingComment(null); }}
          comment={editingComment.comment}
          onSave={(draft_copy) => {
            updateComment.mutate({ id: editingComment.id, draft_copy });
            setEditingComment(null);
          }}
          isPending={updateComment.isPending}
        />
      )}

      {/* Delete confirm */}
      <DeleteConfirmDialog
        open={!!deletingItem}
        onOpenChange={() => setDeletingItem(null)}
        onConfirm={async () => {
          if (!deletingItem) return;
          if (deletingItem.type === "comment") {
            await deleteComment.mutateAsync(deletingItem.id);
          } else {
            await deleteCard.mutateAsync(deletingItem.id);
          }
          setDeletingItem(null);
        }}
        title={deletingItem?.type === "comment" ? "this comment" : "this post card"}
        isPending={deleteCard.isPending || deleteComment.isPending}
      />
    </div>
  );
}
