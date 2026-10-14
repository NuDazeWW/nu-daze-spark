import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Bookmark, Sparkles } from "lucide-react";
import { toast } from "sonner";

export type StudioSettings = {
  platform: string; contentType: string; tone: string; audience: string; cta: string; voice: string; enhance: boolean;
};
export const DEFAULT_SETTINGS: StudioSettings = { platform: "linkedin", contentType: "image", tone: "confident", audience: "", cta: "", voice: "", enhance: true };

const PLATFORMS = [["linkedin", "LinkedIn"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube Shorts"], ["x", "X"]];
const TYPES = [["image", "Image post"], ["story", "Story"], ["reel", "Reel / Short video"]];
const TONES = ["confident", "warm", "bold", "thoughtful", "playful", "authoritative"];
const PRESET_KEY = "socialmotive.studioPreset";

type Props = { clientId: string | null; value: StudioSettings; onChange: (v: StudioSettings) => void; onGenerate: () => void; busy: boolean; disabled: boolean };

export function StudioControls({ clientId, value, onChange, onGenerate, busy, disabled }: Props) {
  const set = (k: keyof StudioSettings, v: string | boolean) => onChange({ ...value, [k]: v });
  const strat = useQuery({
    queryKey: ["studio-strategy", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const [a, c, v] = await Promise.all([
        supabase.from("audience_definitions").select("id, segment_name").eq("client_id", clientId!).eq("is_active", true),
        supabase.from("cta_banks").select("id, ctas").eq("client_id", clientId!).eq("is_active", true),
        supabase.from("voice_profiles").select("id, name").eq("client_id", clientId!).eq("is_active", true),
      ]);
      return {
        audiences: (a.data ?? []).map((x) => x.segment_name),
        ctas: Array.from(new Set((c.data ?? []).flatMap((x) => x.ctas ?? []))).slice(0, 30),
        voices: (v.data ?? []).map((x) => x.name),
      };
    },
  });
  const field = (label: string, k: keyof StudioSettings, opts: [string, string][], placeholder = "Select") => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={(value[k] as string) || undefined} onValueChange={(v) => set(k, v)}>
        <SelectTrigger className="h-9"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v} className="capitalize">{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  const pairs = (xs: string[] = []) => xs.map((x) => [x, x] as [string, string]);

  return (
    <section className="sm-card rounded-2xl border border-border/60 bg-card p-4 space-y-3" aria-label="Generation controls">
      <h2 className="font-display text-sm font-semibold">Generation Controls</h2>
      {field("Platform", "platform", PLATFORMS as [string, string][])}
      {field("Content Type", "contentType", TYPES as [string, string][])}
      {field("Tone", "tone", pairs(TONES))}
      {field("Target Audience", "audience", pairs(strat.data?.audiences), strat.data?.audiences.length ? "Select audience" : "No audiences saved")}
      {field("Primary CTA", "cta", pairs(strat.data?.ctas), strat.data?.ctas.length ? "Select CTA" : "No CTAs saved")}
      {field("Brand Voice", "voice", pairs(strat.data?.voices), strat.data?.voices.length ? "Select voice" : "Brand default")}
      <label className="flex items-center justify-between gap-2 rounded-xl border border-border/50 px-3 py-2 text-xs">
        <span><span className="font-medium">AI Prompt Enhancement</span><br /><span className="text-muted-foreground">Adds these choices to your prompt</span></span>
        <Switch checked={value.enhance} onCheckedChange={(v) => set("enhance", v)} />
      </label>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { localStorage.setItem(PRESET_KEY, JSON.stringify(value)); toast.success("Preset saved"); }}>
          <Bookmark className="h-3.5 w-3.5" /> Save preset
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { const p = localStorage.getItem(PRESET_KEY); if (p) onChange({ ...DEFAULT_SETTINGS, ...JSON.parse(p) }); else toast("No preset saved yet"); }}>
          Load preset
        </Button>
      </div>
      <Button className="sm-btn-primary w-full gap-2" onClick={onGenerate} disabled={busy || disabled}>
        <Sparkles className="h-4 w-4" /> {busy ? "Generating…" : "Generate Variations"} <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
}

export function buildPromptContext(s: StudioSettings, assetTitles: string[]) {
  if (!s.enhance) return "";
  const parts = [
    `for ${s.platform} ${s.contentType}`, `tone: ${s.tone}`,
    s.audience && `audience: ${s.audience}`, s.cta && `call to action: ${s.cta}`, s.voice && `brand voice: ${s.voice}`,
    assetTitles.length && `inspired by source assets: ${assetTitles.join(", ")}`,
  ].filter(Boolean);
  return parts.join("; ");
}
