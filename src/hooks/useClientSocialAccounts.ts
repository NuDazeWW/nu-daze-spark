import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SocialAccount = {
  id: string;
  client_id: string;
  platform: string;
  account_name: string;
  handle: string | null;
  profile_url: string | null;
  is_active: boolean;
};

export function useClientSocialAccounts(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ["social_accounts", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("id,client_id,platform,account_name,handle,profile_url,is_active")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .order("platform");
      if (error) throw error;
      return (data ?? []) as SocialAccount[];
    },
  });
}

/** Where to go to create a post. Uses platform composers when they exist; otherwise the saved profile page. */
export function postingUrl(platform: string, account?: SocialAccount | null): string | null {
  if (platform === "linkedin") return "https://www.linkedin.com/feed/?shareActive=true";
  return account?.profile_url ?? null;
}

export const PLATFORM_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
};
