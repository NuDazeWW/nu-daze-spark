import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { PostCard } from '@/hooks/usePostCards';
import type { Readiness } from '@/lib/readiness';
export function useReadiness(card: PostCard | null) {
  const { settings } = useWorkspace();
  return useQuery({
    queryKey: ['authoritative_readiness', card?.id, card?.updated_at, card?.readiness_changed_at, card?.readiness_revision, settings?.governance_revision],
    enabled: Boolean(card),
    refetchInterval: 15000,
    queryFn: async (): Promise<Readiness> => {
      if (!card) throw new Error('No post selected');
      const { data, error } = await supabase.rpc('post_readiness', { _post: card.id });
      if (error) throw error;
      return data as unknown as Readiness;
    },
  });
}
