import { useCreditGate } from "@/components/billing/CreditGate";
import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBrandKit, composeWatermark, type WatermarkPos } from "@/lib/brandKit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, ImagePlus, Loader2, Palette, Save, Sparkles, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { VideoStudio } from "./VideoStudio";

type Props = {
  clientId: string | null; postCardId?: string; defaultPrompt?: string; platform?: string; canCreate: boolean;
  promptContext?: string; generateSignal?: number; onBusyChange?: (busy: boolean) => void;
  onResult?: (dataUrl: string, prompt: string) => void;
};

export function MediaStudio({ clientId, postCardId, defaultPrompt = "", platform, canCreate, promptContext = "", generateSignal = 0, onBusyChange, onResult }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const brand = useBrandKit(clientId);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [aspect, setAspect] = useState(platform === "linkedin" || platform === "facebook" ? "landscape" : platform === "instagram" ? "portrait" : "square");
  const [style, setStyle] = useState("photographic");
  const [applyBrand, setApplyBrand] = useState(true);
  const [watermark, setWatermark] = useState(true);
  const [pos, setPos] = useState<WatermarkPos>("bottom-right");
  const [raw, setRaw] = useState<string | null>(null);
  const [final, setFinal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const logoUrl = brand.data?.logoUrl ?? null;
  const kit = brand.data?.kit;

  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    if (platform) setAspect(platform === "linkedin" || platform === "facebook" || platform === "x" ? "landscape" : platform === "instagram" || platform === "youtube" ? "portrait" : "square");
  }, [platform]);

  useEffect(() => {
    let alive = true; let made: string | null = null;
    if (!raw) { setFinal(null); return; }
    if (!watermark || !logoUrl) { setFinal(raw); return; }
    composeWatermark(raw, logoUrl, pos).then((b) => { if (!alive) return; made = URL.createObjectURL(b); setFinal(made); })
      .catch(() => setFinal(raw));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [raw, watermark, logoUrl, pos]);

  const { ensure } = useCreditGate();
  const generate = async () => {
    if (!clientId) return toast.error("Pick a client first");
    if (prompt.trim().length < 5) return toast.error("Describe the image first");
    if (!(await ensure({ bucket: "credits", capability: "image_standard", clientId, label: "Standard AI image (5 credits)" }))) return;
    setBusy(true); setRaw(null);
    try {
      const fullPrompt = promptContext ? `${prompt}\n\nContext: ${promptContext}` : prompt;
      const { data, error } = await supabase.functions.invoke("generate-media", { body: { client_id: clientId, prompt: fullPrompt, aspect, style, apply_brand: applyBrand } });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ } }
        throw new Error(msg);
      }
      setRaw(`data:image/png;base64,${data.b64}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Generation failed"); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (generateSignal > 0) generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [generateSignal]);

  const save = async () => {
    if (!final || !user || !clientId) return;
    setSaving(true);
    try {
      const blob = await (await fetch(final)).blob();
      const path = `${user.id}/generated/${crypto.randomUUID()}.png`;
      const { error: up } = await supabase.storage.from("source-assets").upload(path, blob, { contentType: "image/png" });
      if (up) throw up;
      const { error: ins } = await supabase.from("source_assets").insert({
        title: `AI image — ${prompt.slice(0, 60)}`, description: `AI-generated (${style}, ${aspect})${watermark && logoUrl ? ", logo watermark" : ""}. Prompt: ${prompt}`,
        asset_type: "image", file_path: path, client_id: clientId, created_by: user.id, permission_state: "generation_allowed",
      });
      if (ins) throw ins;
      if (postCardId) {
        const { data: pc } = await supabase.from("post_cards").select("media_urls").eq("id", postCardId).single();
        await supabase.from("post_cards").update({ media_urls: [...(pc?.media_urls ?? []), path], apply_ai_disclosure: true }).eq("id", postCardId);
        qc.invalidateQueries({ queryKey: ["post-cards"] });
      }
      qc.invalidateQueries({ queryKey: ["source-assets"] });
      toast.success(postCardId ? "Saved to Asset Library and attached to this post" : "Saved to Asset Library");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (!canCreate) return <p className="text-sm text-muted-foreground">Only owners, admins and editors can generate media.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs">
        <span className="flex items-center gap-2"><Palette className="h-3.5 w-3.5 text-primary" />
          {kit?.colors.length ? <span className="flex gap-1">{kit.colors.slice(0, 6).map((c) => <span key={c.hex} title={c.name} className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: c.hex }} />)}</span> : "No brand colors yet"}
          {logoUrl ? <Badge variant="outline" className="text-[10px]">Logo ready</Badge> : <Badge variant="outline" className="text-[10px]">No logo</Badge>}
        </span>
        <Link to="/settings/brand-kit" className="text-primary underline-offset-2 hover:underline">Edit Brand Kit</Link>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><Label>Describe the image</Label><span className="font-mono text-[10px] text-muted-foreground">{prompt.length} / 2,000</span></div>
        <Textarea rows={3} maxLength={2000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. A leadership team reviewing a strategy board in a sunlit studio, candid, warm" />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {["Make it more bold", "Brighter and warmer", "Minimal background", "Add people", "Close-up detail"].map((r) => (
            <button key={r} type="button" onClick={() => setPrompt((p) => (p.trim() ? `${p.trim()}. ${r}` : r).slice(0, 2000))}
              className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors">
              + {r}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label className="text-xs">Format</Label>
          <Select value={aspect} onValueChange={setAspect}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="square">Square 1:1</SelectItem><SelectItem value="portrait">Portrait 2:3</SelectItem><SelectItem value="landscape">Landscape 3:2</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Style</Label>
          <Select value={style} onValueChange={setStyle}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{["photographic", "editorial illustration", "minimal flat graphic", "3D render", "cinematic"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Logo position</Label>
          <Select value={pos} onValueChange={(v) => setPos(v as WatermarkPos)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{["bottom-right", "bottom-left", "top-right", "top-left"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p.replace("-", " ")}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><Switch checked={applyBrand} onCheckedChange={setApplyBrand} /> Use brand colors & tone</label>
        <label className="flex items-center gap-2"><Switch checked={watermark} onCheckedChange={setWatermark} disabled={!logoUrl} /> Add logo watermark</label>
      </div>
      <Button onClick={generate} disabled={busy || prompt.trim().length < 5} className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "Creating image…" : raw ? "Generate another" : "Generate image"}
      </Button>

      <div className="rounded-lg border border-dashed border-border/60 min-h-48 flex items-center justify-center overflow-hidden bg-muted/10">
        {busy ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> This takes 20–60 seconds</div>
          : final ? <img src={final} alt="Generated visual" className="max-h-[28rem] w-auto" />
          : <div className="text-xs text-muted-foreground flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Your image appears here</div>}
      </div>
      {final && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{postCardId ? "Save & attach to post" : "Save to Asset Library"}</Button>
          <Button variant="outline" asChild className="gap-2"><a href={final} download="socialmotive-image.png"><Download className="h-4 w-4" /> Download</a></Button>
        </div>
      )}
      <div className="border-t border-border/50 pt-4 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Video className="h-4 w-4 text-primary" /> AI video clips for Reels, Stories & Shorts</h3>
        <VideoStudio clientId={clientId} postCardId={postCardId} defaultPrompt={defaultPrompt} />
      </div>
      <p className="text-[11px] text-muted-foreground">AI images are saved as cleared assets and marked for the AI-assisted disclosure. Nothing is published automatically.</p>
    </div>
  );
}
