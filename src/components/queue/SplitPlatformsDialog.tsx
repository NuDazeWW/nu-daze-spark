import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Split, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PostCard } from "@/hooks/usePostCards";
import { postLabel } from "@/components/tracking/PostTracking";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const TARGETS = [
  { id: "linkedin_post", platform: "linkedin", content_type: "post", label: "LinkedIn post", hint: "Professional, B2B insight" },
  { id: "instagram_feed", platform: "instagram", content_type: "post", label: "Instagram feed", hint: "Visual-first caption" },
  { id: "instagram_story", platform: "instagram", content_type: "story", label: "Instagram Story", hint: "2–3 frame storyboard" },
  { id: "instagram_reel", platform: "instagram", content_type: "reel", label: "Instagram Reel", hint: "Hook + timed script" },
  { id: "facebook_post", platform: "facebook", content_type: "post", label: "Facebook post", hint: "Conversational, community" },
  { id: "youtube_short", platform: "youtube", content_type: "reel", label: "YouTube Short", hint: "Title + video script" },
  { id: "x_post", platform: "x", content_type: "post", label: "X post", hint: "Short, punchy, under 280" },
];

type Variant = { target: string; platform: string; content_type: string; draft_copy: string; hashtags: string[]; why: string; keep: boolean; tags: string };

export function SplitPlatformsDialog({ card, open, onOpenChange }: { card: PostCard; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const defaults = TARGETS.filter((t) => !(t.platform === card.platform && t.content_type === card.content_type) && ["linkedin", "instagram", "facebook"].includes(t.platform)).map((t) => t.id);
  const [picked, setPicked] = useState<string[]>(defaults);
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = (o: boolean) => { if (!o) { setVariants(null); setPicked(defaults); } onOpenChange(o); };
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const generate = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("split-platforms", { body: { post_card_id: card.id, targets: picked } });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? "Could not create versions");
    setVariants((data.variants ?? []).map((v: any) => ({ ...v, keep: true, tags: v.hashtags.map((h: string) => `#${h}`).join(" ") })));
  };

  const update = (i: number, patch: Partial<Variant>) => setVariants((vs) => vs!.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const send = async () => {
    const keep = (variants ?? []).filter((v) => v.keep);
    if (!keep.length) return;
    setSaving(true);
    const rows = keep.map((v) => ({
      client_id: card.client_id, created_by: user!.id, platform: v.platform as any, content_type: v.content_type as any,
      draft_copy: v.draft_copy, approval_status: "draft" as const,
      hashtags: v.tags.split(/[\s,]+/).map((t) => t.replace(/^#/, "")).filter(Boolean),
      objective: card.objective, audience: card.audience, campaign_pillar: card.campaign_pillar,
      voice_profile_id: card.voice_profile_id ?? null, brief_id: card.brief_id ?? null,
      master_content_id: card.master_content_id ?? null, people_tags: card.people_tags, org_tags: card.org_tags,
      rationale: `Split across platforms: ${v.why}`, source_references: [`Adapted from ${postLabel(card as any)}`, ...(card.source_references ?? [])],
      repurposed_from_id: card.id,
    }));
    const { error } = await supabase.from("post_cards").insert(rows as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["post_cards"] });
    toast.success(`${rows.length} draft${rows.length === 1 ? "" : "s"} added to Daily Queue`, { action: { label: "Open queue", onClick: () => navigate("/queue") } });
    reset(false);
  };

  const label = (id: string) => TARGETS.find((t) => t.id === id)?.label ?? id;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Split className="h-5 w-5 text-primary" /> Split across platforms</DialogTitle>
          <DialogDescription>Keep the same message from {postLabel(card as any)} and get a version made for each platform. You review everything before it goes to the queue.</DialogDescription>
        </DialogHeader>

        {!variants ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {TARGETS.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50">
                <Checkbox checked={picked.includes(t.id)} onCheckedChange={() => toggle(t.id)} className="mt-0.5" />
                <PlatformIcon platform={t.platform as any} className="h-4 w-4 mt-0.5" />
                <div><div className="text-sm font-medium">{t.label}</div><div className="text-xs text-muted-foreground">{t.hint}</div></div>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {variants.length === 0 && <p className="text-sm text-muted-foreground">No versions came back. Try again.</p>}
            {variants.map((v, i) => (
              <Card key={v.target} className={`p-4 space-y-2 ${v.keep ? "" : "opacity-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium text-sm"><PlatformIcon platform={v.platform as any} className="h-4 w-4" />{label(v.target)}</div>
                  <label className="flex items-center gap-2 text-xs"><Checkbox checked={v.keep} onCheckedChange={(c) => update(i, { keep: !!c })} />Keep</label>
                </div>
                {v.why && <p className="text-xs text-muted-foreground">{v.why}</p>}
                <Textarea value={v.draft_copy} onChange={(e) => update(i, { draft_copy: e.target.value })} rows={8} />
                <div className="flex items-center gap-2">
                  <Input value={v.tags} onChange={(e) => update(i, { tags: e.target.value })} placeholder="#hashtags" className="text-xs" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">{v.draft_copy.length} chars</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          {!variants ? (
            <Button onClick={generate} disabled={busy || !picked.length}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Split className="mr-2 h-4 w-4" />}
              {busy ? "Writing versions…" : `Create ${picked.length} version${picked.length === 1 ? "" : "s"}`}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setVariants(null)}>Back</Button>
              <Button onClick={send} disabled={saving || !variants.some((v) => v.keep)}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send {variants.filter((v) => v.keep).length} to Daily Queue
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
