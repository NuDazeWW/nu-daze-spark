import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, KeyRound, Sparkles, Wand2 } from "lucide-react";

type Kind = "image" | "video";
export const AI_PROVIDERS: { key: string; label: string; kind: Kind; portal: string; note: string }[] = [
  { key: "openai", label: "OpenAI (DALL·E / GPT Image)", kind: "image", portal: "https://platform.openai.com/api-keys", note: "Create a secret key under API keys." },
  { key: "fal", label: "Fal.ai (Flux, SDXL)", kind: "image", portal: "https://fal.ai/dashboard/keys", note: "Create a key in the Fal dashboard." },
  { key: "stability", label: "Stability AI", kind: "image", portal: "https://platform.stability.ai/account/keys", note: "Copy your API key from Account › API keys." },
  { key: "midjourney", label: "Midjourney (API proxy)", kind: "image", portal: "https://docs.midjourney.com", note: "Use your approved proxy/partner API key." },
  { key: "runway", label: "Runway (Gen-3)", kind: "video", portal: "https://dev.runwayml.com", note: "Create a key in the Runway developer portal." },
  { key: "luma", label: "Luma Dream Machine", kind: "video", portal: "https://lumalabs.ai/dream-machine/api/keys", note: "Generate a key under API keys." },
  { key: "kling", label: "Kling AI", kind: "video", portal: "https://app.klingai.com/global/dev", note: "Create access keys in the developer console." },
  { key: "pika", label: "Pika", kind: "video", portal: "https://pika.art", note: "Use your Pika partner API key." },
];

async function invoke(body: Record<string, unknown>) {
  const { error } = await supabase.functions.invoke("ai-providers", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ } }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
}

export function AiProvidersPanel({ context }: { context: "settings" | "studio" }) {
  const qc = useQueryClient();
  const { canManage: isAdmin } = useWorkspace();
  const status = useQuery({
    queryKey: ["ai_provider_status"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (n: string) => Promise<{ data: { provider: string }[] | null; error: Error | null }>)("ai_provider_status");
      if (error) throw error;
      return data ?? [];
    },
  });
  const active = useQuery({
    queryKey: ["ai_active_providers"],
    queryFn: async () => {
      const { data } = await supabase.from("workspace_settings").select("*").maybeSingle();
      const d = (data ?? {}) as { ai_image_provider?: string; ai_video_provider?: string };
      return { image: d.ai_image_provider ?? "builtin", video: d.ai_video_provider ?? "builtin" };
    },
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = (p: string) => !!status.data?.some((r) => r.provider === p);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["ai_provider_status"] }); qc.invalidateQueries({ queryKey: ["ai_active_providers"] }); };

  const save = async () => {
    if (!editing) return; setBusy(true);
    try { await invoke({ action: "save", provider: editing, api_key: key }); toast.success("Key saved securely"); setEditing(null); setKey(""); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async (p: string) => {
    try { await invoke({ action: "delete", provider: p }); toast.success("Provider removed"); refresh(); } catch (e) { toast.error((e as Error).message); }
  };
  const setActive = async (kind: Kind, value: string) => {
    const col = kind === "image" ? "ai_image_provider" : "ai_video_provider";
    const { error } = await supabase.from("workspace_settings").update({ [col]: value } as never).eq("id", true);
    if (error) return toast.error(error.message);
    toast.success("Default engine updated"); refresh();
  };

  const section = (kind: Kind) => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{kind === "image" ? "Image generation" : "Video generation"}</h3>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Default engine</Label>
          <Select value={active.data?.[kind] ?? "builtin"} onValueChange={(v) => setActive(kind, v)} disabled={!isAdmin}>
            <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="builtin">Built-in SocialMotive AI</SelectItem>
              {AI_PROVIDERS.filter((p) => p.kind === kind && configured(p.key)).map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-primary/40">
          <CardHeader className="pb-2"><div className="flex items-start justify-between gap-2"><CardTitle className="text-sm flex items-center gap-1"><Sparkles className="h-4 w-4" />Built-in SocialMotive AI</CardTitle><Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Ready</Badge></div>
            <CardDescription>Included — no key needed. Uses workspace AI credits.</CardDescription></CardHeader>
        </Card>
        {AI_PROVIDERS.filter((p) => p.kind === kind).map((p) => (
          <Card key={p.key}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{p.label}</CardTitle>
                {configured(p.key) ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Connected</Badge> : <Badge variant="outline">Not connected</Badge>}
              </div>
              <CardDescription>{p.note}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {isAdmin
                ? <Button size="sm" onClick={() => { setEditing(p.key); setKey(""); }}><KeyRound className="mr-1 h-4 w-4" />{configured(p.key) ? "Replace key" : "Connect"}</Button>
                : <Button size="sm" variant="outline" disabled>Admins connect providers</Button>}
              <Button size="sm" variant="outline" asChild><a href={p.portal} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Get a key</a></Button>
              {isAdmin && configured(p.key) && <Button size="sm" variant="ghost" onClick={() => remove(p.key)}>Remove</Button>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
        <p className="text-muted-foreground">Bring your own AI image and video tools. Keys are stored securely on the server and never shown again. The built-in engine stays available as a fallback.</p>
        {context === "settings"
          ? <Button size="sm" variant="outline" asChild><Link to="/media-studio?tab=providers"><Wand2 className="mr-1 h-4 w-4" />Open Motive Media Studio</Link></Button>
          : <Button size="sm" variant="outline" asChild><Link to="/settings/connections?tab=ai">Manage in Workspace Settings</Link></Button>}
      </div>
      {section("image")}
      {section("video")}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {AI_PROVIDERS.find((p) => p.key === editing)?.label}</DialogTitle>
            <DialogDescription>Paste your API key. It's saved server-side and only used when this engine is selected.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5"><Label>API key</Label><Input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={busy || key.trim().length < 8} onClick={save}>Save key</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
