import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { useClients } from "@/hooks/useClients";
import { useWorkspace } from "@/hooks/useWorkspace";
import { MediaStudio } from "@/components/media/MediaStudio";
import { StudioSourceAssets } from "@/components/media/StudioSourceAssets";
import { StudioControls, DEFAULT_SETTINGS, buildPromptContext, type StudioSettings } from "@/components/media/StudioControls";
import { StudioPreviewCanvas, type PreviewFormat } from "@/components/media/StudioPreviewCanvas";
import { StudioVariationsDeck, type Variation } from "@/components/media/StudioVariationsDeck";
import { StudioInsightsBar } from "@/components/media/StudioInsightsBar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { AiProvidersPanel } from "@/components/media/AiProvidersPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FORMAT_MAP: Record<PreviewFormat, { platform: "linkedin" | "instagram"; content_type: "post" | "story" | "reel" }> = {
  linkedin: { platform: "linkedin", content_type: "post" },
  instagram: { platform: "instagram", content_type: "post" },
  story: { platform: "instagram", content_type: "story" },
  reel: { platform: "instagram", content_type: "reel" },
};

export default function MediaStudioPage() {
  const { clients } = useClients();
  const { canCreate } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [clientId, setClientId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [selected, setSelected] = useState<{ id: string; title: string }[]>([]);
  const [signal, setSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [format, setFormat] = useState<PreviewFormat>("linkedin");
  const [queueingId, setQueueingId] = useState<string | null>(null);
  useEffect(() => { if (!clientId && clients[0]) setClientId(clients[0].id); }, [clients, clientId]);

  const toggle = (id: string, title: string) =>
    setSelected((s) => (s.some((x) => x.id === id) ? s.filter((x) => x.id !== id) : [...s, { id, title }]));
  const onBusy = useCallback((b: boolean) => setBusy(b), []);
  const onResult = useCallback((image: string, prompt: string) => {
    const v = { id: crypto.randomUUID(), image, prompt };
    setVariations((xs) => [v, ...xs].slice(0, 4));
    setActiveId(v.id);
  }, []);
  const changeFormat = (f: PreviewFormat) => {
    setFormat(f);
    setSettings((s) => ({ ...s, platform: f === "linkedin" ? "linkedin" : "instagram", contentType: f === "story" ? "story" : f === "reel" ? "reel" : "image" }));
  };
  const context = buildPromptContext(settings, selected.map((s) => s.title));
  const client = clients.find((c) => c.id === clientId);
  const active = variations.find((v) => v.id === activeId) ?? null;

  const queue = async (v: Variation) => {
    if (!user || !clientId) return;
    setQueueingId(v.id);
    try {
      const blob = await (await fetch(v.image)).blob();
      const path = `${user.id}/generated/${crypto.randomUUID()}.png`;
      const { error: up } = await supabase.storage.from("source-assets").upload(path, blob, { contentType: "image/png" });
      if (up) throw up;
      await supabase.from("source_assets").insert({
        title: `AI image — ${v.prompt.slice(0, 60)}`, description: `AI-generated in Media Studio. Prompt: ${v.prompt}`,
        asset_type: "image", file_path: path, client_id: clientId, created_by: user.id, permission_state: "generation_allowed",
      });
      const m = FORMAT_MAP[format];
      const { error } = await supabase.from("post_cards").insert({
        ...m, client_id: clientId, created_by: user.id, draft_copy: caption.trim() || v.prompt,
        media_urls: [path], apply_ai_disclosure: true,
      } as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["post-cards"] });
      qc.invalidateQueries({ queryKey: ["source-assets"] });
      toast.success("Added to the queue as a Draft");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add to queue"); }
    finally { setQueueingId(null); }
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <PageHeader title="Motive Media Studio" description="Generate on-brand images and video, or connect your own AI tools.">
        <Select value={clientId ?? ""} onValueChange={(v) => { setClientId(v); setSelected([]); setVariations([]); setActiveId(null); }}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Choose client" /></SelectTrigger>
          <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>
      <Tabs defaultValue={params.get("tab") ?? "create"}>
        <TabsList><TabsTrigger value="create">Create media</TabsTrigger><TabsTrigger value="providers">AI providers</TabsTrigger></TabsList>
        <TabsContent value="create" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_310px] items-start">
            <StudioSourceAssets selected={selected.map((s) => s.id)} onToggle={toggle} canCreate={canCreate} />
            <div className="space-y-4 min-w-0">
              <StudioPreviewCanvas image={active?.image ?? null} clientName={client?.name ?? "Your brand"} caption={caption} onCaption={setCaption} format={format} onFormat={changeFormat} />
              <Card className="min-w-0"><CardContent className="pt-6">
                <MediaStudio key={clientId ?? ""} clientId={clientId} canCreate={canCreate} platform={settings.platform}
                  promptContext={context} generateSignal={signal} onBusyChange={onBusy} onResult={onResult} />
              </CardContent></Card>
            </div>
            <div className="lg:col-span-2 xl:col-span-1">
              <StudioControls clientId={clientId} value={settings} onChange={setSettings} busy={busy} disabled={!canCreate}
                onGenerate={() => setSignal((n) => n + 1)} />
            </div>
          </div>
          <StudioVariationsDeck items={variations} activeId={activeId} onSelect={setActiveId} onQueue={queue} queueingId={queueingId} canCreate={canCreate} />
          <StudioInsightsBar settings={settings} assetCount={selected.length} variationCount={variations.length} hasCaption={!!caption.trim()} />
        </TabsContent>
        <TabsContent value="providers" className="mt-4"><AiProvidersPanel context="studio" /></TabsContent>
      </Tabs>
    </div>
  );
}
