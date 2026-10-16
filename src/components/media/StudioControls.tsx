import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Bookmark, Sparkles, Share2, LayoutGrid, Smile, Users, MousePointerClick, FileText } from "lucide-react";
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
  const ICONS: Record<string, React.ElementType> = { platform: Share2, contentType: LayoutGrid, tone: Smile, audience: Users, cta: MousePointerClick, voice: FileText };
  const TONES: Record<string, string> = { platform: "var(--sm-fx-turquoise)", contentType: "var(--sm-fx-violet)", tone: "var(--sm-fx-citrine)", audience: "var(--sm-fx-lime)", cta: "var(--sm-fx-coral)", voice: "var(--sm-fx-magenta)" };
  const field = (label: string, k: keyof StudioSettings, opts: [string, string][], placeholder = "Select") => {
    const Icon = ICONS[k];
    return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={(value[k] as string) || undefined} onValueChange={(v) => set(k, v)}>
        <SelectTrigger className="sm-studio-select h-10 gap-2"><span className="sm-field-well" style={{ "--tone": TONES[k] } as React.CSSProperties}><Icon className="h-3.5 w-3.5" /></span><span className="flex-1 text-left truncate"><SelectValue placeholder={placeholder} /></span></SelectTrigger>
        <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v} className="capitalize">{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    );
  };
  const pairs = (xs: string[] = []) => xs.map((x) => [x, x] as [string, string]);

  return (
    <section className="sm-studio-panel sm-studio-panel-lit p-3.5 space-y-2.5" aria-label="Generation controls">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <h2 className="font-display text-[15px] font-semibold whitespace-nowrap">Generation Controls</h2>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 px-1.5 text-[11px] gap-1" onClick={() => { localStorage.setItem(PRESET_KEY, JSON.stringify(value)); toast.success("Preset saved"); }}><Bookmark className="h-3 w-3" /> Save preset</Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { const p = localStorage.getItem(PRESET_KEY); if (p) onChange({ ...DEFAULT_SETTINGS, ...JSON.parse(p) }); else toast("No preset saved yet"); }}>Load</Button>
        </div>
      </div>
      {field("Platform", "platform", PLATFORMS as [string, string][])}
      {field("Content Type", "contentType", TYPES as [string, string][])}
      {field("Tone", "tone", pairs(TONES))}
      {field("Target Audience", "audience", pairs(strat.data?.audiences), strat.data?.audiences.length ? "Select audience" : "No audiences saved")}
      {field("Primary CTA", "cta", pairs(strat.data?.ctas), strat.data?.ctas.length ? "Select CTA" : "No CTAs saved")}
      {field("Brand Voice", "voice", pairs(strat.data?.voices), strat.data?.voices.length ? "Select voice" : "Brand default")}
      <label className="flex items-center justify-between gap-2 pt-1 text-xs">
        <span><span className="font-display text-sm font-semibold">AI Prompt Enhancement</span><br /><span className="text-muted-foreground">Automatically adds these choices to your prompt.</span></span>
        <Switch checked={value.enhance} onCheckedChange={(v) => set("enhance", v)} />
      </label>
      <Button className="sm-generate-btn w-full h-12 gap-2 text-base" onClick={onGenerate} disabled={busy || disabled}>
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
