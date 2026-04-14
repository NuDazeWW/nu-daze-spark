import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables, Database } from "@/integrations/supabase/types";

export type PostCard = Tables<"post_cards">;
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

export const APPROVAL_FLOW: ApprovalStatus[] = [
  "draft", "in_review", "needs_revision", "approved", "exported", "posted", "archived",
];

export const STATUS_META: Record<ApprovalStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  in_review: { label: "In Review", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  needs_revision: { label: "Needs Revision", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  approved: { label: "Approved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  exported: { label: "Exported", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  posted: { label: "Posted", color: "bg-primary/15 text-primary border-primary/30" },
  archived: { label: "Archived", color: "bg-muted text-muted-foreground/60" },
};

export function usePostCards() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ["post_cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PostCard[];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: ApprovalStatus; notes?: string }) => {
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
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["post_cards"] }); },
    onError: (e) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<PostCard> & { id: string }) => {
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

  return {
    cards,
    isLoading,
    error,
    isAdmin,
    updateStatus,
    updateCard,
    deleteCard,
  };
}
