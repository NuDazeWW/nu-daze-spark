import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const FIELDS = ["impressions", "reactions", "comments", "shares", "clicks", "saves"] as const;
type F = (typeof FIELDS)[number];

export function PostResultsButton({ postId, clientId, className }: { postId: string; clientId: string | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<F, string>>({ impressions: "", reactions: "", comments: "", shares: "", clicks: "", saves: "" });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["post_results", postId],
    queryFn: async () => (await supabase.from("post_results").select("*").eq("post_card_id", postId).order("recorded_at", { ascending: false }).limit(10)).data ?? [],
  });
  const latest = rows[0];

  async function save() {
    setSaving(true);
    const row: Record<string, unknown> = { post_card_id: postId, client_id: clientId, notes: notes.trim() || null };
    for (const f of FIELDS) row[f] = Math.max(0, Math.floor(Number(vals[f]) || 0));
    const { error } = await supabase.from("post_results").insert(row as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Results logged");
    setVals({ impressions: "", reactions: "", comments: "", shares: "", clicks: "", saves: "" }); setNotes("");
    qc.invalidateQueries({ queryKey: ["post_results", postId] });
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {latest ? `Results: ${latest.impressions.toLocaleString()} views` : "Log results"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post results</DialogTitle>
            <DialogDescription>Copy the numbers from the platform's insights. Logged results feed the weekly summary and help the AI learn what works.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {FIELDS.map((f) => (
              <div key={f} className="space-y-1">
                <Label className="text-xs capitalize">{f}</Label>
                <Input type="number" min={0} value={vals[f]} onChange={(e) => setVals({ ...vals, [f]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="space-y-1"><Label className="text-xs">Notes (optional)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></div>
          <Button onClick={save} disabled={saving}>Save results</Button>
          {rows.length > 0 && (
            <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">History</p>
              {rows.map((r) => (
                <p key={r.id}>{new Date(r.recorded_at).toLocaleDateString()} · {r.impressions} views · {r.reactions} reactions · {r.comments} comments · {r.shares} shares · {r.clicks} clicks · {r.saves} saves</p>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
