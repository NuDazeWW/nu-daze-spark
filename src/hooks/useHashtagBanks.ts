import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";

export function useActiveHashtagBanks() {
  const { user } = useAuth();
  const { activeClientId } = useActiveClient();

  return useQuery({
    queryKey: ["hashtag_banks", "active", activeClientId],
    queryFn: async () => {
      let q = supabase
        .from("hashtag_banks")
        .select("id, bank_name, category, hashtags")
        .eq("is_active", true)
        .order("bank_name");
      if (activeClientId) q = q.eq("client_id", activeClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!activeClientId,
  });
}
