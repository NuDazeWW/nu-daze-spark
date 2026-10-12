import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { PostCard } from "@/hooks/usePostCards";
import type { Tables } from "@/integrations/supabase/types";
import { draftChecksum, type PreflightFinding } from "@/lib/preflightRules";

export type PreflightReview = Omit<Tables<"preflight_reviews">, "findings"> & { findings: PreflightFinding[] };

export type GateState = "none" | "stale" | "pass" | "warnings" | "blocked" | "acknowledged" | "overridden";

export function preflightGate(review: PreflightReview | null | undefined, card: Pick<PostCard, "draft_copy" | "hashtags">) {
  if (!review) return { state: "none" as GateState, clear: false };
  if (review.draft_checksum !== draftChecksum(card)) return { state: "stale" as GateState, clear: false };
  if (review.overridden_at) return { state: "overridden" as GateState, clear: true };
  if (review.overall_status === "pass") return { state: "pass" as GateState, clear: true };
  if (review.overall_status === "warnings")
    return review.acknowledged_at ? { state: "acknowledged" as GateState, clear: true } : { state: "warnings" as GateState, clear: false };
  return { state: "blocked" as GateState, clear: false };
}

export function usePreflight(card: PostCard | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["preflight", card?.id];

  const { data: review, isLoading } = useQuery({
    queryKey: key,
    enabled: !!card?.id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("preflight_reviews").select("*")
        .eq("post_card_id", card!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return (data as unknown as PreflightReview) ?? null;
    },
  });

  const run = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("preflight-review", { body: { post_card_id: card!.id } });
      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json(); msg = body?.error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data.review as PreflightReview;
    },
    onSuccess: (r) => {
      qc.setQueryData(key, r);
      if (r.ai_error) toast.warning("Rule checks ran, but the AI review was unavailable", { description: r.ai_error });
      else toast.success(r.overall_status === "pass" ? "Preflight passed" : r.overall_status === "blocked" ? "Preflight found blocking issues" : "Preflight found warnings");
    },
    onError: (e: Error) => toast.error("Preflight failed", { description: e.message }),
  });

  const log = async (notes: string) => {
    await supabase.from("approval_log").insert({
      post_card_id: card!.id, actor_id: user!.id, action: card!.approval_status, notes,
    } as never);
  };

  const acknowledge = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("preflight_reviews")
        .update({ acknowledged_by: user!.id, acknowledged_at: now }).eq("id", review!.id);
      if (error) throw error;
      await log(`Preflight warnings acknowledged (${review!.findings.length} finding(s))`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Warnings acknowledged"); },
    onError: (e: Error) => toast.error("Could not acknowledge", { description: e.message }),
  });

  const override = useMutation({
    mutationFn: async (reason: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("preflight_reviews")
        .update({ override_reason: reason, overridden_by: user!.id, overridden_at: now }).eq("id", review!.id);
      if (error) throw error;
      await log(`Preflight override: ${reason}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Preflight overridden and logged"); },
    onError: (e: Error) => toast.error("Could not override", { description: e.message }),
  });

  const canApply = (f: PreflightFinding) =>
    !!card && !!f.excerpt && !!f.suggestion && card.draft_copy.includes(f.excerpt);

  const apply = useMutation({
    mutationFn: async (f: PreflightFinding) => {
      if (!canApply(f)) throw new Error("The quoted phrase is no longer in the draft");
      const next = card!.draft_copy.replace(f.excerpt!, f.suggestion!);
      const { error } = await supabase.from("post_cards")
        .update({ draft_copy: next, updated_by: user!.id } as never).eq("id", card!.id);
      if (error) throw error;
      await log(`Preflight suggestion applied (${f.check}): "${f.excerpt}" → "${f.suggestion}"`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post_cards"] });
      toast.success("Suggestion applied", { description: "Re-run preflight to confirm the fix." });
    },
    onError: (e: Error) => toast.error("Could not apply", { description: e.message }),
  });

  // AI proposes a full rewrite; nothing is saved until the user keeps it.
  const proposeRewrite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("preflight-rewrite", { body: { post_card_id: card!.id } });
      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json(); msg = body?.error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data as { draft_copy: string; changes: string[] };
    },
    onError: (e: Error) => toast.error("AI fix failed", { description: e.message }),
  });

  const keepRewrite = useMutation({
    mutationFn: async (next: string) => {
      const { count } = await supabase.from("post_versions").select("id", { count: "exact", head: true }).eq("post_card_id", card!.id);
      // Preserve the pre-fix draft so the original stays recoverable.
      await supabase.from("post_versions").insert({
        post_card_id: card!.id, client_id: card!.client_id, draft_copy: card!.draft_copy,
        hashtags: card!.hashtags, people_tags: card!.people_tags, org_tags: card!.org_tags,
        version_number: (count ?? 0) + 1, edit_source: "before_preflight_ai_fix", created_by: user!.id,
      } as never);
      const { error } = await supabase.from("post_cards")
        .update({ draft_copy: next, updated_by: user!.id } as never).eq("id", card!.id);
      if (error) throw error;
      await log("Preflight: AI fix-all rewrite kept");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["post_cards"] });
      toast.success("New version saved", { description: "Re-checking now…" });
      run.mutate();
    },
    onError: (e: Error) => toast.error("Could not save", { description: e.message }),
  });

  const gate = card ? preflightGate(review, card) : { state: "none" as GateState, clear: false };
  return { review, isLoading, gate, run, acknowledge, override, apply, canApply, proposeRewrite, keepRewrite };
}
