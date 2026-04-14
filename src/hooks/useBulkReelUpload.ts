import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface UploadProgress {
  current: number;
  total: number;
  stage: string;
}

export function useBulkReelUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ current: 0, total: 0, stage: "" });

  const uploadAndCreateReels = async (files: File[]) => {
    if (!user) return;
    setIsPending(true);
    const total = files.length;
    const assetIds: string[] = [];

    try {
      // Step 1: Upload each file and create source_assets
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: total + 1, stage: `Uploading ${file.name}…` });

        // Upload to storage
        const ext = file.name.split(".").pop();
        const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("source-assets")
          .upload(storagePath, file);

        if (uploadError) {
          toast({ title: `Failed to upload ${file.name}`, description: uploadError.message, variant: "destructive" });
          continue;
        }

        // Create source_asset record
        const isImage = file.type.startsWith("image/");
        const { data: asset, error: assetError } = await supabase
          .from("source_assets")
          .insert({
            title: file.name.replace(/\.[^/.]+$/, ""),
            description: `Bulk uploaded for reel creation`,
            asset_type: isImage ? "image" as const : "video" as const,
            permission_state: "generation_allowed" as const,
            is_nudaze_origin: true,
            file_path: storagePath,
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (assetError) {
          toast({ title: `Failed to save ${file.name}`, description: assetError.message, variant: "destructive" });
          continue;
        }

        assetIds.push(asset.id);
      }

      if (assetIds.length === 0) {
        toast({ title: "No files uploaded successfully", variant: "destructive" });
        return;
      }

      // Step 2: Call edge function to generate reel post cards
      setProgress({ current: total, total: total + 1, stage: "Generating reel content with AI…" });

      const { data, error } = await supabase.functions.invoke("generate-reels", {
        body: { asset_ids: assetIds },
      });

      if (error) {
        toast({ title: "Error generating reels", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.error) {
        toast({ title: "Error generating reels", description: data.error, variant: "destructive" });
        return;
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["source_assets"] });
      queryClient.invalidateQueries({ queryKey: ["post_cards"] });

      toast({
        title: `${data.count} reel${data.count !== 1 ? "s" : ""} created`,
        description: "Assets uploaded and AI-generated reel post cards are ready for review.",
      });
    } catch (e) {
      toast({
        title: "Unexpected error",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
      setProgress({ current: 0, total: 0, stage: "" });
    }
  };

  return { uploadAndCreateReels, isPending, progress };
}
