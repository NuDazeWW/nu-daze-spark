import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, ShieldAlert, ShieldX, Shield, Loader2, Copy, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { GateState, PreflightReview } from "@/hooks/usePreflight";
import type { usePreflight } from "@/hooks/usePreflight";

type Preflight = ReturnType<typeof usePreflight>;

const GATE_META: Record<GateState, { label: string; cls: string; Icon: typeof Shield }> = {
  none: { label: "Preflight not run", cls: "border-border text-muted-foreground", Icon: Shield },
  stale: { label: "Preflight out of date", cls: "border-brand-warning/40 text-brand-warning", Icon: ShieldAlert },
  pass: { label: "Preflight pass", cls: "border-primary/40 text-primary", Icon: ShieldCheck },
  acknowledged: { label: "Warnings acknowledged", cls: "border-primary/40 text-primary", Icon: ShieldCheck },
  overridden: { label: "Preflight overridden", cls: "border-brand-warning/40 text-brand-warning", Icon: ShieldAlert },
  warnings: { label: "Preflight warnings", cls: "border-brand-warning/40 text-brand-warning", Icon: ShieldAlert },
  blocked: { label: "Preflight blocked", cls: "border-destructive/50 text-destructive", Icon: ShieldX },
};

export function PreflightBadge({ state, review, onClick }: { state: GateState; review?: PreflightReview | null; onClick?: () => void }) {
  const m = GATE_META[state];
  return (
    <button type="button" onClick={onClick} className="inline-flex">
      <Badge variant="outline" className={`text-[10px] gap-1 ${m.cls}`}>
        <m.Icon className="h-3 w-3" />{m.label}
        {review && state !== "none" && <span className="text-muted-foreground font-normal">· {format(new Date(review.created_at), "MMM d")}</span>}
      </Badge>
    </button>
  );
}

export function PreflightPanel({ pf, isAdmin }: { pf: Preflight; isAdmin: boolean }) {
  const { review, gate, run, acknowledge, override } = pf;
  const [reason, setReason] = useState("");
  const blocking = review?.findings.filter((f) => f.severity === "blocking") ?? [];
  const advisory = review?.findings.filter((f) => f.severity === "advisory") ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <PreflightBadge state={gate.state} review={review} />
          {review?.voice_score != null && <p className="text-xs text-muted-foreground">Brand voice fit <span className="font-mono text-foreground">{review.voice_score}/100</span></p>}
        </div>
        <Button size="sm" variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
          {review ? "Re-run preflight" : "Run preflight"}
        </Button>
      </div>

      {gate.state === "stale" && <p className="text-xs text-brand-warning">The draft changed after this review. Re-run before approving.</p>}
      {review?.ai_error && <p className="text-xs text-brand-warning">AI review unavailable: {review.ai_error}. Rule checks still ran.</p>}
      {review && review.findings.length === 0 && <p className="text-sm text-muted-foreground">No issues found.</p>}

      {[{ title: "Blocking", list: blocking }, { title: "Advisory", list: advisory }].map(({ title, list }) => list.length > 0 && (
        <div key={title} className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{title} · {list.length}</p>
          {list.map((f, i) => (
            <div key={i} className={`rounded-md border p-2.5 space-y-1 ${f.severity === "blocking" ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-muted/20"}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-mono">{f.check.replace(/_/g, " ")}</Badge>
                <span className="text-[9px] text-muted-foreground">{f.source === "ai" ? "AI" : "Rule"}</span>
              </div>
              <p className="text-xs">{f.message}</p>
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
          ))}
        </div>
      ))}

      {review?.overridden_at && <p className="text-xs text-muted-foreground">Overridden {format(new Date(review.overridden_at), "MMM d, p")}: {review.override_reason}</p>}

      {gate.state === "warnings" && (
        <Button size="sm" variant="secondary" onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending}>Acknowledge warnings</Button>
      )}
      {gate.state === "blocked" && isAdmin && (
        <div className="space-y-2 rounded-md border border-border/60 p-2.5">
          <p className="text-xs text-muted-foreground">Override blocking issues (admins only, logged with your reason)</p>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this safe to approve?" />
          <Button size="sm" variant="destructive" disabled={reason.trim().length < 8 || override.isPending}
            onClick={() => override.mutate(reason.trim(), { onSuccess: () => setReason("") })}>Override and allow</Button>
        </div>
      )}
    </div>
  );
}

export function PreflightDialog({ open, onOpenChange, pf, isAdmin, intent }: {
  open: boolean; onOpenChange: (o: boolean) => void; pf: Preflight; isAdmin: boolean; intent?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Preflight Review</DialogTitle>
          <DialogDescription>
            {intent ?? "Automated checks against your brand rules, platform limits, recent posts, and linked sources. Preflight never edits the draft."}
          </DialogDescription>
        </DialogHeader>
        <PreflightPanel pf={pf} isAdmin={isAdmin} />
      </DialogContent>
    </Dialog>
  );
}
