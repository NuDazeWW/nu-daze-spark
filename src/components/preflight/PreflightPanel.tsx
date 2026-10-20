import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ShieldCheck, ShieldAlert, ShieldX, Shield, Loader2, Copy, RefreshCw, Wand2, Sparkles, ChevronDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { GateState, PreflightReview } from "@/hooks/usePreflight";
import type { usePreflight } from "@/hooks/usePreflight";
import type { PreflightFinding } from "@/lib/preflightRules";
import { MotiveScore, MotiveScoreChip } from "./MotiveScore";

type Preflight = ReturnType<typeof usePreflight>;

const GATE_META: Record<GateState, { label: string; cls: string; Icon: typeof Shield }> = {
  none: { label: "Preflight not run", cls: "border-border text-muted-foreground", Icon: Shield },
  stale: { label: "Preflight out of date", cls: "border-brand-warning/40 text-brand-warning", Icon: ShieldAlert },
  pass: { label: "Preflight pass", cls: "border-primary/40 text-primary", Icon: ShieldCheck },
  acknowledged: { label: "Warnings bypassed", cls: "border-primary/40 text-primary", Icon: ShieldCheck },
  overridden: { label: "Preflight overridden", cls: "border-brand-warning/40 text-brand-warning", Icon: ShieldAlert },
  warnings: { label: "Preflight warnings", cls: "border-brand-warning/40 text-brand-warning", Icon: ShieldAlert },
  blocked: { label: "Preflight blocked", cls: "border-destructive/50 text-destructive", Icon: ShieldX },
};

/** Plain-language titles for each check. */
const CHECK_TITLE: Record<string, string> = {
  banned_phrase: "Uses a banned phrase",
  guardrail_profanity: "Profanity or explicit language",
  guardrail_risky_claims: "Risky claim or trigger word",
  guardrail_cliches: "Overused cliché",
  required_language: "Missing required wording",
  char_limit: "Too long for this platform",
  hashtag_count: "Too many hashtags",
  duplicate_hook: "Opening line repeats a recent post",
  duplicate_cta: "Call to action repeats a recent post",
  duplicate_hashtags: "Hashtags repeat recent posts",
  media: "No cleared image or video attached",
  weak_source: "Not linked to a brief or source",
  voice_fit: "Doesn't sound like the brand",
  generic_phrasing: "Sounds generic",
  unsupported_claim: "Claim not backed by a source",
  format_completeness: "Post feels unfinished",
};
const title = (c: string) => CHECK_TITLE[c] ?? c.replace(/_/g, " ");
// Checks the AI can't fix by rewriting text.
const NON_TEXT = new Set(["media", "weak_source"]);
const AREA_LABEL: Record<string, string> = {
  hook_strength: "Hook strength", strategic_fit: "Strategic fit", voice_fit: "Voice fit",
  platform_fit: "Platform fit", originality: "Originality",
};

export function PreflightBadge({ state, review, onClick }: { state: GateState; review?: PreflightReview | null; onClick?: () => void }) {
  const m = GATE_META[state];
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={onClick} className="inline-flex">
        <Badge variant="outline" className={`text-[10px] gap-1 ${m.cls}`}>
          <m.Icon className="h-3 w-3" />{m.label}
          {review && state !== "none" && <span className="text-muted-foreground font-normal">· {format(new Date(review.created_at), "MMM d")}</span>}
        </Badge>
      </button>
      {review?.motive_score != null && state !== "none" && <MotiveScoreChip score={review.motive_score} />}
    </span>
  );
}

function headline(state: GateState, blocking: number, advisory: number) {
  switch (state) {
    case "none": return { text: "Not checked yet", sub: "Run preflight to check this post before approval.", tone: "text-muted-foreground" };
    case "stale": return { text: "Post changed — check again", sub: "Re-run preflight to see where it stands now.", tone: "text-brand-warning" };
    case "pass": return { text: "Checks passed", sub: "No issues found.", tone: "text-primary" };
    case "acknowledged": return { text: "Warnings acknowledged", sub: "Recorded under your name for this version. Editing the post resets this.", tone: "text-primary" };
    case "overridden": return { text: "Cleared — admin override", sub: "Blocking issues were bypassed with a logged reason.", tone: "text-brand-warning" };
    case "blocked": return { text: `${blocking} thing${blocking === 1 ? "" : "s"} to fix`, sub: `Must be fixed before approval${advisory ? `, plus ${advisory} suggestion${advisory === 1 ? "" : "s"}` : ""}.`, tone: "text-destructive" };
    default: return { text: `${advisory} suggestion${advisory === 1 ? "" : "s"}`, sub: "Advisory only — fix them or acknowledge to continue.", tone: "text-brand-warning" };
  }
}

