import { preflightGate, type PreflightReview } from "@/hooks/usePreflight";
import type { PostCard } from "@/hooks/usePostCards";

export type ReadinessTone = "ready" | "advisory" | "blocked" | "pending" | "editorial";
export type Readiness = { label: string; tone: ReadinessTone; canDeliver: boolean; required: number; advisory: number };

const APPROVED = ["approved", "exported", "posted"];
const EDITORIAL: Record<string, string> = {
  draft: "Draft", in_review: "In review", needs_revision: "Needs revision", archived: "Archived",
};

/** One readiness answer for every screen. Never says "ready" while required checks remain. */
export function evaluateReadiness(
  card: Pick<PostCard, "draft_copy" | "hashtags" | "approval_status">,
  review: PreflightReview | null | undefined,
  opts: { approvalRequired: boolean; preflightMode: "strict" | "advisory" | "off" | string; reviewLoading?: boolean },
): Readiness {
  const approved = APPROVED.includes(card.approval_status) || !opts.approvalRequired;
  const findings = review?.findings ?? [];
  const required = findings.filter((f) => f.severity === "blocking").length;
  const advisory = findings.filter((f) => f.severity === "advisory").length;
  const base = { required, advisory };
  if (!approved) return { ...base, label: EDITORIAL[card.approval_status] ?? card.approval_status, tone: "editorial", canDeliver: false };
  if (opts.preflightMode === "off") return { ...base, label: "Ready to publish", tone: "ready", canDeliver: true };
  if (opts.reviewLoading) return { ...base, label: "Checks pending", tone: "pending", canDeliver: false };
  const gate = preflightGate(review, card);
  const strict = opts.preflightMode === "strict";
  if (gate.state === "none" || gate.state === "stale")
    return { ...base, label: gate.state === "stale" ? "Post changed · checks pending" : "Checks pending", tone: "pending", canDeliver: !strict };
  if (required > 0) return { ...base, label: `Approved · ${required} required check${required === 1 ? " remains" : "s remain"}`, tone: "blocked", canDeliver: false };
  if (review?.ai_error) return { ...base, label: "Checks unavailable", tone: "pending", canDeliver: !strict };
  if (gate.state === "acknowledged") return { ...base, label: "Ready to publish · Warnings acknowledged", tone: "advisory", canDeliver: true };
  if (required > 0) return { ...base, label: `Approved · ${required} required check${required === 1 ? "" : "s"} remain${required === 1 ? "s" : ""}`, tone: "blocked", canDeliver: false };
  if (advisory > 0 && gate.state === "warnings") return { ...base, label: "Approved · Advisory notes available", tone: "advisory", canDeliver: !strict };
  return { ...base, label: "Ready to publish", tone: "ready", canDeliver: true };
}
