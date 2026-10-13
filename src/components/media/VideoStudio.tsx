import { useEffect, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCreditGate } from "@/components/billing/CreditGate";
import { Loader2, Save, Video } from "lucide-react";

type Props = { clientId: string | null; postCardId?: string; defaultPrompt?: string };

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("generate-video", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ } }
    throw new Error(msg);
  }
  return data;
};

export function VideoStudio({ clientId, postCardId, defaultPrompt = "" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [aspect, setAspect] = useState("9:16");
  const [duration, setDuration] = useState("6");
  const [applyBrand, setApplyBrand] = useState(true);
  const [busy, setBusy] = useState(false);
  const [path, setPath] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const { ensure } = useCreditGate();
  const generate = async () => {
    if (!clientId) return toast.error("Pick a client first");
    const cap = duration === "8" ? "video_8s_premium" : "video_6s_draft";
    if (!(await ensure({ bucket: "credits", capability: cap, clientId, label: duration === "8" ? "8-second premium AI video" : "Draft AI video clip" }))) return;
    setBusy(true); setPath(null); setSrc(null);
    try {
      const { video_id } = await call({ client_id: clientId, prompt, aspect, duration: Number(duration), apply_brand: applyBrand });
      for (let i = 0; i < 60 && alive.current; i++) {
        await new Promise((r) => setTimeout(r, 8000));
        const s = await call({ action: "status", client_id: clientId, video_id });
        if (s.status === "failed") throw new Error(s.error);
        if (s.status === "completed") {
          const { data } = await supabase.storage.from("source-assets").createSignedUrl(s.path, 3600);
          setPath(s.path); setSrc(data?.signedUrl ?? null); return;
        }
      }
      throw new Error("The clip is taking longer than expected. Try again later.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Video generation failed"); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!path || !user || !clientId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("source_assets").insert({
        title: `AI video — ${prompt.slice(0, 60)}`, description: `AI-generated video (${aspect}, ${duration}s). Prompt: ${prompt}`,
        asset_type: "video", file_path: path, client_id: clientId, created_by: user.id, permission_state: "generation_allowed",
      });
      if (error) throw error;
      if (postCardId) {
        const { data: pc } = await supabase.from("post_cards").select("media_urls").eq("id", postCardId).single();
        await supabase.from("post_cards").update({ media_urls: [...(pc?.media_urls ?? []), path], apply_ai_disclosure: true }).eq("id", postCardId);
        qc.invalidateQueries({ queryKey: ["post-cards"] });
      }
      qc.invalidateQueries({ queryKey: ["source-assets"] });
      toast.success(postCardId ? "Saved and attached to this post" : "Saved to Asset Library");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Describe the clip</Label>
        <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Slow push-in on a team whiteboard session, sticky notes, warm morning light" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Shape</Label>
          <Select value={aspect} onValueChange={setAspect}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="9:16">Tall 9:16 (Reels, Stories, Shorts)</SelectItem><SelectItem value="16:9">Wide 16:9 (LinkedIn, YouTube)</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Length</Label>
          <Select value={duration} onValueChange={setDuration}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{["4", "6", "8"].map((d) => <SelectItem key={d} value={d}>{d} seconds</SelectItem>)}</SelectContent></Select></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={applyBrand} onCheckedChange={setApplyBrand} /> Use brand colors & tone</label>
      <Button onClick={generate} disabled={busy || prompt.trim().length < 5} className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />} {busy ? "Creating clip…" : src ? "Generate another" : "Generate video"}
      </Button>
      <div className="rounded-lg border border-dashed border-border/60 min-h-48 flex items-center justify-center overflow-hidden bg-muted/10">
        {busy ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Clips take 1–3 minutes. Keep this page open.</div>
          : src ? <video src={src} controls className="max-h-[28rem] w-auto" />
          : <div className="text-xs text-muted-foreground flex items-center gap-2"><Video className="h-4 w-4" /> Your clip appears here</div>}
      </div>
      {path && (
        <Button onClick={save} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{postCardId ? "Save & attach to post" : "Save to Asset Library"}</Button>
      )}
    </div>
  );
}
