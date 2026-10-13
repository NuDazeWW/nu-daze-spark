import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface MotiveBreakdown {
  hook_strength: number;
  strategic_fit: number;
  voice_fit: number | null;
  platform_fit: number;
  originality: number;
  total: number;
  band: "strong" | "workable" | "needs_work";
  weakest: { key: string; hint: string };
}

const BAND = {
  strong: { label: "Strong", cls: "sm-status sm-status-approved" },
  workable: { label: "Workable", cls: "sm-status sm-status-in_review" },
  needs_work: { label: "Needs work", cls: "sm-status sm-status-needs_revision" },
} as const;

const PARTS: { key: keyof MotiveBreakdown; label: string; max: number }[] = [
  { key: "hook_strength", label: "Hook strength", max: 25 },
  { key: "strategic_fit", label: "Strategic fit", max: 25 },
  { key: "voice_fit", label: "Voice fit", max: 20 },
  { key: "platform_fit", label: "Platform fit", max: 15 },
  { key: "originality", label: "Originality", max: 15 },
];

/** Content Motive Score™ — 0-100 quality score with expandable sub-scores. */
export function MotiveScore({ score, breakdown }: { score: number; breakdown?: MotiveBreakdown | null }) {
  const [open, setOpen] = useState(false);
  const band = breakdown?.band ?? (score >= 80 ? "strong" : score >= 60 ? "workable" : "needs_work");
  const meta = BAND[band];
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => breakdown && setOpen((o) => !o)}
        className="flex items-center gap-2 text-left w-full"
      >
        <span className="text-[11px] text-muted-foreground">Content Motive Score™</span>
        <span className="font-mono text-sm font-semibold">{score}</span>
        <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
        {breakdown && (open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />)}
      </button>
      {open && breakdown && (
        <div className="rounded-md border border-border/50 p-2.5 space-y-1.5">
          {PARTS.map((p) => {
            const v = breakdown[p.key] as number | null;
            return (
              <div key={p.key} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 text-muted-foreground">{p.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${v == null ? 0 : (v / p.max) * 100}%` }}
                  />
                </div>
                <span className="font-mono w-10 text-right">{v == null ? "—" : `${v}/${p.max}`}</span>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground pt-1">
            Weakest: {breakdown.weakest.key} — {breakdown.weakest.hint}
          </p>
        </div>
      )}
    </div>
  );
}

/** Compact chip for queue cards. */
export function MotiveScoreChip({ score }: { score: number }) {
  const band = score >= 80 ? "strong" : score >= 60 ? "workable" : "needs_work";
  return (
    <Badge variant="outline" className={`text-[10px] font-mono ${BAND[band].cls}`} title="Content Motive Score™">
      {score}
    </Badge>
  );
}
