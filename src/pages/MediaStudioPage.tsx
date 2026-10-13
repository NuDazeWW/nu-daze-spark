import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useClients } from "@/hooks/useClients";
import { useWorkspace } from "@/hooks/useWorkspace";
import { MediaStudio } from "@/components/media/MediaStudio";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MediaStudioPage() {
  const { clients } = useClients();
  const { canCreate } = useWorkspace();
  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => { if (!clientId && clients[0]) setClientId(clients[0].id); }, [clients, clientId]);
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="AI Media Studio" description="Generate on-brand images with each client's colors, tone and logo watermark.">
        <Select value={clientId ?? ""} onValueChange={setClientId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Choose client" /></SelectTrigger>
          <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>
      <Card><CardContent className="pt-6"><MediaStudio key={clientId ?? ""} clientId={clientId} canCreate={canCreate} /></CardContent></Card>
    </div>
  );
}
