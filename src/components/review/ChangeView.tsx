import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostCard } from "@/hooks/usePostCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Part = { t: "same" | "add" | "del"; v: string };

/** Word-level diff (LCS). Fine for social-length copy. */
export function diffWords(a: string, b: string): Part[] {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: Part[] = [];
  const push = (t: Part["t"], v: string) => {
    const last = out[out.length - 1];
    if (last && last.t === t) last.v += v; else out.push({ t, v });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { push("same", A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", A[i++]);
    else push("add", B[j++]);
  }
  while (i < n) push("del", A[i++]);
  while (j < m) push("add", B[j++]);
  return out;
}

const SOURCE: Record<string, string> = {
  before_human_edit: "Human edit",
  before_preflight_ai_fix: "Preflight AI fix",
};

export function ChangeView({ card }: { card: PostCard }) {
  const versions = useQuery({
    queryKey: ["post_versions", card.id, card.updated_at],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_versions")
        .select("id, version_number, draft_copy, hashtags, edit_source, created_at")
        .eq("post_card_id", card.id).order("version_number");
      if (error) throw error;
      return data ?? [];
    },
  });
  const list = versions.data ?? [];
  const [baseIdx, setBaseIdx] = useState(0);
  const base = list[baseIdx];
  const original = base?.draft_copy ?? card.draft_copy;
  const parts = useMemo(() => diffWords(original, card.draft_copy), [original, card.draft_copy]);
  const added = parts.filter((p) => p.t === "add").reduce((s, p) => s + p.v.trim().split(/\s+/).filter(Boolean).length, 0);
  const removed = parts.filter((p) => p.t === "del").reduce((s, p) => s + p.v.trim().split(/\s+/).filter(Boolean).length, 0);
  const tagsBefore = new Set(base?.hashtags ?? card.hashtags ?? []);
  const tagsNow = new Set(card.hashtags ?? []);

  if (versions.isLoading) return <p className="text-sm text-muted-foreground">Loading history…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Compare against:</span>
        {list.length === 0 && <Badge variant="outline">Original AI draft (no edits yet)</Badge>}
        {list.map((v, i) => (
          <Button key={v.id} size="sm" variant={i === baseIdx ? "default" : "outline"} className="h-7 text-xs" onClick={() => setBaseIdx(i)}>
            {i === 0 ? "Original AI draft" : `v${v.version_number} · ${SOURCE[v.edit_source] ?? v.edit_source.replace(/_/g, " ")}`}
          </Button>
        ))}
      </div>

      <div className="flex gap-3 text-xs font-mono">
        <span className="text-success">+{added} words added</span>
        <span className="text-destructive">−{removed} words removed</span>
        <span className="text-muted-foreground">{list.length} saved version{list.length === 1 ? "" : "s"}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 bg-muted/30">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            {baseIdx === 0 ? "Original AI draft" : `Version ${base?.version_number}`}
          </p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {parts.filter((p) => p.t !== "add").map((p, k) =>
              <span key={k} className={p.t === "del" ? "bg-destructive/15 text-destructive line-through" : ""}>{p.v}</span>)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Current {["approved", "exported", "posted"].includes(card.approval_status) ? "approved" : ""} version</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {parts.filter((p) => p.t !== "del").map((p, k) =>
              <span key={k} className={p.t === "add" ? "bg-success/15 text-success" : ""}>{p.v}</span>)}
          </p>
        </div>
      </div>

      {(tagsBefore.size > 0 || tagsNow.size > 0) && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hashtags</p>
          <div className="flex flex-wrap gap-1">
            {[...new Set([...tagsBefore, ...tagsNow])].map((t) => {
              const cls = !tagsBefore.has(t) ? "border-success text-success" : !tagsNow.has(t) ? "border-destructive text-destructive line-through" : "";
              return <Badge key={t} variant="outline" className={cls}>{t}</Badge>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
