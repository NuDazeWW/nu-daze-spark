import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type SourceAsset = Tables<"source_assets">;
export type AssetSummary = Tables<"asset_summaries">;

export function useAssets() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const assetsQuery = useQuery({
    queryKey: ["source_assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const summariesQuery = useQuery({
    queryKey: ["asset_summaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_summaries")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const insertMutation = useMutation({
    mutationFn: async (row: Partial<SourceAsset>) => {
      const { data, error } = await supabase
        .from("source_assets")
        .insert({ ...row, created_by: user!.id, updated_by: user!.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source_assets"] });
      toast({ title: "Asset created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error creating asset", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...row }: Partial<SourceAsset> & { id: string }) => {
      const { data, error } = await supabase
        .from("source_assets")
        .update({ ...row, updated_by: user!.id } as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source_assets"] });
      toast({ title: "Asset updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error updating asset", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("source_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source_assets"] });
      toast({ title: "Asset deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error deleting asset", description: e.message, variant: "destructive" });
    },
  });

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("source-assets").upload(path, file);
    if (error) throw error;
    return path;
  };

  const downloadAsset = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("source-assets")
      .createSignedUrl(filePath, 60);
    if (error) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  };

  const summaryMap = new Map<string, AssetSummary>();
  (summariesQuery.data ?? []).forEach((s) => summaryMap.set(s.asset_id, s));

  return {
    assets: assetsQuery.data ?? [],
    summaryMap,
    isLoading: assetsQuery.isLoading,
    error: assetsQuery.error,
    isAdmin,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    uploadFile,
    isInserting: insertMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
