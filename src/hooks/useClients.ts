import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;

export function useClients() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user,
  });

  return {
    clients: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
