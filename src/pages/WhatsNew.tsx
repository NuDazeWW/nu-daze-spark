import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION, RELEASE_NOTES } from "@/lib/appVersion";

export default function WhatsNew() {
  return (
    <div className="animate-fade-in space-y-4 max-w-3xl">
      <PageHeader title="What's new" description={`You're on SocialMotive version ${APP_VERSION}.`} />
      {RELEASE_NOTES.map((r) => (
        <Card key={r.version}>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Badge variant="outline" className="font-mono">v{r.version}</Badge>{r.title}<span className="ml-auto text-xs font-mono text-muted-foreground">{r.date}</span></CardTitle></CardHeader>
          <CardContent><ul className="list-disc pl-5 space-y-1 text-sm">{r.items.map((i) => <li key={i}>{i}</li>)}</ul></CardContent>
        </Card>
      ))}
    </div>
  );
}
