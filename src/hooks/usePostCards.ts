import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveClient } from "@/contexts/ClientContext";
import type { Tables, Database } from "@/integrations/supabase/types";

export type PostCard = Tables<"post_cards">;
export type Comment = Tables<"comments">;
export type ExternalPost = Tables<"external_posts">;
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

export interface CommentWithPost extends Comment {
  external_posts: ExternalPost | null;
}

// Unified queue item — either a post card or a comment
export type QueueItemType = "post" | "comment";

export interface QueueItem {
  type: QueueItemType;
  id: string;
  approval_status: ApprovalStatus;
  draft_copy: string;
  platform: string;
  created_at: string;
  postCard?: PostCard;
  comment?: CommentWithPost;
}

export const APPROVAL_FLOW: ApprovalStatus[] = [
  "draft", "in_review", "needs_revision", "approved", "exported", "posted", "archived",
];

export const STATUS_META: Record<ApprovalStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "sm-status sm-status-draft" },
  in_review: { label: "In Review", color: "sm-status sm-status-in_review" },
  needs_revision: { label: "Needs Revision", color: "sm-status sm-status-needs_revision" },
  approved: { label: "Approved", color: "sm-status sm-status-approved" },
  exported: { label: "Exported", color: "sm-status sm-status-exported" },
  posted: { label: "Posted", color: "sm-status sm-status-posted" },
  archived: { label: "Archived", color: "sm-status sm-status-archived" },
};

export function usePostCards() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeClientId } = useActiveClient();

  const { data: cards = [], isLoading: cardsLoading, error: cardsError } = useQuery({
    queryKey: ["post_cards", activeClientId],
    queryFn: async () => {
      let q = supabase.from("post_cards").select("*").order("created_at", { ascending: false });
      if (activeClientId) q = q.eq("client_id", activeClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data as PostCard[];
    },
    enabled: !!user && !!activeClientId,
  });

  const { data: comments = [], isLoading: commentsLoading, error: commentsError } = useQuery({
    queryKey: ["comments_queue", activeClientId],
    queryFn: async () => {
      let q = supabase.from("comments").select("*, external_posts(*)").order("created_at", { ascending: false });
      if (activeClientId) q = q.eq("client_id", activeClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CommentWithPost[];
    },
    enabled: !!user && !!activeClientId,
  });

  // Build unified queue
  const queueItems: QueueItem[] = [
    ...cards.map((c): QueueItem => ({
      type: "post",
      id: c.id,
      approval_status: c.approval_status,
      draft_copy: c.draft_copy,
      platform: c.platform,
      created_at: c.created_at,
      postCard: c,
    })),
    ...comments.map((c): QueueItem => ({
      type: "comment",
      id: c.id,
      approval_status: c.approval_status,
      draft_copy: c.draft_copy,
      platform: c.external_posts?.platform ?? "linkedin",
      created_at: c.created_at,
      comment: c,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isLoading = cardsLoading || commentsLoading;
  const error = cardsError || commentsError;

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes, itemType }: { id: string; status: ApprovalStatus; notes?: string; itemType?: QueueItemType }) => {
      if (itemType === "comment") {
        const updates: Record<string, unknown> = {
          approval_status: status,
          updated_by: user!.id,
        };
        const { error } = await supabase.from("comments").update(updates as never).eq("id", id);
        if (error) throw error;
      } else {
        const updates: Record<string, unknown> = {
          approval_status: status,
          updated_by: user!.id,
        };
        if (notes !== undefined) updates.revision_notes = notes;
        const { error } = await supabase.from("post_cards").update(updates as never).eq("id", id);
        if (error) throw error;
        // Log the action
        await supabase.from("approval_log").insert({
          post_card_id: id,
          actor_id: user!.id,
          action: status,
          notes: notes || null,
        } as never);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post_cards"] });
      qc.invalidateQueries({ queryKey: ["comments_queue"] });
    },
    onError: (e) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<PostCard> & { id: string }) => {
      if (typeof fields.draft_copy === "string") {
        const { data: prev } = await supabase.from("post_cards")
          .select("draft_copy, hashtags, people_tags, org_tags, client_id").eq("id", id).maybeSingle();
        if (prev && prev.draft_copy !== fields.draft_copy) {
          const { count } = await supabase.from("post_versions").select("id", { count: "exact", head: true }).eq("post_card_id", id);
          await supabase.from("post_versions").insert({
            post_card_id: id, version_number: (count ?? 0) + 1, draft_copy: prev.draft_copy,
            hashtags: prev.hashtags, people_tags: prev.people_tags, org_tags: prev.org_tags,
            edit_source: "before_human_edit", created_by: user!.id, client_id: prev.client_id,
          } as never);
        }
      }
      const { error } = await supabase
        .from("post_cards")
        .update({ ...fields, updated_by: user!.id } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post_cards"] });
      toast({ title: "Post card updated" });
    },
    onError: (e) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const reschedulePost = useMutation({
    mutationFn: async ({ id, scheduled_for, platform }: { id: string; scheduled_for: string; platform?: PostCard["platform"] }) => {
      const updates: Record<string, unknown> = { scheduled_for, updated_by: user!.id };
      if (platform) updates.platform = platform;
      const { error } = await supabase.from("post_cards").update(updates as never).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, scheduled_for, platform }) => {
      await qc.cancelQueries({ queryKey: ["post_cards", activeClientId] });
      const prev = qc.getQueryData<PostCard[]>(["post_cards", activeClientId]);
      if (prev) {
        qc.setQueryData<PostCard[]>(
          ["post_cards", activeClientId],
          prev.map((c) => (c.id === id ? { ...c, scheduled_for, ...(platform ? { platform } : {}) } : c)),
        );
      }
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["post_cards", activeClientId], ctx.prev);
      toast({ title: "Reschedule failed", description: e.message, variant: "destructive" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["post_cards"] }),
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, draft_copy }: { id: string; draft_copy: string }) => {
      const { error } = await supabase
        .from("comments")
        .update({ draft_copy, updated_by: user!.id } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments_queue"] });
      toast({ title: "Comment updated" });
    },
    onError: (e) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("post_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post_cards"] });
      toast({ title: "Post card deleted" });
    },
    onError: (e) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments_queue"] });
      toast({ title: "Comment deleted" });
    },
    onError: (e) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return {
    cards,
    comments,
    queueItems,
    isLoading,
    error,
    isAdmin,
    updateStatus,
    updateCard,
    updateComment,
    deleteCard,
    deleteComment,
    reschedulePost,
  };
}