function FindingCard({ f, pf }: { f: PreflightFinding; pf: Preflight }) {
  return (
    <div className={`rounded-md border p-2.5 space-y-1 ${f.severity === "blocking" ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-muted/20"}`}>
      <p className="text-xs font-medium">{title(f.check)}</p>
      <p className="text-xs text-muted-foreground">{f.message}</p>
      {f.excerpt && <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-2">"{f.excerpt}"</p>}
      {f.suggestion && (
        <div className="flex items-start gap-2">
          <p className="text-xs text-primary/90 flex-1">{f.suggestion}</p>
          {pf.canApply(f) && (
            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] shrink-0"
              disabled={pf.apply.isPending} onClick={() => pf.apply.mutate(f)}>
              <Wand2 className="h-3 w-3 mr-1" />Apply
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Copy suggestion"
            onClick={() => { navigator.clipboard.writeText(f.suggestion!); toast.success("Suggestion copied"); }}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function PreflightPanel({ pf, isAdmin, draft }: { pf: Preflight; isAdmin: boolean; draft?: string }) {
  const { review, gate, run, acknowledge, override, proposeRewrite, keepRewrite } = pf;
  const [reason, setReason] = useState("");
  const [bypassOpen, setBypassOpen] = useState(false);
  const [proposal, setProposal] = useState<{ draft_copy: string; changes: string[] } | null>(null);
  const findings = review?.findings ?? [];
  const blocking = findings.filter((f) => f.severity === "blocking");
  const advisory = findings.filter((f) => f.severity === "advisory");
  // Action-needed first; minor = advisory checks that aren't about the text's substance.
  const minorChecks = new Set(["duplicate_hashtags", "duplicate_cta", "duplicate_hook", "hashtag_count", "weak_source"]);
  const main = [...blocking, ...advisory.filter((f) => !minorChecks.has(f.check))];
  const minor = advisory.filter((f) => minorChecks.has(f.check));
  const fixable = findings.some((f) => !NON_TEXT.has(f.check));
  const cleared = gate.state === "pass" || gate.state === "acknowledged" || gate.state === "overridden";
  const h = headline(gate.state, blocking.length, advisory.length);

  const fixAll = () => proposeRewrite.mutate(undefined, { onSuccess: (d) => setProposal(d) });
  const improveWeakest = () => {
    const w = (review?.motive_breakdown as any)?.weakest;
    if (w?.key) proposeRewrite.mutate({ key: w.key, hint: w.hint }, { onSuccess: (d) => setProposal(d) });
  };
  const bypassAll = () => (blocking.length ? setBypassOpen(true) : acknowledge.mutate());

  return (
    <div className="space-y-4">
      {/* 1. One clear status */}
      <div className="rounded-lg border border-border/60 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm font-semibold flex items-center gap-1.5 ${h.tone}`}>
              {cleared && <CheckCircle2 className="h-4 w-4" />}{h.text}
            </p>
            <p className="text-xs text-muted-foreground">{h.sub}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            {review ? "Check again" : "Run preflight"}
          </Button>
        </div>
        {review?.voice_score != null && (
          <p className="text-[11px] text-muted-foreground">
            Brand voice fit <span className="font-mono text-foreground">{review.voice_score}/100</span>
            {" "}· grades the wording; improves only when the text is edited and checked again
          </p>
        )}
        {review?.motive_score != null && (
          <MotiveScore score={review.motive_score} breakdown={review.motive_breakdown as any} />
        )}
        {review?.motive_score != null && (review.motive_breakdown as any)?.weakest?.key && gate.state !== "stale" && (
          <Button size="sm" variant="outline" className="w-full justify-start"
            onClick={improveWeakest} disabled={proposeRewrite.isPending || keepRewrite.isPending}>
            {proposeRewrite.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
            Improve weakest score area with AI
            <span className="ml-1 text-muted-foreground font-normal">· {AREA_LABEL[(review.motive_breakdown as any).weakest.key] ?? (review.motive_breakdown as any).weakest.key}</span>
          </Button>
        )}
        {review && findings.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {fixable && (
              <Button size="sm" onClick={fixAll} disabled={proposeRewrite.isPending || keepRewrite.isPending}>
                {proposeRewrite.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Revise draft with AI
              </Button>
            )}
            {!cleared && gate.state !== "stale" && (blocking.length === 0 || isAdmin) && (
              <Button size="sm" variant="outline" onClick={bypassAll} disabled={acknowledge.isPending}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />Acknowledge warnings and continue
              </Button>
            )}
            {!cleared && blocking.length > 0 && !isAdmin && (
              <p className="text-[11px] text-muted-foreground self-center">Only an admin can bypass blocking issues.</p>
            )}
          </div>
        )}
      </div>

      {gate.state === "stale" && <p className="text-xs text-brand-warning">The draft changed after this review. Check again before approving.</p>}
      {review?.ai_error && <p className="text-xs text-brand-warning">AI review unavailable: {review.ai_error}. Rule checks still ran.</p>}

      {/* 2. Action-needed first, minor folded */}
      {main.length > 0 && <div className="space-y-2">{main.map((f, i) => <FindingCard key={i} f={f} pf={pf} />)}</div>}
      {minor.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border border-border/60 px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground">
            Minor notes ({minor.length})
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {minor.map((f, i) => <FindingCard key={i} f={f} pf={pf} />)}
          </CollapsibleContent>
        </Collapsible>
      )}

      {review?.overridden_at && <p className="text-xs text-muted-foreground">Overridden {format(new Date(review.overridden_at), "MMM d, p")}: {review.override_reason}</p>}

      <Dialog open={bypassOpen} onOpenChange={setBypassOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bypass blocking issues</DialogTitle>
            <DialogDescription>You were notified and choose to keep the draft as is. This is logged with your reason.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this safe to keep?" />
          <Button size="sm" variant="destructive" disabled={reason.trim().length < 8 || override.isPending}
            onClick={() => override.mutate(reason.trim(), { onSuccess: () => { setReason(""); setBypassOpen(false); } })}>
            Bypass and allow
          </Button>
        </DialogContent>
      </Dialog>

      {/* 4. Side-by-side AI fix */}
      <Dialog open={!!proposal} onOpenChange={(o) => !o && setProposal(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggested fix</DialogTitle>
            <DialogDescription>Nothing is saved until you keep it. Your current version is kept in the post's history.</DialogDescription>
          </DialogHeader>
          {proposal && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Current</p>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs whitespace-pre-wrap">{draft ?? ""}</div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-mono text-primary">Suggested</p>
                  <div className="rounded-md border border-primary/40 p-2.5 text-xs whitespace-pre-wrap">{proposal.draft_copy}</div>
                </div>
              </div>
              {proposal.changes.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                  {proposal.changes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
              {findings.some((f) => NON_TEXT.has(f.check)) && (
                <p className="text-[11px] text-muted-foreground">Media and source links can't be fixed by rewriting — attach them from the post or Asset Library.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setProposal(null)}>Discard</Button>
                <Button size="sm" disabled={keepRewrite.isPending}
                  onClick={() => keepRewrite.mutate(proposal.draft_copy, { onSuccess: () => setProposal(null) })}>
                  {keepRewrite.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Keep new version & check again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PreflightDialog({ open, onOpenChange, pf, isAdmin, intent, draft }: {
  open: boolean; onOpenChange: (o: boolean) => void; pf: Preflight; isAdmin: boolean; intent?: string | null; draft?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Preflight Review</DialogTitle>
          <DialogDescription>
            {intent ?? "Automated checks against your brand rules, platform limits, recent posts, and linked sources."}
          </DialogDescription>
        </DialogHeader>
        <PreflightPanel pf={pf} isAdmin={isAdmin} draft={draft} />
      </DialogContent>
    </Dialog>
  );
}
