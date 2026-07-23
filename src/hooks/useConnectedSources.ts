import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveClient } from "@/contexts/ClientContext";
import type { Tables } from "@/integrations/supabase/types";

export type ConnectedSource = Tables<"connected_sources">;

export function useConnectedSources() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { activeClientId } = useActiveClient();

  const query = useQuery({
    queryKey: ["connected_sources", activeClientId],
    queryFn: async () => {
      let q = supabase.from("connected_sources").select("*").order("created_at", { ascending: false });
      if (activeClientId) q = q.eq("client_id", activeClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin && !!activeClientId,
  });

  const insertMutation = useMutation({
    mutationFn: async (row: Partial<ConnectedSource>) => {
      const { data, error } = await supabase
        .from("connected_sources")
        .insert({ ...row, created_by: user!.id, updated_by: user!.id, client_id: activeClientId } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected_sources"] });
      toast({ title: "Source created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error creating source", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...row }: Partial<ConnectedSource> & { id: string }) => {
      const { data, error } = await supabase
        .from("connected_sources")
        .update({ ...row, updated_by: user!.id } as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected_sources"] });
      toast({ title: "Source updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error updating source", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("connected_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected_sources"] });
      toast({ title: "Source deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error deleting source", description: e.message, variant: "destructive" });
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
