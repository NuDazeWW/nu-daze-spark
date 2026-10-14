import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useClients } from "@/hooks/useClients";
import { useWorkspace } from "@/hooks/useWorkspace";
import { MediaStudio } from "@/components/media/MediaStudio";
import { StudioSourceAssets } from "@/components/media/StudioSourceAssets";
import { StudioControls, DEFAULT_SETTINGS, buildPromptContext, type StudioSettings } from "@/components/media/StudioControls";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { AiProvidersPanel } from "@/components/media/AiProvidersPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MediaStudioPage() {
  const { clients } = useClients();
  const { canCreate } = useWorkspace();
  const [params] = useSearchParams();
  const [clientId, setClientId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [selected, setSelected] = useState<{ id: string; title: string }[]>([]);
  const [signal, setSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!clientId && clients[0]) setClientId(clients[0].id); }, [clients, clientId]);
  const toggle = (id: string, title: string) =>
    setSelected((s) => (s.some((x) => x.id === id) ? s.filter((x) => x.id !== id) : [...s, { id, title }]));
  const onBusy = useCallback((b: boolean) => setBusy(b), []);
  const context = buildPromptContext(settings, selected.map((s) => s.title));

  return (
    <div className="space-y-6 max-w-[1600px]">
      <PageHeader title="Motive Media Studio" description="Generate on-brand images and video, or connect your own AI tools.">
        <Select value={clientId ?? ""} onValueChange={(v) => { setClientId(v); setSelected([]); }}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Choose client" /></SelectTrigger>
          <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>
      <Tabs defaultValue={params.get("tab") ?? "create"}>
        <TabsList><TabsTrigger value="create">Create media</TabsTrigger><TabsTrigger value="providers">AI providers</TabsTrigger></TabsList>
        <TabsContent value="create" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_310px] items-start">
            <StudioSourceAssets selected={selected.map((s) => s.id)} onToggle={toggle} canCreate={canCreate} />
            <Card className="min-w-0"><CardContent className="pt-6">
              <MediaStudio key={clientId ?? ""} clientId={clientId} canCreate={canCreate} platform={settings.platform}
                promptContext={context} generateSignal={signal} onBusyChange={onBusy} />
            </CardContent></Card>
            <div className="lg:col-span-2 xl:col-span-1">
              <StudioControls clientId={clientId} value={settings} onChange={setSettings} busy={busy} disabled={!canCreate}
                onGenerate={() => setSignal((n) => n + 1)} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="providers" className="mt-4"><AiProvidersPanel context="studio" /></TabsContent>
      </Tabs>
    </div>
  );
}
