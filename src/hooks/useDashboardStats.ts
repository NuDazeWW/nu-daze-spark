import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ApprovalStatus = Database["public"]["Enums"]["approval_status"];
type PermissionState = Database["public"]["Enums"]["permission_state"];

import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { startOfWeek, endOfWeek, startOfDay, endOfDay, subWeeks } from "date-fns";

export interface CadenceProgress {
  platform: string;
  content_type: string;
  weekly_target: number;
  current_count: number;
  last_week_count: number;
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

export interface AssetHealth {
  permission_state: string;
  count: number;
}

export interface TotalStats {
  postsThisWeek: number;
  commentsToday: number;
  totalAssets: number;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const { activeClientId } = useActiveClient();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1).toISOString();
  const lastWeekEnd = subWeeks(endOfWeek(now, { weekStartsOn: 1 }), 1).toISOString();
  const dayStart = startOfDay(now).toISOString();
  const dayEnd = endOfDay(now).toISOString();

  const approvedStatuses: ApprovalStatus[] = ["approved", "exported", "posted"];
  const withClient = <T extends { eq: (col: string, val: string) => T }>(q: T): T =>
    activeClientId ? q.eq("client_id", activeClientId) : q;

  const cadenceQuery = useQuery({
    queryKey: ["dashboard_cadence", weekStart, activeClientId],
    queryFn: async (): Promise<CadenceProgress[]> => {
      const { data: targets, error: tErr } = await withClient(
        supabase.from("cadence_targets").select("platform, content_type, weekly_target").eq("is_active", true)
      );
      if (tErr) throw tErr;

      const { data: cards, error: cErr } = await withClient(
        supabase.from("post_cards").select("platform, content_type")
          .in("approval_status", approvedStatuses).gte("created_at", weekStart).lte("created_at", weekEnd)
      );
      if (cErr) throw cErr;

      const { data: lastCards, error: lErr } = await withClient(
        supabase.from("post_cards").select("platform, content_type")
          .in("approval_status", approvedStatuses).gte("created_at", lastWeekStart).lte("created_at", lastWeekEnd)
      );
      if (lErr) throw lErr;

      return (targets ?? []).map((t) => {
        const count = (cards ?? []).filter((c) => c.platform === t.platform && c.content_type === t.content_type).length;
        const lastCount = (lastCards ?? []).filter((c) => c.platform === t.platform && c.content_type === t.content_type).length;
        return {
          platform: t.platform,
          content_type: t.content_type,
          weekly_target: t.weekly_target,
          current_count: count,
          last_week_count: lastCount,
        };
      });
    },
    enabled: !!user && !!activeClientId,
  });

  const pipelineQuery = useQuery({
    queryKey: ["dashboard_pipeline", activeClientId],
    queryFn: async (): Promise<PipelineCount[]> => {
      const statuses: ApprovalStatus[] = ["draft", "in_review", "needs_revision", "approved", "exported", "posted", "archived"];
      const results: PipelineCount[] = [];
      for (const status of statuses) {
        const { count, error } = await withClient(
          supabase.from("post_cards").select("*", { count: "exact", head: true }).eq("approval_status", status)
        );
        if (error) throw error;
        results.push({ status, count: count ?? 0 });
      }
      return results;
    },
    enabled: !!user && !!activeClientId,
  });

  const commentQuery = useQuery({
    queryKey: ["dashboard_comments", dayStart, activeClientId],
    queryFn: async (): Promise<CommentProgress[]> => {
      const { data: targets, error: tErr } = await withClient(
        supabase.from("engagement_targets").select("platform, daily_target").eq("is_active", true)
      );
      if (tErr) throw tErr;

      const { data: posts, error: pErr } = await withClient(
        supabase.from("external_posts").select("platform").eq("is_commented", true)
          .gte("updated_at", dayStart).lte("updated_at", dayEnd)
      );
      if (pErr) throw pErr;

      return (targets ?? []).map((t) => ({
        platform: t.platform,
        daily_target: t.daily_target,
        current_count: (posts ?? []).filter((p) => p.platform === t.platform).length,
      }));
    },
    enabled: !!user && !!activeClientId,
  });

  const recentQuery = useQuery({
    queryKey: ["dashboard_recent", activeClientId],
    queryFn: async () => {
      const { data, error } = await withClient(
        supabase.from("post_cards")
          .select("id, platform, content_type, approval_status, draft_copy, updated_at")
          .order("updated_at", { ascending: false }).limit(5)
      );
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!activeClientId,
  });

  const assetHealthQuery = useQuery({
    queryKey: ["dashboard_asset_health", activeClientId],
    queryFn: async (): Promise<AssetHealth[]> => {
      const states: PermissionState[] = ["generation_allowed", "summarization_only", "blocked", "archived"];
      const results: AssetHealth[] = [];
      for (const state of states) {
        const { count, error } = await withClient(
          supabase.from("source_assets").select("*", { count: "exact", head: true })
            .eq("permission_state", state).is("deleted_at", null)
        );
        if (error) throw error;
        results.push({ permission_state: state, count: count ?? 0 });
      }
      return results;
    },
    enabled: !!user && !!activeClientId,
  });

  const totalStatsQuery = useQuery({
    queryKey: ["dashboard_totals", weekStart, dayStart, activeClientId],
    queryFn: async (): Promise<TotalStats> => {
      const { count: postsCount, error: pErr } = await withClient(
        supabase.from("post_cards").select("*", { count: "exact", head: true })
          .in("approval_status", approvedStatuses).gte("created_at", weekStart).lte("created_at", weekEnd)
      );
      if (pErr) throw pErr;

      const { count: commentsCount, error: cErr } = await withClient(
        supabase.from("external_posts").select("*", { count: "exact", head: true })
          .eq("is_commented", true).gte("updated_at", dayStart).lte("updated_at", dayEnd)
      );
      if (cErr) throw cErr;

      const { count: assetsCount, error: aErr } = await withClient(
        supabase.from("source_assets").select("*", { count: "exact", head: true }).is("deleted_at", null)
      );
      if (aErr) throw aErr;

      return {
        postsThisWeek: postsCount ?? 0,
        commentsToday: commentsCount ?? 0,
        totalAssets: assetsCount ?? 0,
      };
    },
    enabled: !!user && !!activeClientId,
  });

  return {
    cadence: cadenceQuery.data ?? [],
    pipeline: pipelineQuery.data ?? [],
    comments: commentQuery.data ?? [],
    recentCards: recentQuery.data ?? [],
    assetHealth: assetHealthQuery.data ?? [],
    totalStats: totalStatsQuery.data ?? { postsThisWeek: 0, commentsToday: 0, totalAssets: 0 },
    isLoading:
      cadenceQuery.isLoading || pipelineQuery.isLoading || commentQuery.isLoading ||
      recentQuery.isLoading || assetHealthQuery.isLoading || totalStatsQuery.isLoading,
    error:
      cadenceQuery.error || pipelineQuery.error || commentQuery.error ||
      recentQuery.error || assetHealthQuery.error || totalStatsQuery.error,
  };
}
