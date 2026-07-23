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

export interface PipelineCount { status: string; count: number; }
export interface CommentProgress { platform: string; daily_target: number; current_count: number; }
export interface AssetHealth { permission_state: string; count: number; }
export interface TotalStats { postsThisWeek: number; commentsToday: number; totalAssets: number; }

export function useDashboardStats() {
  const { user } = useAuth();
  const { activeClientId } = useActiveClient();
  const cid = activeClientId ?? "";
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1).toISOString();
  const lastWeekEnd = subWeeks(endOfWeek(now, { weekStartsOn: 1 }), 1).toISOString();
  const dayStart = startOfDay(now).toISOString();
  const dayEnd = endOfDay(now).toISOString();
  const approvedStatuses: ApprovalStatus[] = ["approved", "exported", "posted"];

  const cadenceQuery = useQuery({
    queryKey: ["dashboard_cadence", weekStart, cid],
    queryFn: async (): Promise<CadenceProgress[]> => {
      const { data: targets, error: tErr } = await supabase
        .from("cadence_targets").select("platform, content_type, weekly_target")
        .eq("is_active", true).eq("client_id", cid);
      if (tErr) throw tErr;

      const { data: cards, error: cErr } = await supabase
        .from("post_cards").select("platform, content_type")
        .in("approval_status", approvedStatuses)
        .gte("created_at", weekStart).lte("created_at", weekEnd)
        .eq("client_id", cid);
      if (cErr) throw cErr;

      const { data: lastCards, error: lErr } = await supabase
        .from("post_cards").select("platform, content_type")
        .in("approval_status", approvedStatuses)
        .gte("created_at", lastWeekStart).lte("created_at", lastWeekEnd)
        .eq("client_id", cid);
      if (lErr) throw lErr;

      return (targets ?? []).map((t) => ({
        platform: t.platform,
        content_type: t.content_type,
        weekly_target: t.weekly_target,
        current_count: (cards ?? []).filter((c) => c.platform === t.platform && c.content_type === t.content_type).length,
        last_week_count: (lastCards ?? []).filter((c) => c.platform === t.platform && c.content_type === t.content_type).length,
      }));
    },
    enabled: !!user && !!cid,
  });

  const pipelineQuery = useQuery({
    queryKey: ["dashboard_pipeline", cid],
    queryFn: async (): Promise<PipelineCount[]> => {
      const statuses: ApprovalStatus[] = ["draft", "in_review", "needs_revision", "approved", "exported", "posted", "archived"];
      const results: PipelineCount[] = [];
      for (const status of statuses) {
        const { count, error } = await supabase
          .from("post_cards").select("*", { count: "exact", head: true })
          .eq("approval_status", status).eq("client_id", cid);
        if (error) throw error;
        results.push({ status, count: count ?? 0 });
      }
      return results;
    },
    enabled: !!user && !!cid,
  });

  const commentQuery = useQuery({
    queryKey: ["dashboard_comments", dayStart, cid],
    queryFn: async (): Promise<CommentProgress[]> => {
      const { data: targets, error: tErr } = await supabase
        .from("engagement_targets").select("platform, daily_target")
        .eq("is_active", true).eq("client_id", cid);
      if (tErr) throw tErr;

      const { data: posts, error: pErr } = await supabase
        .from("external_posts").select("platform")
        .eq("is_commented", true).gte("updated_at", dayStart).lte("updated_at", dayEnd)
        .eq("client_id", cid);
      if (pErr) throw pErr;

      return (targets ?? []).map((t) => ({
        platform: t.platform,
        daily_target: t.daily_target,
        current_count: (posts ?? []).filter((p) => p.platform === t.platform).length,
      }));
    },
    enabled: !!user && !!cid,
  });

  const recentQuery = useQuery({
    queryKey: ["dashboard_recent", cid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_cards")
        .select("id, platform, content_type, approval_status, draft_copy, updated_at")
        .eq("client_id", cid)
        .order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!cid,
  });

  const assetHealthQuery = useQuery({
    queryKey: ["dashboard_asset_health", cid],
    queryFn: async (): Promise<AssetHealth[]> => {
      const states: PermissionState[] = ["generation_allowed", "summarization_only", "blocked", "archived"];
      const results: AssetHealth[] = [];
      for (const state of states) {
        const { count, error } = await supabase
          .from("source_assets").select("*", { count: "exact", head: true })
          .eq("permission_state", state).is("deleted_at", null).eq("client_id", cid);
        if (error) throw error;
        results.push({ permission_state: state, count: count ?? 0 });
      }
      return results;
    },
    enabled: !!user && !!cid,
  });

  const totalStatsQuery = useQuery({
    queryKey: ["dashboard_totals", weekStart, dayStart, cid],
    queryFn: async (): Promise<TotalStats> => {
      const { count: postsCount, error: pErr } = await supabase
        .from("post_cards").select("*", { count: "exact", head: true })
        .in("approval_status", approvedStatuses)
        .gte("created_at", weekStart).lte("created_at", weekEnd).eq("client_id", cid);
      if (pErr) throw pErr;

      const { count: commentsCount, error: cErr } = await supabase
        .from("external_posts").select("*", { count: "exact", head: true })
        .eq("is_commented", true).gte("updated_at", dayStart).lte("updated_at", dayEnd).eq("client_id", cid);
      if (cErr) throw cErr;

      const { count: assetsCount, error: aErr } = await supabase
        .from("source_assets").select("*", { count: "exact", head: true })
        .is("deleted_at", null).eq("client_id", cid);
      if (aErr) throw aErr;

      return {
        postsThisWeek: postsCount ?? 0,
        commentsToday: commentsCount ?? 0,
        totalAssets: assetsCount ?? 0,
      };
    },
    enabled: !!user && !!cid,
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
