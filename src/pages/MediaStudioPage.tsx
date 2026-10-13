import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useClients } from "@/hooks/useClients";
import { useWorkspace } from "@/hooks/useWorkspace";
import { MediaStudio } from "@/components/media/MediaStudio";
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
  useEffect(() => { if (!clientId && clients[0]) setClientId(clients[0].id); }, [clients, clientId]);
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Motive Media Studio" description="Generate on-brand images and video, or connect your own AI tools.">
        <Select value={clientId ?? ""} onValueChange={setClientId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Choose client" /></SelectTrigger>
          <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>
      <Tabs defaultValue={params.get("tab") ?? "create"}>
        <TabsList><TabsTrigger value="create">Create media</TabsTrigger><TabsTrigger value="providers">AI providers</TabsTrigger></TabsList>
        <TabsContent value="create" className="mt-4"><Card><CardContent className="pt-6"><MediaStudio key={clientId ?? ""} clientId={clientId} canCreate={canCreate} /></CardContent></Card></TabsContent>
        <TabsContent value="providers" className="mt-4"><AiProvidersPanel context="studio" /></TabsContent>
      </Tabs>
    </div>
  );
}
