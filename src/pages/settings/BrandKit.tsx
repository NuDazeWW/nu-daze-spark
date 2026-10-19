import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useClients } from "@/hooks/useClients";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useBrandKit, composeWatermark, type BrandColor, type WatermarkPos } from "@/lib/brandKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Ban, CloudUpload, Image as ImageIcon, Loader2, Palette, Plus, Save, Sparkles, Stamp, Trash2, Type, Upload, X } from "lucide-react";
import workspaceBackground from "@/assets/help-workspace-background.jpg";
import watermarkBird from "@/assets/brand/nudaze-watermark-bird.png";
import watermarkScenic from "@/assets/watermark-scenic.jpg";
import type { BuilderMode } from "@/components/strategy/StrategyBuilderDialog";
import { FileText, LayoutTemplate } from "lucide-react";

const FONT_SUGGESTIONS = ["Space Grotesk", "Inter", "IBM Plex Mono", "Playfair Display", "Montserrat", "Lato", "Roboto", "Source Serif"];

export default function BrandKitPage({ center, navigation, onBuilder }: { center?: import("react").ReactNode; navigation?: import("react").ReactNode; onBuilder?: (mode: BuilderMode) => void } = {}) {
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

  // watermark preview on a neutral scenic sample photo
  useEffect(() => {
    let url: string | null = null; let alive = true;
    composeWatermark(watermarkScenic, q.data?.logoUrl ?? watermarkBird, pos).then((b) => { if (!alive) return; url = URL.createObjectURL(b); setPreview(url); }).catch(() => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [q.data?.logoUrl, pos]);

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
      toast.success("Logo added"); qc.invalidateQueries({ queryKey: ["brand-kit", clientId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add the file (admins only)"); }
    finally { setUploading(false); }
  };

  const Head = ({ icon: Icon, title, desc }: { icon: typeof ImageIcon; title: string; desc?: string }) => (
    <div className="sm-bk-head"><span className="sm-bk-icon"><Icon className="h-5 w-5" /></span>
      <div><h2 className="sm-bk-title">{title}</h2>{desc && <p className="sm-bk-desc">{desc}</p>}</div></div>
  );

  const clientSelect = (
    <Select value={clientId ?? ""} onValueChange={setClientId}>
      <SelectTrigger className="w-56 sm-bk-field"><SelectValue placeholder="Choose client" /></SelectTrigger>
      <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <div className={center ? "sm-bk sm-bk-studio" : "sm-bk"}>
      {!center && <img src={workspaceBackground} alt="" aria-hidden="true" className="sm-help-background" width={1536} height={1024} />}
      {!center && (
        <PageHeader title="Brand Kit Studio" description="Logos, colors, fonts and tone for each client — applied to AI-generated media and watermarks.">
          {clientSelect}
        </PageHeader>
      )}

      {navigation}
      {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
        <div className={center ? "sm-studio-columns" : "grid gap-5 lg:grid-cols-[1fr_400px]"}>
          <div className={center ? "sm-studio-brand min-w-0" : "space-y-4 min-w-0"}>
            {center && <div className="sm-bk-panel"><Head icon={Palette} title="Brand Kit" /><div className="sm-bk-body space-y-2"><p className="text-xs font-mono uppercase tracking-wide opacity-70">Brand Kit · client</p>{clientSelect}</div></div>}
            <section className="sm-bk-panel">
              <Head icon={ImageIcon} title="Logo" desc="PNG with transparency works best. Used as the watermark on generated images." />
              <div className="sm-bk-logo-row">
                <label className={`sm-bk-drop ${!canCreate || uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
                  <CloudUpload className="h-9 w-9 sm-bk-cyan" />
                  <span className="sm-bk-btn-cyan">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload logo</span>
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" disabled={!canCreate || uploading} onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                </label>
                <div className="sm-bk-logo-box">
                  {q.data?.logoUrl ? <img src={q.data.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /> : <><Ban className="h-7 w-7" /><span>None</span></>}
                </div>
              </div>
            </section>

            <section className="sm-bk-panel">
              <Head icon={Palette} title="Color palette" desc="First two colors drive gradients and AI image accents." />
              <div className="sm-bk-body space-y-3">
                {colors.map((c, i) => (
                  <div key={i} className="sm-studio-color-row flex items-center gap-2">
                    <input type="color" value={c.hex} onChange={(e) => setColors(colors.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className={`sm-bk-swatch ${i === 0 ? "is-cyan" : i === 1 ? "is-gold" : ""}`} />
                    <Input value={c.name} onChange={(e) => setColors(colors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name (e.g. Primary)" className="max-w-48 sm-bk-field" />
                    <Input value={c.hex} onChange={(e) => setColors(colors.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className="w-28 font-mono text-xs sm-bk-field" />
                    <Button size="icon" variant="ghost" className="sm-bk-ghost" onClick={() => setColors(colors.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="sm-bk-btn-outline" disabled={colors.length >= 8} onClick={() => setColors([...colors, { name: "", hex: "#3b82f6" }])}><Plus className="h-4 w-4 sm-bk-cyan" /> Add color</Button>
              </div>
            </section>

            <section className="sm-bk-panel">
              <div className="sm-bk-type-row">
                <Head icon={Type} title="Typography" />
                <div className="flex-1 space-y-2">
                  {fonts.length > 0 && <div className="flex flex-wrap gap-2">{fonts.map((f) => (
                    <span key={f} className="sm-bk-chip" style={{ fontFamily: f }}>{f}
                      <Button size="icon" variant="ghost" className="h-5 w-5" aria-label={`Remove ${f}`} onClick={() => setFonts(fonts.filter((x) => x !== f))}><X className="h-3 w-3" /></Button></span>))}</div>}
                  <div className="flex gap-2">
                    <Input list="font-suggest" value={fontDraft} onChange={(e) => setFontDraft(e.target.value)} placeholder="Add a font" className="sm-bk-field" />
                    <datalist id="font-suggest">{FONT_SUGGESTIONS.map((f) => <option key={f} value={f} />)}</datalist>
                    <Button type="button" variant="outline" className="sm-bk-btn-cyan" onClick={() => { const f = fontDraft.trim(); if (f && !fonts.includes(f)) setFonts([...fonts, f]); setFontDraft(""); }}>Add</Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="sm-bk-panel">
              <Head icon={Sparkles} title="Visual tone" desc="Guides the mood of AI-generated imagery." />
              <div className="sm-bk-body"><Textarea rows={2} value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Confident, warm, natural light, real people, no stock-photo clichés" className="sm-bk-field" /></div>
            </section>

            <Button type="button" variant="outline" onClick={save} disabled={!canCreate || saving} className="sm-bk-save">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Save Brand Kit</Button>
          </div>

          {center && <div className="min-w-0">{center}</div>}

          <div className={center ? "sm-studio-aside" : ""}>
          <section className="sm-bk-panel sm-bk-preview h-fit">
            <Head icon={Stamp} title="Watermark preview" />
            <div className="sm-bk-body space-y-3">
              {preview && <img src={preview} alt="Watermark preview" className="sm-bk-preview-img" />}
              <Select value={pos} onValueChange={(v) => setPos(v as WatermarkPos)}><SelectTrigger className="sm-bk-field"><SelectValue /></SelectTrigger>
                <SelectContent>{["bottom-right", "bottom-left", "top-right", "top-left"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p.replace("-", " ")}</SelectItem>)}</SelectContent></Select>
              <div className="flex flex-wrap gap-2 pt-1">{fonts.slice(0, 3).map((f) => <p key={f} className="text-lg w-full" style={{ fontFamily: f, color: colors[0]?.hex }}>{f} — Aa</p>)}</div>
            </div>
          </section>
          {center && onBuilder && canCreate && <section className="sm-bk-panel sm-studio-quick-links">
            <Head icon={Sparkles} title="Quick links" />
            <Button variant="outline" onClick={() => onBuilder("website")}><Sparkles />Generate brand voice</Button>
            <Button variant="outline" onClick={() => onBuilder("document")}><FileText />Import brand guide</Button>
            <Button variant="outline" onClick={() => onBuilder("preset")}><LayoutTemplate />Starter kits</Button>
          </section>}
          </div>
        </div>
      )}
    </div>
  );
}
