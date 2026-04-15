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
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const trashedQuery = useQuery({
    queryKey: ["source_assets_trashed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_assets")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
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

  const softDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("source_assets")
        .update({ deleted_at: new Date().toISOString(), updated_by: user!.id } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source_assets"] });
      queryClient.invalidateQueries({ queryKey: ["source_assets_trashed"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error deleting asset", description: e.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("source_assets")
        .update({ deleted_at: null, updated_by: user!.id } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source_assets"] });
      queryClient.invalidateQueries({ queryKey: ["source_assets_trashed"] });
      toast({ title: "Asset restored" });
    },
    onError: (e: Error) => {
      toast({ title: "Error restoring asset", description: e.message, variant: "destructive" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("source_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source_assets_trashed"] });
      toast({ title: "Asset permanently deleted" });
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

  const buildDownloadName = (filePath: string, assetType: string) => {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "file";
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
    return `NuDazeSocialEngine.upload.${date}_${time}.${assetType}.${ext}`;
  };

  const downloadAsset = async (filePath: string, assetType: string) => {
    const { data, error } = await supabase.storage
      .from("source-assets")
      .createSignedUrl(filePath, 60);
    if (error) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = buildDownloadName(filePath, assetType);
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = buildDownloadName(filePath, assetType);
      a.target = "_blank";
      a.click();
    }
  };

  const summaryMap = new Map<string, AssetSummary>();
  (summariesQuery.data ?? []).forEach((s) => summaryMap.set(s.asset_id, s));

  return {
    assets: assetsQuery.data ?? [],
    trashedAssets: trashedQuery.data ?? [],
    summaryMap,
    isLoading: assetsQuery.isLoading,
    error: assetsQuery.error,
    isAdmin,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    softDelete: softDeleteMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    permanentDelete: permanentDeleteMutation.mutateAsync,
    uploadFile,
    downloadAsset,
    isInserting: insertMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: softDeleteMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isPermanentDeleting: permanentDeleteMutation.isPending,
  };
}
