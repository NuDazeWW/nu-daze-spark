import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useClients } from "@/hooks/useClients";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useBrandKit, composeWatermark, type BrandColor, type WatermarkPos } from "@/lib/brandKit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";

const FONT_SUGGESTIONS = ["Space Grotesk", "Inter", "IBM Plex Mono", "Playfair Display", "Montserrat", "Lato", "Roboto", "Source Serif"];

export default function BrandKitPage() {
  const { clients } = useClients();
  const { canCreate } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => { if (!clientId && clients[0]) setClientId(clients[0].id); }, [clients, clientId]);
  const q = useBrandKit(clientId);

  const [colors, setColors] = useState<BrandColor[]>([]);
  const [fonts, setFonts] = useState<string[]>([]);
  const [tone, setTone] = useState("");
  const [fontDraft, setFontDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pos, setPos] = useState<WatermarkPos>("bottom-right");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setColors(q.data.kit.colors); setFonts(q.data.kit.fonts); setTone(q.data.kit.tone ?? "");
  }, [q.data]);

  // watermark preview on a brand-colored sample canvas
  useEffect(() => {
    let url: string | null = null; let alive = true;
    const c = document.createElement("canvas"); c.width = 800; c.height = 800;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 800, 800);
    g.addColorStop(0, colors[0]?.hex ?? "#1e293b"); g.addColorStop(1, colors[1]?.hex ?? colors[0]?.hex ?? "#475569");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 800);
    composeWatermark(c.toDataURL(), q.data?.logoUrl ?? null, pos).then((b) => { if (!alive) return; url = URL.createObjectURL(b); setPreview(url); }).catch(() => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [colors, q.data?.logoUrl, pos]);

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    const row = { client_id: clientId, colors, fonts, tone: tone || null, updated_by: user?.id ?? null };
    const res = q.data?.kit.id
      ? await supabase.from("brand_kits").update(row).eq("id", q.data.kit.id)
      : await supabase.from("brand_kits").insert(row);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Brand Kit saved"); qc.invalidateQueries({ queryKey: ["brand-kit", clientId] });
  };

  const uploadLogo = async (file: File) => {
    if (!clientId) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Logo must be under 10 MB");
    setUploading(true);
    try {
      const path = `${clientId}/brand/logo-${Date.now()}.${file.name.split(".").pop() || "png"}`;
      const { error } = await supabase.storage.from("account-avatars").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const res = q.data?.kit.id
        ? await supabase.from("brand_kits").update({ logo_path: path }).eq("id", q.data.kit.id)
        : await supabase.from("brand_kits").insert({ client_id: clientId, logo_path: path, colors, fonts, tone: tone || null });
      if (res.error) throw res.error;
      toast.success("Logo uploaded"); qc.invalidateQueries({ queryKey: ["brand-kit", clientId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed (admins only)"); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Brand Kit Studio" description="Logos, colors, fonts and tone for each client — applied to AI-generated media and watermarks.">
        <Select value={clientId ?? ""} onValueChange={setClientId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Choose client" /></SelectTrigger>
          <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card><CardHeader><CardTitle>Logo</CardTitle><CardDescription>PNG with transparency works best. Used as the watermark on generated images.</CardDescription></CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-md border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                  {q.data?.logoUrl ? <img src={q.data.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">None</span>}
                </div>
                <Button variant="outline" asChild disabled={!canCreate || uploading} className="gap-2">
                  <label className="cursor-pointer">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload logo
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></label>
                </Button>
              </CardContent></Card>

            <Card><CardHeader><CardTitle>Color palette</CardTitle><CardDescription>First two colors drive gradients and AI image accents.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="color" value={c.hex} onChange={(e) => setColors(colors.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className="h-9 w-12 rounded border border-border bg-transparent" />
                    <Input value={c.name} onChange={(e) => setColors(colors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name (e.g. Primary)" className="max-w-48" />
                    <Input value={c.hex} onChange={(e) => setColors(colors.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className="w-28 font-mono text-xs" />
                    <Button size="icon" variant="ghost" onClick={() => setColors(colors.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="gap-1" disabled={colors.length >= 8} onClick={() => setColors([...colors, { name: "", hex: "#3b82f6" }])}><Plus className="h-4 w-4" /> Add color</Button>
              </CardContent></Card>

            <Card><CardHeader><CardTitle>Typography</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">{fonts.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm" style={{ fontFamily: f }}>{f}
                    <button aria-label={`Remove ${f}`} onClick={() => setFonts(fonts.filter((x) => x !== f))}><X className="h-3 w-3" /></button></span>))}</div>
                <div className="flex gap-2">
                  <Input list="font-suggest" value={fontDraft} onChange={(e) => setFontDraft(e.target.value)} placeholder="Add a font" className="max-w-60" />
                  <datalist id="font-suggest">{FONT_SUGGESTIONS.map((f) => <option key={f} value={f} />)}</datalist>
                  <Button size="sm" variant="outline" onClick={() => { const f = fontDraft.trim(); if (f && !fonts.includes(f)) setFonts([...fonts, f]); setFontDraft(""); }}>Add</Button>
                </div>
              </CardContent></Card>

            <Card><CardHeader><CardTitle>Visual tone</CardTitle><CardDescription>Guides the mood of AI-generated imagery.</CardDescription></CardHeader>
              <CardContent><Textarea rows={3} value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Confident, warm, natural light, real people, no stock-photo clichés" /></CardContent></Card>

            <Button onClick={save} disabled={!canCreate || saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Brand Kit</Button>
          </div>

          <Card className="h-fit"><CardHeader><CardTitle>Watermark preview</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {preview && <img src={preview} alt="Watermark preview" className="w-full rounded-md border border-border" />}
              <Select value={pos} onValueChange={(v) => setPos(v as WatermarkPos)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["bottom-right", "bottom-left", "top-right", "top-left"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p.replace("-", " ")}</SelectItem>)}</SelectContent></Select>
              <div className="flex flex-wrap gap-2 pt-1">{fonts.slice(0, 3).map((f) => <p key={f} className="text-lg w-full" style={{ fontFamily: f, color: colors[0]?.hex }}>{f} — Aa</p>)}</div>
            </CardContent></Card>
        </div>
      )}
    </div>
  );
}
