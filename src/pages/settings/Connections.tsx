import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminOnly } from "@/components/settings/AdminOnly";
import { useClients } from "@/hooks/useClients";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { AiProvidersPanel } from "@/components/media/AiProvidersPanel";
import { CheckCircle2, Copy, ExternalLink, KeyRound, Link2, Loader2, PlugZap, RefreshCw, ShieldCheck, Unplug } from "lucide-react";

type ProviderKey = "linkedin" | "meta" | "x" | "google";
const PROVIDERS: { key: ProviderKey; label: string; covers: string; portal: string; steps: string[] }[] = [
  { key: "linkedin", label: "LinkedIn", covers: "LinkedIn profiles & company pages", portal: "https://www.linkedin.com/developers/apps", steps: ["Create an app and link your company page.", "Request Share on LinkedIn and Community Management API products.", "Paste the redirect URL under Auth › Authorized redirect URLs."] },
  { key: "meta", label: "Meta", covers: "Instagram & Facebook", portal: "https://developers.facebook.com/apps", steps: ["Create a Business app and add Facebook Login for Business.", "Add Instagram Graph API; request content publishing permissions.", "Paste the redirect URL into Valid OAuth Redirect URIs."] },
  { key: "x", label: "X", covers: "X (Twitter) accounts", portal: "https://developer.x.com/en/portal/dashboard", steps: ["Create a project & app with OAuth 2.0 enabled (read and write).", "Set type to Web App and paste the redirect URL as the callback."] },
  { key: "google", label: "Google", covers: "YouTube channels", portal: "https://console.cloud.google.com/apis/credentials", steps: ["Enable YouTube Data API v3.", "Create an OAuth client (Web application) and add the redirect URL."] },
];

const PLATFORMS: { key: string; label: string; provider: ProviderKey; scopes: string[] }[] = [
  { key: "linkedin", label: "LinkedIn", provider: "linkedin", scopes: ["w_member_social", "w_organization_social", "r_organization_admin"] },
  { key: "instagram", label: "Instagram", provider: "meta", scopes: ["instagram_basic", "instagram_content_publish"] },
  { key: "facebook", label: "Facebook", provider: "meta", scopes: ["pages_manage_posts", "pages_read_engagement"] },
  { key: "x", label: "X", provider: "x", scopes: ["tweet.write", "users.read", "offline.access"] },
  { key: "youtube", label: "YouTube", provider: "google", scopes: ["youtube.upload", "youtube.readonly"] },
];

const redirectUrl = (p: ProviderKey) => `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/oauth-callback?provider=${p}`;

async function invokeCreds(body: Record<string, unknown>) {
  const { error } = await supabase.functions.invoke("publishing-credentials", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ } }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
}

type Account = {
  id: string; platform: string; account_name: string; handle: string | null; connection_status: string;
  connected_at: string | null; token_expires_at: string | null; scopes: string[];
  connection_metadata: Record<string, unknown>;
};

function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86400000));
}

