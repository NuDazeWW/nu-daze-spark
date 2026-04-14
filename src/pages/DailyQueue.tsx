import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePostCards, STATUS_META, type ApprovalStatus } from "@/hooks/usePostCards";
import { PostCardItem } from "@/components/queue/PostCardItem";
import { PostCardEditDialog } from "@/components/queue/PostCardEditDialog";
import { DeleteConfirmDialog } from "@/components/strategy/DeleteConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays, Search, AlertCircle, Inbox,
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

export default function DailyQueue() {
  const { cards, isLoading, error, isAdmin, updateStatus, updateCard, deleteCard } = usePostCards();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [editingCard, setEditingCard] = useState<typeof cards[0] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (statusFilter !== "all" && c.approval_status !== statusFilter) return false;
      if (platformFilter !== "all" && c.platform !== platformFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.draft_copy.toLowerCase().includes(q) &&
          !(c.objective ?? "").toLowerCase().includes(q) &&
          !(c.campaign_pillar ?? "").toLowerCase().includes(q) &&
          !(c.audience ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [cards, search, statusFilter, platformFilter]);

  // Count by status for tab badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of cards) {
      counts[c.approval_status] = (counts[c.approval_status] || 0) + 1;
    }
    return counts;
  }, [cards]);

  const activeCount = cards.filter((c) => !["archived", "posted"].includes(c.approval_status)).length;

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Daily Content Queue" description="Review, edit, approve, and export generated post cards." />
        <div className="space-y-3 py-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Daily Content Queue" description="Review, edit, approve, and export generated post cards." />
        <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription>Failed to load post cards: {error.message}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Daily Content Queue"
        description={`${activeCount} active post card${activeCount !== 1 ? "s" : ""} in the pipeline.`}
      />

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {STATUS_FILTERS.map((sf) => {
            const count = sf.value === "all" ? cards.length : (statusCounts[sf.value] || 0);
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search post cards…" className="pl-9" />
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
          icon={cards.length === 0 ? CalendarDays : Inbox}
          title={cards.length === 0 ? "Queue is empty" : "No matching post cards"}
          description={
            cards.length === 0
              ? "Generate post cards from the AI Post Generator to see them here."
              : "Try adjusting your search or filter."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((card) => (
            <PostCardItem
              key={card.id}
              card={card}
              isAdmin={isAdmin}
              onEdit={() => setEditingCard(card)}
              onStatusChange={(status, notes) => updateStatus.mutate({ id: card.id, status, notes })}
              onDelete={() => setDeletingId(card.id)}
              isUpdating={updateStatus.isPending}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editingCard && (
        <PostCardEditDialog
          open={!!editingCard}
          onOpenChange={(o) => { if (!o) setEditingCard(null); }}
          card={editingCard}
          onSave={(updates) => {
            updateCard.mutate({ id: editingCard.id, ...updates } as any);
            setEditingCard(null);
          }}
          isPending={updateCard.isPending}
        />
      )}

      {/* Delete confirm */}
      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={() => setDeletingId(null)}
        onConfirm={async () => { if (deletingId) { await deleteCard.mutateAsync(deletingId); setDeletingId(null); } }}
        title="this post card"
        isPending={deleteCard.isPending}
      />
    </div>
  );
}
