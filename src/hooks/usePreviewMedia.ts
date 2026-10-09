import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostCard } from "@/hooks/usePostCards";
import { isPreviewMedia } from "@/lib/nativePreview";

export interface PreviewMedia { id: string; title: string; asset_type: string; url: string | null }

export function usePreviewMedia(card: PostCard, enabled: boolean) {
  const refs = card.source_references ?? [];
  return useQuery({
    queryKey: ["native_preview_media", card.client_id, refs.join(",")],
    enabled: enabled && refs.length > 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 15,
    queryFn: async (): Promise<PreviewMedia[]> => {
      let query = supabase.from("source_assets")
        .select("id,title,asset_type,file_path,permission_state,deleted_at,expires_at")
        .in("id", refs);
      if (card.client_id) query = query.eq("client_id", card.client_id);
      const { data, error } = await query;
      if (error) throw error;
      const byId = new Map((data ?? []).filter(isPreviewMedia).map((asset) => [asset.id, asset]));
      return Promise.all(refs.flatMap((id) => {
        const asset = byId.get(id);
        if (!asset) return [];
        return [asset];
      }).map(async (asset) => {
        // Only stored media has a known image/video payload; webpage URLs are not media.
        const { data: signed } = asset.file_path
          ? await supabase.storage.from("source-assets").createSignedUrl(asset.file_path, 60 * 30)
          : { data: null };
        return { id: asset.id, title: asset.title, asset_type: asset.asset_type, url: signed?.signedUrl ?? null };
      }));
    },
  });
}