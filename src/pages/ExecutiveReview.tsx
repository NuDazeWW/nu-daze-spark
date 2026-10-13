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
import logo from "@/assets/socialmotive-logo.jpg";

const QUICK = ["Tone too promotional", "Tighten the opening hook", "Needs a stronger proof point", "Shorten it"];

/** Distraction-free sign-off view for executives and clients. */
export default function ExecutiveReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const postId = params.get("post");
  const [reviseOpen, setReviseOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <img src={logo} alt="SocialMotive" className="h-8 w-8 rounded-md object-cover" />
          <div className="flex-1">
            <p className="font-display text-sm font-semibold">Executive Review</p>
            <p className="font-mono text-xs text-muted-foreground">{pending.length} awaiting your sign-off</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/queue"><ArrowLeft className="mr-1 h-4 w-4" />Back to workspace</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
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

            <div className="rounded-xl border bg-card p-4"><NativePostPreview card={card} /></div>

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
              <div className="sticky bottom-4 flex gap-3 rounded-xl border bg-card p-3 shadow-lg">
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setReviseOpen(true)}><MessageSquareWarning className="mr-2 h-4 w-4" />Request revisions</Button>
                <Button className="flex-1" disabled={busy} onClick={() => act("approved")}><Check className="mr-2 h-4 w-4" />Approve</Button>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">This post isn't waiting for review.</p>
            )}
          </>
        )}
      </main>

      <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request revisions</DialogTitle>
            <DialogDescription>Your note goes straight to the team with the post.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => <Button key={q} size="sm" variant="secondary" onClick={() => setNotes((n) => (n ? `${n}. ${q}` : q))}>{q}</Button>)}
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
