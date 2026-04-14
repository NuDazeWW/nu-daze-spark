import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface AccountTag {
  id: string;
  handle: string;
  display_name: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export function useAccountTags() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["account_tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_tags")
        .select("*")
        .order("is_default", { ascending: false })
        .order("handle");
      if (error) throw error;
      return data as AccountTag[];
    },
    enabled: !!user,
  });

  const defaultTags = tags.filter((t) => t.is_default);

  const insertTag = useMutation({
    mutationFn: async (tag: { handle: string; display_name?: string; is_default?: boolean }) => {
      const { error } = await supabase.from("account_tags").insert({
        handle: tag.handle,
        display_name: tag.display_name || null,
        is_default: tag.is_default ?? false,
        created_by: user!.id,
        updated_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account_tags"] }); toast({ title: "Tag added" }); },
    onError: (e) => toast({ title: "Failed to add tag", description: e.message, variant: "destructive" }),
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; handle?: string; display_name?: string; is_default?: boolean }) => {
      const { error } = await supabase.from("account_tags").update({ ...fields, updated_by: user!.id } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account_tags"] }); toast({ title: "Tag updated" }); },
    onError: (e) => toast({ title: "Failed to update tag", description: e.message, variant: "destructive" }),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("account_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account_tags"] }); toast({ title: "Tag removed" }); },
    onError: (e) => toast({ title: "Failed to remove tag", description: e.message, variant: "destructive" }),
  });

  return { tags, defaultTags, isLoading, isAdmin, insertTag, updateTag, deleteTag };
}
