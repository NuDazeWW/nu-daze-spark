import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ApprovalStatus = Database["public"]["Enums"]["approval_status"];
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

export interface CadenceProgress {
  platform: string;
  content_type: string;
  weekly_target: number;
  current_count: number;
}

export interface PipelineCount {
  status: string;
  count: number;
}

export interface CommentProgress {
  platform: string;
  daily_target: number;
  current_count: number;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const dayStart = startOfDay(now).toISOString();
  const dayEnd = endOfDay(now).toISOString();

  const cadenceQuery = useQuery({
    queryKey: ["dashboard_cadence", weekStart],
    queryFn: async (): Promise<CadenceProgress[]> => {
      // Fetch active targets
      const { data: targets, error: tErr } = await supabase
        .from("cadence_targets")
        .select("platform, content_type, weekly_target")
        .eq("is_active", true);
      if (tErr) throw tErr;

      // Fetch post cards this week with status >= approved
      const approvedStatuses = ["approved", "exported", "posted"];
      const { data: cards, error: cErr } = await supabase
        .from("post_cards")
        .select("platform, content_type")
        .in("approval_status", approvedStatuses)
        .gte("created_at", weekStart)
        .lte("created_at", weekEnd);
      if (cErr) throw cErr;

      // Count per target
      return (targets ?? []).map((t) => {
        const count = (cards ?? []).filter(
          (c) => c.platform === t.platform && c.content_type === t.content_type
        ).length;
        return {
          platform: t.platform,
          content_type: t.content_type,
          weekly_target: t.weekly_target,
          current_count: count,
        };
      });
    },
    enabled: !!user,
  });

  const pipelineQuery = useQuery({
    queryKey: ["dashboard_pipeline"],
    queryFn: async (): Promise<PipelineCount[]> => {
      const statuses = [
        "draft",
        "in_review",
        "needs_revision",
        "approved",
        "exported",
        "posted",
        "archived",
      ];
      const results: PipelineCount[] = [];
      for (const status of statuses) {
        const { count, error } = await supabase
          .from("post_cards")
          .select("*", { count: "exact", head: true })
          .eq("approval_status", status);
        if (error) throw error;
        results.push({ status, count: count ?? 0 });
      }
      return results;
    },
    enabled: !!user,
  });

  const commentQuery = useQuery({
    queryKey: ["dashboard_comments", dayStart],
    queryFn: async (): Promise<CommentProgress[]> => {
      const { data: targets, error: tErr } = await supabase
        .from("engagement_targets")
        .select("platform, daily_target")
        .eq("is_active", true);
      if (tErr) throw tErr;

      const { data: posts, error: pErr } = await supabase
        .from("external_posts")
        .select("platform")
        .eq("is_commented", true)
        .gte("updated_at", dayStart)
        .lte("updated_at", dayEnd);
      if (pErr) throw pErr;

      return (targets ?? []).map((t) => ({
        platform: t.platform,
        daily_target: t.daily_target,
        current_count: (posts ?? []).filter((p) => p.platform === t.platform).length,
      }));
    },
    enabled: !!user,
  });

  const recentQuery = useQuery({
    queryKey: ["dashboard_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_cards")
        .select("id, platform, content_type, approval_status, draft_copy, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  return {
    cadence: cadenceQuery.data ?? [],
    pipeline: pipelineQuery.data ?? [],
    comments: commentQuery.data ?? [],
    recentCards: recentQuery.data ?? [],
    isLoading:
      cadenceQuery.isLoading ||
      pipelineQuery.isLoading ||
      commentQuery.isLoading ||
      recentQuery.isLoading,
    error:
      cadenceQuery.error || pipelineQuery.error || commentQuery.error || recentQuery.error,
  };
}
