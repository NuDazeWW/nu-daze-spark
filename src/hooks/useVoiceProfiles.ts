import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type VoiceProfile = Tables<"voice_profiles">;

export function useVoiceProfiles() {
  const { user } = useAuth();
  const { activeClientId } = useActiveClient();
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["voice_profiles", activeClientId];

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user && !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_profiles")
        .select("*")
        .eq("client_id", activeClientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VoiceProfile[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<VoiceProfile> & { name: string }) => {
      const { id, ...fields } = p;
      if (id) {
        const { error } = await supabase.from("voice_profiles").update(fields as never).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("voice_profiles")
          .insert({ ...fields, client_id: activeClientId, created_by: user!.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Voice profile saved" });
    },
    onError: (e) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voice_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Voice profile deleted" });
    },
    onError: (e) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const analyze = useMutation({
    mutationFn: async (input: { name: string; role_title?: string; sample_posts: string[] }) => {
      const { data, error } = await supabase.functions.invoke("analyze-voice", { body: input });
      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json(); msg = body?.error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data.profile as {
        voice_traits: string[]; topics: string[]; banned_phrases: string[]; pov_statement: string;
      };
    },
    onError: (e: Error) => toast({ title: "Voice analysis failed", description: e.message, variant: "destructive" }),
  });

  return { profiles, isLoading, save, remove, analyze };
}
