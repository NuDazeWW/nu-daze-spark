import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MessageSquareWarning, Inbox, ChevronLeft, ChevronRight, Gauge, Lightbulb, Sparkles } from "lucide-react";
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
import { PageHeader } from "@/components/shared/PageHeader";
import { PlatformIcon } from "@/components/layout/PlatformIcon";

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

  // Generated comments submitted for executive review, with the original post for context.
  const { data: pendingComments = [] } = useQuery({
    queryKey: ["exec_review_comments"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, external_posts(platform, author_name, external_url, content_snippet)")
        .eq("approval_status", "in_review")
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const actOnComment = async (id: string, status: "approved" | "needs_revision") => {
    if (!user) return;
    const { error } = await supabase.from("comments").update({ approval_status: status, updated_by: user.id } as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Comment approved" : "Revision requested on comment");
    qc.invalidateQueries({ queryKey: ["exec_review_comments"] });
    qc.invalidateQueries({ queryKey: ["comments_queue"] });
    qc.invalidateQueries({ queryKey: ["external_post_comments"] });
  };

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
      <PageHeader title="Executive Review" description={`${pending.length + pendingComments.length} awaiting your sign-off`} />

      <main className="sm-xr pb-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !card ? (
          <div className="sm-xr-card p-10 text-center">
            <span className="sm-xr-icon mx-auto mb-3"><Inbox className="h-5 w-5" /></span>
            <p className="font-display text-lg font-semibold">You're all caught up</p>
            <p className="text-sm text-muted-foreground">Nothing is waiting for your approval right now.</p>
          </div>
        ) : (
          <>
            <div className="sm-xr-card mb-5 flex flex-wrap items-center gap-2 px-4 py-3">
              <Badge variant="outline" className="font-mono">{postLabel(card)}</Badge>
              <span className={`sm-status sm-status-${card.approval_status}`}>{card.approval_status.replace("_", " ")}</span>
              <span className="text-xs capitalize text-muted-foreground">{card.platform} · {card.content_type}</span>
              {index >= 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <Button size="icon" variant="outline" className="sm-xr-nav h-8 w-8" aria-label="Previous post" disabled={index <= 0} onClick={() => setParams({ post: pending[index - 1].id })}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="font-mono text-xs text-muted-foreground">{index + 1} of {pending.length}</span>
                  <Button size="icon" variant="outline" className="sm-xr-nav h-8 w-8" aria-label="Next post" disabled={index >= pending.length - 1} onClick={() => setParams({ post: pending[index + 1].id })}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </div>

            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
              <section className="sm-xr-card min-w-0 overflow-hidden p-2 sm:p-4 [&_img]:max-w-full" aria-label="Post preview">
                <NativePostPreview card={card} />
              </section>

              <div className="min-w-0 space-y-5">
                {review?.motive_score != null && (
                  <section className="sm-xr-card p-4">
                    <p className="sm-xr-label mb-3"><span className="sm-xr-icon"><Gauge className="h-4 w-4" /></span>Content Motive Score™</p>
                    <MotiveScore score={review.motive_score} breakdown={review.motive_breakdown as unknown as MotiveBreakdown} />
                  </section>
                )}

                {card.rationale && (
                  <section className="sm-xr-card p-4">
                    <p className="sm-xr-label mb-2"><span className="sm-xr-icon"><Lightbulb className="h-4 w-4" /></span>Why this post</p>
                    <p className="text-sm leading-relaxed">{card.rationale}</p>
                    {!!card.source_references?.length && <p className="mt-2 text-xs text-muted-foreground">Sources: {card.source_references.join(" · ")}</p>}
                  </section>
                )}

                {card.approval_status === "in_review" ? (
                  <section className="sm-xr-card sm-xr-actions space-y-3 p-4" aria-label="Review decision">
                    <p className="sm-xr-label"><span className="sm-xr-icon"><Sparkles className="h-4 w-4" /></span>Quick revisions</p>
                    <div className="flex flex-wrap gap-2" aria-label="One-tap revision requests">
                      {QUICK.map((q) => (
                        <button key={q.label} title={q.instruction} disabled={busy} onClick={() => act("needs_revision", chipNote(q))}
                          className="sm-xr-chip h-9 whitespace-nowrap rounded-full px-3 text-xs font-medium disabled:opacity-50">
                          {q.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="outline" className="sm-xr-revise h-12 min-w-[140px] flex-1 whitespace-nowrap" disabled={busy} onClick={() => setReviseOpen(true)}><MessageSquareWarning className="mr-2 h-4 w-4" />Revise…</Button>
                      <Button variant="success" className="sm-xr-approve h-12 min-w-[160px] flex-[1.4] whitespace-nowrap text-base" disabled={busy} onClick={() => act("approved")}><Check className="mr-2 h-5 w-5" />Approve</Button>
                    </div>
                  </section>
                ) : (
                  <p className="sm-xr-card p-4 text-center text-sm text-muted-foreground">This post isn't waiting for review.</p>
                )}
              </div>
            </div>
          </>
        )}

        {pendingComments.length > 0 && (
          <section className="mt-8 space-y-3" aria-label="Comments awaiting review">
            <p className="sm-xr-label"><span className="sm-xr-icon"><MessageSquareWarning className="h-4 w-4" /></span>Comments awaiting review ({pendingComments.length})</p>
            {pendingComments.map((c) => (
              <div key={c.id} className="sm-xr-card p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">Comment</Badge>
                  <PlatformIcon platform={c.external_posts?.platform ?? "linkedin"} className="h-3.5 w-3.5" />
                  <span className="text-xs text-muted-foreground capitalize">{c.external_posts?.platform ?? "post"}</span>
                  {c.external_posts?.author_name && <span className="text-xs text-muted-foreground">· replying to {c.external_posts.author_name}</span>}
                  {c.tone && <Badge variant="outline" className="text-[10px]">{c.tone}</Badge>}
                  <span className="sm-status sm-status-in_review ml-auto">Pending Executive Review</span>
                </div>
                {c.external_posts?.content_snippet && (
                  <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 line-clamp-2">{c.external_posts.content_snippet}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{c.draft_copy}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {c.external_posts?.external_url && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => window.open(c.external_posts.external_url, "_blank", "noopener")}>View original post</Button>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => actOnComment(c.id, "needs_revision")}>Request revision</Button>
                    <Button variant="success" size="sm" className="h-8 text-xs" onClick={() => actOnComment(c.id, "approved")}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
                  </div>
                </div>
              </div>
            ))}
          </section>
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
