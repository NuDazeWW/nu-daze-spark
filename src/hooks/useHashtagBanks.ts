import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useActiveHashtagBanks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["hashtag_banks", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hashtag_banks")
        .select("id, bank_name, category, hashtags")
        .eq("is_active", true)
        .order("bank_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