function DeveloperApps() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["publishing_credentials_status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("publishing_credentials_status");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<ProviderKey | null>(null);
  const [cid, setCid] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await invokeCreds({ action: "save", provider: editing, client_id: cid, client_secret: secret });
      toast.success("Developer app saved securely");
      setEditing(null); setCid(""); setSecret("");
      qc.invalidateQueries({ queryKey: ["publishing_credentials_status"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async (p: ProviderKey) => {
    try { await invokeCreds({ action: "delete", provider: p }); toast.success("Developer app removed"); qc.invalidateQueries({ queryKey: ["publishing_credentials_status"] }); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PROVIDERS.map((p) => {
        const s = status.data?.find((r) => r.provider === p.key);
        return (
          <Card key={p.key}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{p.label}</CardTitle>
                  <CardDescription>{p.covers}</CardDescription>
                </div>
                {s?.configured
                  ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Configured</Badge>
                  : <Badge variant="outline">Not set up</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {s?.configured && <p className="font-mono text-xs text-muted-foreground">Client ID {s.client_id_hint}</p>}
              <div>
                <Label className="text-xs text-muted-foreground">Redirect URL</Label>
                <div className="mt-1 flex gap-2">
                  <Input readOnly value={redirectUrl(p.key)} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" aria-label="Copy redirect URL" onClick={() => { navigator.clipboard.writeText(redirectUrl(p.key)); toast.success("Redirect URL copied"); }}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">{p.steps.map((x) => <li key={x}>{x}</li>)}</ol>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => { setEditing(p.key); setCid(""); setSecret(""); }}><KeyRound className="mr-1 h-4 w-4" />{s?.configured ? "Replace keys" : "Add keys"}</Button>
                <Button size="sm" variant="outline" asChild><a href={p.portal} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Developer portal</a></Button>
                {s?.configured && <Button size="sm" variant="ghost" onClick={() => remove(p.key)}>Remove</Button>}
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PROVIDERS.find((p) => p.key === editing)?.label} developer app</DialogTitle>
            <DialogDescription>Keys are stored server-side and never shown in the browser again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Client ID / App ID</Label><Input value={cid} onChange={(e) => setCid(e.target.value)} /></div>
            <div><Label>Client secret</Label><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy || cid.length < 3 || secret.length < 3}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save securely</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientChannels() {
  const { clients } = useClients();
  const qc = useQueryClient();
  const [clientId, setClientId] = useState<string>("");
  useEffect(() => { if (!clientId && clients[0]) setClientId(clients[0].id); }, [clients, clientId]);
  const client = clients.find((c) => c.id === clientId);
  const accounts = useQuery({
    queryKey: ["social_connections", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("social_accounts")
        .select("id,platform,account_name,handle,connection_status,connected_at,token_expires_at,scopes,connection_metadata")
        .eq("client_id", clientId);
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, { ms: number; at: string }>>({});
  const refresh = () => { qc.invalidateQueries({ queryKey: ["social_connections", clientId] }); qc.invalidateQueries({ queryKey: ["social_accounts"] }); };

  const connect = async (pl: (typeof PLATFORMS)[number], existing?: Account) => {
    setBusy(pl.key);
    await new Promise((r) => setTimeout(r, 1400));
    const name = existing?.account_name ?? client?.name ?? "Account";
    const handle = existing?.handle ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const patch = {
      connection_status: "connected", connected_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 60 * 86400000).toISOString(), scopes: pl.scopes,
      external_account_id: `demo_${pl.key}_${handle}`,
      connection_metadata: { mode: "demo", verified: true },
    };
    const res = existing
      ? await supabase.from("social_accounts").update(patch).eq("id", existing.id)
      : await supabase.from("social_accounts").insert({ ...patch, client_id: clientId, platform: pl.key as never, account_name: name, handle, is_active: true });
    setBusy(null);
    if (res.error) return toast.error(res.error.message);
    toast.success(`${pl.label} connected`);
    refresh();
  };
  const disconnect = async (a: Account) => {
    const { error } = await supabase.from("social_accounts").update({ connection_status: "disconnected", token_expires_at: null, scopes: [], connected_at: null }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Disconnected"); refresh();
  };
  const test = async (a: Account) => {
    setBusy(a.id);
    const t0 = performance.now();
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 600));
    setTests((s) => ({ ...s, [a.id]: { ms: Math.round(performance.now() - t0), at: new Date().toLocaleTimeString() } }));
    setBusy(null);
    toast.success("Connection healthy");
  };

  const platforms = PLATFORMS.filter((p) => client?.platforms?.includes(p.key as never) || accounts.data?.some((a) => a.platform === p.key && a.connection_status === "connected"));
  const others = PLATFORMS.filter((p) => !platforms.includes(p));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Label>Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Choose client" /></SelectTrigger>
          <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...platforms, ...others].map((pl) => {
          const a = accounts.data?.find((x) => x.platform === pl.key);
          const on = a?.connection_status === "connected";
          const d = daysLeft(a?.token_expires_at ?? null);
          const t = a ? tests[a.id] : undefined;
          return (
            <Card key={pl.key} className={on ? "" : "opacity-95"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{pl.label}</CardTitle>
                    <CardDescription>{a ? `${a.account_name}${a.handle ? ` · @${a.handle.replace(/^@/, "")}` : ""}` : "No account linked"}</CardDescription>
                  </div>
                  {on
                    ? <Badge className="gap-1"><ShieldCheck className="h-3 w-3" />Connected</Badge>
                    : <Badge variant="outline">Not connected</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {on && (
                  <>
                    <p className="text-muted-foreground">Token valid · <span className="font-mono">{d} days</span> remaining</p>
                    <div className="flex flex-wrap gap-1">{a!.scopes.map((s) => <Badge key={s} variant="secondary" className="font-mono text-[10px]">{s}</Badge>)}</div>
                    {t && <p className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3 w-3 text-primary" />Ping {t.ms} ms · checked {t.at}</p>}
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  {on ? (
                    <>
                      <Button size="sm" variant="outline" disabled={busy === a!.id} onClick={() => test(a!)}>{busy === a!.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1 h-4 w-4" />}Test</Button>
                      <Button size="sm" variant="outline" disabled={busy === pl.key} onClick={() => connect(pl, a)}><RefreshCw className="mr-1 h-4 w-4" />Re-authenticate</Button>
                      <Button size="sm" variant="ghost" onClick={() => disconnect(a!)}><Unplug className="mr-1 h-4 w-4" />Disconnect</Button>
                    </>
                  ) : (
                    <Button size="sm" disabled={busy === pl.key || !clientId} onClick={() => connect(pl, a)}>
                      {busy === pl.key ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}
                      {busy === pl.key ? `Authorizing with ${pl.label}…` : `Connect ${pl.label}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Demo instance: connections are simulated so the flow can be shown without platform app approval. Nothing is published.</p>
    </div>
  );
}

export default function Connections() {
  const ws = useWorkspace();
  const [params] = useSearchParams();
  return (
    <div className="space-y-6">
      <PageHeader title="Social Connections" description={`Connect each ${ws.entitySingular.toLowerCase()}'s social accounts manage platform developer apps, and connect your own AI image and video tools.`} />
      <AdminOnly>
        <Tabs defaultValue={params.get("tab") ?? "channels"}>
          <TabsList>
            <TabsTrigger value="channels">Client channels</TabsTrigger>
            <TabsTrigger value="apps">Developer apps & keys</TabsTrigger>
            <TabsTrigger value="ai">AI image & video tools</TabsTrigger>
          </TabsList>
          <TabsContent value="channels" className="mt-4"><ClientChannels /></TabsContent>
          <TabsContent value="apps" className="mt-4"><DeveloperApps /></TabsContent>
          <TabsContent value="ai" className="mt-4"><AiProvidersPanel context="settings" /></TabsContent>
        </Tabs>
      </AdminOnly>
    </div>
  );
}
