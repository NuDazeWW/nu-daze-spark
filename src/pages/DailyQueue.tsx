import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyCalendarView } from "@/components/queue/WeeklyCalendarView";
import {
  CalendarDays, Search, AlertCircle, Inbox, FileText, MessageSquare, LayoutGrid, Upload, List,
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingPostCard, setEditingPostCard] = useState<typeof queueItems[0] | null>(null);
  const [editingComment, setEditingComment] = useState<typeof queueItems[0] | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ id: string; type: QueueItemType } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  const filtered = useMemo(() => {
    return queueItems.filter((item) => {
      if (statusFilter !== "all" && item.approval_status !== statusFilter) return false;
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [
          item.draft_copy,
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
    <div className="animate-fade-in">
      <PageHeader
        title="Daily Content Queue"
        description={`${activeCount} active item${activeCount !== 1 ? "s" : ""} in the pipeline · ${typeCounts.post} post${typeCounts.post !== 1 ? "s" : ""} · ${typeCounts.comment} comment${typeCounts.comment !== 1 ? "s" : ""}`}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView(view === "list" ? "calendar" : "list")}
        >
          {view === "list" ? (
            <><CalendarDays className="h-4 w-4 mr-1.5" />Calendar view</>
          ) : (
            <><List className="h-4 w-4 mr-1.5" />List view</>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" />Import schedule
        </Button>
      </PageHeader>

      <ScheduleImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Type filter pills */}
      <div className="flex items-center gap-2 mb-4">
        {TYPE_FILTERS.map((tf) => {
          const count = tf.value === "all" ? queueItems.length : (typeCounts[tf.value] || 0);
          const Icon = tf.icon;
          const isActive = typeFilter === tf.value;
          return (
            <button
              key={tf.value}
              onClick={() => setTypeFilter(tf.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="h-3 w-3" />
              {tf.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] px-1 text-[10px]">{count}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {STATUS_FILTERS.map((sf) => {
            const count = sf.value === "all" ? queueItems.length : (statusCounts[sf.value] || 0);
            return (
              <TabsTrigger
                key={sf.value}
                value={sf.value}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs px-3 py-1.5 rounded-full border"
              >
                {sf.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 min-w-[16px] px-1 text-[10px]">{count}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search queue…" className="pl-9" />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
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
                />
              );
            }
            return null;
          })}
        </div>
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
