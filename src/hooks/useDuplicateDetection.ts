import { useMemo } from "react";
import type { SourceAsset } from "@/hooks/useAssets";
import { toast } from "sonner";

/**
 * Check for potential duplicates based on title similarity.
 * Returns matching asset titles if found.
 */
export function useDuplicateDetection(assets: SourceAsset[]) {
  const checkDuplicate = useMemo(() => {
    return (title: string, fileName?: string): SourceAsset | null => {
      const normalizedTitle = title.trim().toLowerCase();
      const normalizedFileName = fileName?.trim().toLowerCase().replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      for (const asset of assets) {
        const existingTitle = asset.title.trim().toLowerCase();
        // Exact title match
        if (existingTitle === normalizedTitle) return asset;
        // File name matches existing title
        if (normalizedFileName && existingTitle === normalizedFileName) return asset;
      }
      return null;
    };
  }, [assets]);

  const warnIfDuplicate = (title: string, fileName?: string): boolean => {
    const match = checkDuplicate(title, fileName);
    if (match) {
      toast.warning(`Possible duplicate detected`, {
        description: `An asset named "${match.title}" already exists. You can still proceed.`,
        duration: 6000,
      });
      return true;
    }
    return false;
  };

  return { checkDuplicate, warnIfDuplicate };
}
