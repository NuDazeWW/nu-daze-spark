import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type WorkspaceSettings = Tables<"workspace_settings">;
export type WorkspaceRole = "owner" | "admin" | "editor" | "reviewer" | "viewer";

export const SETUP_STEPS = [
  { key: "company", title: "Company profile", description: "Your company name and logo, shown alongside SocialMotive." },
  { key: "org_type", title: "Organization type", description: "Agency with clients, or brand with departments." },
  { key: "first_entity", title: "First client or department", description: "Create it and connect its social accounts." },
  { key: "brand_voice", title: "Brand voice basics", description: "Tone and language rules the AI must follow." },
  { key: "cadence", title: "Cadence targets", description: "How many posts per week, per platform." },
  { key: "team", title: "Invite your team", description: "Add teammates with the right role." },
  { key: "ai_tools", title: "AI image & video tools", description: "Use built-in AI or connect your own image and video generators." },
  { key: "email", title: "Email provider", description: "Connect the email account used for team notifications." },
] as const;
export type SetupStepKey = (typeof SETUP_STEPS)[number]["key"];

export const ROLE_META: Record<WorkspaceRole, { label: string; description: string }> = {
  owner: { label: "Owner", description: "Full control, billing limits, ownership transfer and reset." },
  admin: { label: "Admin", description: "Manages settings, team, strategy, approvals and export." },
  editor: { label: "Editor", description: "Creates and edits briefs, drafts, comments and assets." },
  reviewer: { label: "Approver", description: "Reviews briefs and drafts, requests revisions, edits copy and grants approval; can't create new drafts." },
  viewer: { label: "Viewer", description: "Read-only access to assigned work; can add brief comments." },
};

export function useWorkspace() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const settingsQ = useQuery({
    queryKey: ["workspace_settings"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_settings").select("*").maybeSingle();
      if (error) throw error;
      return data as WorkspaceSettings | null;
    },
  });

  const roleQ = useQuery({
    queryKey: ["workspace_role", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("workspace_role", { _user_id: user!.id });
      if (error) throw error;
      return (data as WorkspaceRole | null) ?? null;
    },
  });

  const settings = settingsQ.data ?? null;
  const role = roleQ.data ?? null;
  const progress = (settings?.setup_progress ?? {}) as Record<string, boolean>;
  const completed = SETUP_STEPS.filter((s) => progress[s.key]).length;

  return {
    settings,
    loading: settingsQ.isLoading || roleQ.isLoading,
    role,
    isOwner: role === "owner",
    canManage: role === "owner" || role === "admin",
    canCreate: role === "owner" || role === "admin" || role === "editor",
    entitySingular: settings?.entity_label_singular ?? "Client",
    entityPlural: settings?.entity_label_plural ?? "Clients",
    progress,
    approvalRequired: settings?.post_approval_required ?? false,
    preflightMode: (settings?.preflight_mode ?? "advisory") as "off" | "advisory" | "strict",
    reviewChips: (Array.isArray((settings as { review_chips?: unknown } | null)?.review_chips) ? (settings as { review_chips: { label: string; instruction: string }[] }).review_chips : []) as { label: string; instruction: string }[],
    setupCompleted: completed,
    setupTotal: SETUP_STEPS.length,
    refresh: () => {
      qc.invalidateQueries({ queryKey: ["workspace_settings"] });
      qc.invalidateQueries({ queryKey: ["workspace_role"] });
    },
  };
}

export async function updateWorkspaceSettings(patch: Partial<WorkspaceSettings>) {
  const { error } = await supabase.from("workspace_settings").update(patch as never).eq("id", true);
  if (error) throw error;
}

export async function markSetupStep(current: Record<string, boolean>, key: SetupStepKey, done = true) {
  await updateWorkspaceSettings({ setup_progress: { ...current, [key]: done } as never });
}
