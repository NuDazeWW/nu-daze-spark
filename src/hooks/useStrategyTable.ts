import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type TableName =
  | "brand_voice_rules"
  | "platform_rules"
  | "audience_definitions"
  | "campaign_rules"
  | "hashtag_banks"
  | "cta_banks"
  | "cadence_targets"
  | "engagement_targets";

export function useStrategyTable<T extends Record<string, unknown>>(table: TableName) {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as T[];
    },
    enabled: !!user,
  });

  const insertMutation = useMutation({
    mutationFn: async (row: Partial<T>) => {
      const { data, error } = await supabase
        .from(table)
        .insert({ ...row, created_by: user?.id, updated_by: user?.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast({ title: "Created successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Error creating", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...row }: Partial<T> & { id: string }) => {
      const { data, error } = await supabase
        .from(table)
        .update({ ...row, updated_by: user?.id } as never)
        .eq("id", id as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast({ title: "Updated successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Error updating", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast({ title: "Deleted successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Error deleting", description: e.message, variant: "destructive" });
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isAdmin,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isInserting: insertMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
