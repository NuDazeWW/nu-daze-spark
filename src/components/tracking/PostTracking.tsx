import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, History, Loader2 } from "lucide-react";
import { STATUS_META, type ApprovalStatus, type PostCard } from "@/hooks/usePostCards";

export const postLabel = (card: Pick<PostCard, "post_number">) =>
  card.post_number != null ? `SM-${String(card.post_number).padStart(4, "0")}` : "SM-····";

/** Matches "SM-0142", "sm142", "142" against a card's number. */
export const matchesPostNumber = (card: Pick<PostCard, "post_number">, q: string) => {
  const m = q.trim().match(/^(?:sm-?)?0*(\d+)$/i);
  return !!m && card.post_number === Number(m[1]);
};

export function PostNumber({ card }: { card: Pick<PostCard, "post_number"> }) {
  const label = postLabel(card);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="font-mono text-[11px] font-semibold text-primary tracking-wide hover:underline shrink-0"
          onClick={() => { navigator.clipboard.writeText(label); toast.success(`${label} copied`); }}>
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">Post number — same on every screen. Click to copy.</TooltipContent>
    </Tooltip>
  );
}

const STEPS: ApprovalStatus[] = ["draft", "in_review", "approved", "exported", "posted"];

type LogRow = { post_card_id: string; action: ApprovalStatus; created_at: string };

/** One query for all status-change dates, shared by every card on screen. */
export function useStatusDates() {
  const { data } = useQuery({
    queryKey: ["status_dates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("approval_log")
        .select("post_card_id, action, created_at").order("created_at", { ascending: true }).limit(5000);
      if (error) throw error;
      const map: Record<string, Partial<Record<ApprovalStatus, string>>> = {};
      for (const r of (data ?? []) as LogRow[]) (map[r.post_card_id] ??= {})[r.action] = r.created_at;
      return map;
    },
  });
  return data ?? {};
}

export function StatusProgress({ card, dates }: { card: PostCard; dates?: Partial<Record<ApprovalStatus, string>> }) {
  const status = card.approval_status;
  const off = status === "archived" || status === "needs_revision";
  const idx = STEPS.indexOf(status === "needs_revision" ? "in_review" : status);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = !off ? i <= idx : status === "needs_revision" && i <= idx;
          const current = s === status || (status === "needs_revision" && s === "in_review");
          const d = s === "draft" ? card.created_at : dates?.[s];
          return (
            <Tooltip key={s}>
              <TooltipTrigger asChild>
                <div className="flex-1 min-w-0">
                  <div className={`h-1 rounded-full ${current ? (status === "needs_revision" ? "bg-brand-attention" : `sm-pipeline sm-status-${status}`) : done ? "bg-primary/50" : "bg-muted"}`} />
                  <p className={`mt-1 text-[9px] truncate ${current ? "text-foreground font-medium" : "text-muted-foreground/70"}`}>
                    {STATUS_META[s].label}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {STATUS_META[s].label}{done && d ? ` · ${format(new Date(d), "MMM d, p")}` : done ? "" : " · not yet"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {status === "needs_revision" && <p className="text-xs text-brand-attention">Sent back for revision</p>}
      {status === "archived" && <p className="text-[10px] text-muted-foreground">Archived</p>}
    </div>
  );
}

/** Tells the user which screen the post lives on now, with a jump link. */
export function WhereIsIt({ card, here }: { card: PostCard; here: "queue" | "approved" }) {
  const inApproved = ["approved", "exported", "posted"].includes(card.approval_status);
  if (here === "queue" && inApproved)
    return (
      <Link to={`/approved?post=${card.id}`} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
        Now in Approved Content <ArrowRight className="h-3 w-3" />
      </Link>
    );
  if (here === "approved")
    return (
      <Link to={`/queue?post=${card.id}`} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline">
        Open in Daily Queue <ArrowRight className="h-3 w-3" />
      </Link>
    );
  return null;
}

type Event = { at: string; title: string; detail?: string | null; who?: string | null };

export function PostHistoryButton({ card, className }: { card: PostCard; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className={className ?? "h-7 text-xs gap-1.5"} onClick={() => setOpen(true)}>
        <History className="h-3.5 w-3.5" />History
      </Button>
      {open && <PostHistoryDialog card={card} open={open} onOpenChange={setOpen} />}
    </>
  );
}

function PostHistoryDialog({ card, open, onOpenChange }: { card: PostCard; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["post_history", card.id],
    queryFn: async () => {
      const [log, versions, preflight] = await Promise.all([
        supabase.from("approval_log").select("action, notes, actor_id, created_at").eq("post_card_id", card.id),
        supabase.from("post_versions").select("version_number, edit_source, created_by, created_at").eq("post_card_id", card.id),
        supabase.from("preflight_reviews").select("overall_status, voice_score, run_by, created_at").eq("post_card_id", card.id),
      ]);
      const ids = new Set<string>([card.created_by]);
      (log.data ?? []).forEach((r) => ids.add(r.actor_id));
      (versions.data ?? []).forEach((r) => ids.add(r.created_by));
      (preflight.data ?? []).forEach((r) => ids.add(r.run_by));
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", [...ids]);
      const name = (id?: string | null) => profiles?.find((p) => p.user_id === id)?.display_name ?? null;

      const list: Event[] = [
        { at: card.created_at, title: "Created as draft", detail: card.import_source ? `From ${card.import_source}` : card.brief_id ? "Generated from a campaign brief" : null, who: name(card.created_by) },
        ...(log.data ?? []).map((r) => ({
          at: r.created_at,
          title: r.notes?.startsWith("Preflight") ? r.notes.split(":")[0].split("(")[0].trim() : `Moved to ${STATUS_META[r.action as ApprovalStatus]?.label ?? r.action}`,
          detail: r.notes, who: name(r.actor_id),
        })),
        ...(versions.data ?? []).map((r) => ({ at: r.created_at, title: `Edited (version ${r.version_number})`, detail: r.edit_source.replace(/_/g, " "), who: name(r.created_by) })),
        ...(preflight.data ?? []).map((r) => ({
          at: r.created_at, title: `Preflight ${r.overall_status}`,
          detail: r.voice_score != null ? `Brand voice ${r.voice_score}/100` : null, who: name(r.run_by),
        })),
      ];
      return list.sort((a, b) => b.at.localeCompare(a.at));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><span className="font-mono text-primary">{postLabel(card)}</span> History</DialogTitle>
          <DialogDescription className="capitalize">{card.platform} {card.content_type} · now {STATUS_META[card.approval_status].label}</DialogDescription>
        </DialogHeader>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
          <ol className="relative border-l border-border/60 ml-1.5 space-y-4">
            {(events ?? []).map((e, i) => (
              <li key={i} className="pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-[11px] text-muted-foreground">{format(new Date(e.at), "MMM d, yyyy · p")}{e.who ? ` · ${e.who}` : ""}</p>
                {e.detail && e.detail !== e.title && <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
