import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, MessageSquareWarning, Inbox } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PostCard } from "@/hooks/usePostCards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NativePostPreview } from "@/components/preview/NativePostPreview";
import { MotiveScore, type MotiveBreakdown } from "@/components/preflight/MotiveScore";
import { postLabel } from "@/components/tracking/PostTracking";
import { useWorkspace } from "@/hooks/useWorkspace";
import logo from "@/assets/socialmotive-logo.jpg";

type Chip = { label: string; instruction: string };
/** Structured note stored on the post and in approval_log, which generation reads back as reviewer feedback. */
const chipNote = (c: Chip) => `Revision requested — ${c.label}: ${c.instruction}`;

/** Distraction-free sign-off view for executives and clients. */
export default function ExecutiveReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const postId = params.get("post");
  const [reviseOpen, setReviseOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const QUICK: Chip[] = useWorkspace().reviewChips;

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["exec_review_queue"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("post_cards").select("*").eq("approval_status", "in_review").order("scheduled_for", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as PostCard[];
    },
  });

  const { data: single } = useQuery({
    queryKey: ["exec_review_post", postId],
    enabled: !!postId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("post_cards").select("*").eq("id", postId!).maybeSingle();
      if (error) throw error;
      return data as PostCard | null;
    },
  });

  const card = postId ? single ?? null : pending[0] ?? null;
  const index = card ? pending.findIndex((p) => p.id === card.id) : -1;

  const { data: review } = useQuery({
    queryKey: ["preflight", card?.id],
    enabled: !!card,
    queryFn: async () => {
      const { data } = await supabase.from("preflight_reviews").select("*").eq("post_card_id", card!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const next = useMemo(() => pending.find((p) => p.id !== card?.id), [pending, card]);

  const act = async (status: "approved" | "needs_revision", note?: string) => {
    if (!card || !user) return;
    setBusy(true);
    const { error } = await supabase.from("post_cards").update({ approval_status: status, updated_by: user.id, ...(note ? { revision_notes: note } : {}) } as never).eq("id", card.id);
    if (!error) await supabase.from("approval_log").insert({ post_card_id: card.id, actor_id: user.id, action: status, notes: note ?? "Executive review" } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? `${postLabel(card)} approved` : `Revision requested on ${postLabel(card)}`);
    setReviseOpen(false); setNotes("");
    await qc.invalidateQueries({ queryKey: ["exec_review_queue"] });
    qc.invalidateQueries({ queryKey: ["post_cards"] });
    if (next) setParams({ post: next.id }); else setParams({});
  };

  return (
    <div className="text-foreground">
      <PageHeader title="Executive Review" description={`${pending.length} awaiting your sign-off`} />

      <main className="mx-auto max-w-3xl space-y-4 pb-8 sm:space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !card ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-display text-lg font-semibold">You're all caught up</p>
            <p className="text-sm text-muted-foreground">Nothing is waiting for your approval right now.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">{postLabel(card)}</Badge>
              <span className={`sm-status sm-status-${card.approval_status}`}>{card.approval_status.replace("_", " ")}</span>
              <span className="text-xs capitalize text-muted-foreground">{card.platform} · {card.content_type}</span>
              {index >= 0 && <span className="ml-auto font-mono text-xs text-muted-foreground">{index + 1} of {pending.length}</span>}
            </div>

            <div className="overflow-hidden rounded-xl border bg-card p-2 sm:p-4 [&_img]:max-w-full"><NativePostPreview card={card} /></div>

            {review?.motive_score != null && (
              <div className="rounded-xl border bg-card p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Content Motive Score™</p>
                <MotiveScore score={review.motive_score} breakdown={review.motive_breakdown as unknown as MotiveBreakdown} />
              </div>
            )}

            {card.rationale && (
              <div className="rounded-xl border bg-card p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Why this post</p>
                <p className="text-sm">{card.rationale}</p>
                {!!card.source_references?.length && <p className="mt-2 text-xs text-muted-foreground">Sources: {card.source_references.join(" · ")}</p>}
              </div>
            )}

            {card.approval_status === "in_review" ? (
              <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-lg backdrop-blur sm:sticky sm:bottom-4 sm:rounded-xl sm:border">
                <div className="mx-auto max-w-3xl space-y-2">
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="One-tap revision requests">
                    {QUICK.map((q) => (
                      <button key={q.label} title={q.instruction} disabled={busy} onClick={() => act("needs_revision", chipNote(q))}
                        className="h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted active:bg-muted disabled:opacity-50">
                        {q.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="h-12 flex-1 whitespace-nowrap" disabled={busy} onClick={() => setReviseOpen(true)}><MessageSquareWarning className="mr-2 h-4 w-4" />Revise…</Button>
                    <Button className="h-12 flex-[1.4] whitespace-nowrap text-base" disabled={busy} onClick={() => act("approved")}><Check className="mr-2 h-5 w-5" />Approve</Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">This post isn't waiting for review.</p>
            )}
          </>
        )}
      </main>

      <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request revisions</DialogTitle>
            <DialogDescription>Your note goes straight to the team with the post.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => <Button key={q.label} size="sm" variant="secondary" title={q.instruction} onClick={() => setNotes((n) => (n ? `${n}\n${chipNote(q)}` : chipNote(q)))}>{q.label}</Button>)}
          </div>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What should change?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviseOpen(false)}>Cancel</Button>
            <Button disabled={!notes.trim() || busy} onClick={() => act("needs_revision", notes.trim())}>Send to team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
