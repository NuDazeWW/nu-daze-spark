import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns a map of asset_id → number of post_cards that reference it.
 */
export function useAssetUsage() {
  const { user } = useAuth();

  const { data: usageMap = new Map<string, number>(), isLoading } = useQuery({
    queryKey: ["asset_usage_counts"],
    queryFn: async () => {
      // Get all post cards' source_references arrays
      const { data, error } = await supabase
        .from("post_cards")
        .select("source_references");
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const card of data ?? []) {
        const refs = card.source_references ?? [];
        for (const ref of refs) {
          counts.set(ref, (counts.get(ref) || 0) + 1);
        }
      }
      return counts;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { usageMap, isLoading };
}
