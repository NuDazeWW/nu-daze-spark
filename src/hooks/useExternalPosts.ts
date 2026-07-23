import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveClient } from "@/contexts/ClientContext";
import type { Tables, Database } from "@/integrations/supabase/types";

export type ExternalPost = Tables<"external_posts">;
export type Comment = Tables<"comments">;
type PlatformType = Database["public"]["Enums"]["platform_type"];
type RiskFlag = Database["public"]["Enums"]["risk_flag"];

export function useExternalPosts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeClientId } = useActiveClient();

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ["external_posts", activeClientId],
    queryFn: async () => {
      let q = supabase.from("external_posts").select("*").order("created_at", { ascending: false });
      if (activeClientId) q = q.eq("client_id", activeClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ExternalPost[];
    },
    enabled: !!user && !!activeClientId,
  });

  const { data: commentsMap = {} } = useQuery({
    queryKey: ["external_post_comments", activeClientId],
    queryFn: async () => {
      let q = supabase.from("comments").select("*").order("created_at", { ascending: false });
      if (activeClientId) q = q.eq("client_id", activeClientId);
      const { data, error } = await q;
      if (error) throw error;
      const map: Record<string, Comment> = {};
      for (const c of data as Comment[]) {
        if (!map[c.external_post_id]) {
          map[c.external_post_id] = c;
        }
      }
      return map;
    },
    enabled: !!user && !!activeClientId,
  });

  // Daily target progress
  const { data: dailyTarget } = useQuery({
    queryKey: ["engagement_daily_target", activeClientId],
    queryFn: async () => {
      let tq = supabase.from("engagement_targets").select("daily_target, platform").eq("is_active", true);
      if (activeClientId) tq = tq.eq("client_id", activeClientId);
      const { data } = await tq;
      const total = (data || []).reduce((sum: number, t: any) => sum + (t.daily_target || 0), 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let cq = supabase
        .from("external_posts")
        .select("id", { count: "exact", head: true })
        .eq("is_commented", true)
        .gte("updated_at", todayStart.toISOString());
      if (activeClientId) cq = cq.eq("client_id", activeClientId);
      const { count } = await cq;

      return { target: total, completed: count || 0 };
    },
    enabled: !!user && !!activeClientId,
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, draft_copy }: { id: string; draft_copy: string }) => {
      const { error } = await supabase
        .from("comments")
        .update({ draft_copy, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["external_post_comments"] });
      qc.invalidateQueries({ queryKey: ["comments_queue"] });
      toast({ title: "Comment updated" });
    },
    onError: (e) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const markCommented = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("external_posts")
        .update({ is_commented: true } as never)
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["external_posts"] });
      qc.invalidateQueries({ queryKey: ["engagement_daily_target"] });
    },
    onError: (e) => toast({ title: "Failed to mark as commented", description: e.message, variant: "destructive" }),
  });

  const unmarkCommented = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("external_posts")
        .update({ is_commented: false } as never)
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["external_posts"] });
      qc.invalidateQueries({ queryKey: ["engagement_daily_target"] });
      toast({ title: "Post returned to active queue" });
    },
    onError: (e) => toast({ title: "Failed to unmark", description: e.message, variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("external_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["external_posts"] });
      qc.invalidateQueries({ queryKey: ["external_post_comments"] });
      toast({ title: "Post deleted" });
    },
    onError: (e) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const bulkDelete = useMutation({
    mutationFn: async (postIds: string[]) => {
      const { error } = await supabase
        .from("external_posts")
        .delete()
        .in("id", postIds);
      if (error) throw error;
    },
    onSuccess: (_d, postIds) => {
      qc.invalidateQueries({ queryKey: ["external_posts"] });
      qc.invalidateQueries({ queryKey: ["external_post_comments"] });
      toast({ title: `${postIds.length} post(s) deleted` });
    },
    onError: (e) => toast({ title: "Bulk delete failed", description: e.message, variant: "destructive" }),
  });

  const bulkMarkCommented = useMutation({
    mutationFn: async (postIds: string[]) => {
      const { error } = await supabase
        .from("external_posts")
        .update({ is_commented: true } as never)
        .in("id", postIds);
      if (error) throw error;
    },
    onSuccess: (_d, postIds) => {
      qc.invalidateQueries({ queryKey: ["external_posts"] });
      qc.invalidateQueries({ queryKey: ["engagement_daily_target"] });
      toast({ title: `${postIds.length} post(s) marked as commented` });
    },
    onError: (e) => toast({ title: "Bulk action failed", description: e.message, variant: "destructive" }),
  });

  const addPost = useMutation({
    mutationFn: async (post: {
      external_url: string;
      platform: PlatformType;
      author_name?: string;
      post_content?: string;
      topic?: string;
      relevance_score?: number;
      risk_flag?: RiskFlag;
      risk_notes?: string;
      recommended_comment_angle?: string;
    }) => {
      const { data, error } = await supabase
        .from("external_posts")
        .insert(post as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["external_posts"] });
      toast({ title: "External post added" });
    },
    onError: (e) => toast({ title: "Failed to add post", description: e.message, variant: "destructive" }),
  });

  const generateComments = useMutation({
    mutationFn: async (postIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("generate-comments", {
        body: { external_post_ids: postIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["external_posts"] });
      qc.invalidateQueries({ queryKey: ["external_post_comments"] });
      qc.invalidateQueries({ queryKey: ["comments_queue"] });
      toast({
        title: `${data.count} comment${data.count !== 1 ? "s" : ""} generated`,
        description: "Draft comments are ready for review.",
      });
    },
    onError: (e) => toast({ title: "Generation failed", description: e.message, variant: "destructive" }),
  });

  const scrapePosts = useMutation({
    mutationFn: async (params: { platform?: string; query?: string }) => {
      const { data, error } = await supabase.functions.invoke("scrape-posts", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["external_posts"] });
      qc.invalidateQueries({ queryKey: ["external_post_comments"] });
      qc.invalidateQueries({ queryKey: ["comments_queue"] });
      toast({
        title: data.count > 0
          ? `${data.count} post${data.count !== 1 ? "s" : ""} discovered`
          : "No new posts found",
        description: data.count > 0
          ? `${data.comments_created || 0} comment draft${(data.comments_created || 0) !== 1 ? "s" : ""} auto-generated.`
          : data.message || "Try a different search query.",
      });
    },
    onError: (e) => toast({ title: "Scrape failed", description: e.message, variant: "destructive" }),
  });

  return {
    posts, isLoading, error,
    addPost, generateComments, scrapePosts,
    commentsMap, updateComment,
    markCommented, unmarkCommented,
    deletePost, bulkDelete, bulkMarkCommented,
    dailyTarget,
  };
}
