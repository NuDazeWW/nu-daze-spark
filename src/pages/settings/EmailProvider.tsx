import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminOnly } from "@/components/settings/AdminOnly";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace, markSetupStep } from "@/hooks/useWorkspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail, Send, XCircle } from "lucide-react";

import emailBackground from "@/assets/email-provider-workspace-background.jpg";

type ProviderKey = "sendgrid" | "gmail" | "outlook" | "yahoo" | "apple" | "smtp";

const PROVIDERS: { key: ProviderKey; label: string; secretLabel: string; steps: string[] }[] = [
  { key: "sendgrid", label: "SendGrid", secretLabel: "SendGrid API key", steps: ["In SendGrid, open Settings › API Keys and create a key with Mail Send permission.", "Verify your from address under Settings › Sender Authentication."] },
  { key: "gmail", label: "Gmail / Google Workspace", secretLabel: "App password", steps: ["Turn on 2-Step Verification for the Google account.", "Go to myaccount.google.com/apppasswords and create an app password.", "Paste the 16-character password here (not your normal password)."] },
  { key: "outlook", label: "Outlook / Microsoft 365", secretLabel: "App password", steps: ["Turn on two-step verification for the Microsoft account.", "Create an app password under Security › Advanced security options.", "Business accounts: your IT admin may need to allow SMTP sending. If it's blocked, use SendGrid or Custom SMTP."] },
  { key: "yahoo", label: "Yahoo Mail", secretLabel: "App password", steps: ["In Yahoo Account Security, turn on 2-step verification.", "Choose Generate app password and paste it here."] },
  { key: "apple", label: "Apple Mail / iCloud", secretLabel: "App-specific password", steps: ["Sign in at account.apple.com and make sure two-factor authentication is on.", "Under Sign-In and Security, choose App-Specific Passwords and create one named SocialMotive.", "Use your @icloud.com, @me.com or @mac.com address as the from address and paste the password here."] },
  { key: "smtp", label: "Custom mail server (SMTP)", secretLabel: "Password", steps: ["Ask your email host for the SMTP server, port and login details."] },
];

export async function invokeNotifications(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("notifications", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json()).error ?? msg; } catch { /* keep message */ }
    }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

function Inner() {
  const { user } = useAuth();
  const ws = useWorkspace();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["email_provider_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_provider_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const s = q.data;
  const connected = s && s.provider !== "none";
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState<ProviderKey>("sendgrid");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("SocialMotive");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (!s) return;
    if (s.provider !== "none") setProvider(s.provider as ProviderKey);
    setFromEmail(s.from_email ?? ""); setFromName(s.from_name ?? "SocialMotive");
    setHost(s.smtp_host ?? ""); setPort(String(s.smtp_port ?? 587)); setSecure(s.smtp_secure); setUsername(s.smtp_username ?? "");
  }, [s]);
  useEffect(() => { if (user?.email && !testTo) setTestTo(user.email); }, [user, testTo]);

  const meta = PROVIDERS.find((p) => p.key === provider) ?? PROVIDERS[0];
  const refresh = () => qc.invalidateQueries({ queryKey: ["email_provider_settings"] });

  async function save() {
    setBusy("save");
    try {
      await invokeNotifications({
        action: "save_provider", provider, from_email: fromEmail.trim(), from_name: fromName.trim() || "SocialMotive",
        smtp_host: provider === "smtp" ? host.trim() : undefined,
        smtp_port: provider === "smtp" ? Number(port) : undefined,
        smtp_secure: provider === "smtp" ? secure : undefined,
        smtp_username: provider === "smtp" ? username.trim() || undefined : undefined,
        secret: secret || undefined,
      });
      setSecret(""); setEditing(false); refresh();
      if (!ws.progress.email) await markSetupStep(ws.progress, "email").then(ws.refresh, () => {});
      toast.success("Email provider saved — send a test to confirm it works");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }

  async function test() {
    setBusy("test");
    try { await invokeNotifications({ action: "test", to: testTo.trim() }); toast.success(`Test email sent to ${testTo}`); }
    catch (e) { toast.error((e as Error).message, { duration: 12000 }); }
    finally { setBusy(null); refresh(); }
  }

  async function disconnect() {
    setBusy("disconnect");
    try { await invokeNotifications({ action: "disconnect" }); refresh(); toast.success("Email provider disconnected"); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }

  if (q.isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const showForm = !connected || editing;

  return (
    <div className="sm-email-provider animate-fade-in space-y-6">
      <img src={emailBackground} width={1536} height={1024} alt="" aria-hidden="true" className="sm-email-background" />
      <PageHeader title="Email Provider" description="The email account SocialMotive uses to send team notifications. Each workspace connects its own." />

      {connected && s && (
        <Card className="sm-email-connected">
          <CardContent className="sm-email-connection-row">
            <span className="sm-email-icon" aria-hidden="true"><Mail /></span>
            <div className="sm-email-account">
              <p className="text-sm font-semibold">Connected as {s.connected_as}</p>
              <p className="text-xs text-muted-foreground">{PROVIDERS.find((p) => p.key === s.provider)?.label} · key or password saved securely and never shown again</p>
              {s.last_test_at && (
                <p className={`sm-email-test-status text-xs mt-1 flex items-center gap-1 ${s.last_test_ok ? "text-brand-success" : "text-destructive"}`}>
                  {s.last_test_ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  Last test {new Date(s.last_test_at).toLocaleString()}: {s.last_test_ok ? "worked" : s.last_test_error}
                </p>
              )}
            </div>
            <label className="sm-email-sending flex items-center gap-2 text-xs">
              <Switch checked={!s.sending_paused} onCheckedChange={async (v) => {
                const { error } = await supabase.from("email_provider_settings").update({ sending_paused: !v }).eq("id", true);
                if (error) toast.error(error.message); else { refresh(); toast.success(v ? "Notification emails resumed" : "All notification emails paused — your connection is kept"); }
              }} />
              {s.sending_paused ? "Sending paused" : "Sending on"}
            </label>
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>{editing ? "Cancel" : "Replace"}</Button>
            <Button className="sm-email-disconnect" variant="outline" size="sm" disabled={busy === "disconnect"} onClick={disconnect}>Disconnect</Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="sm-email-form">
          <CardHeader><CardTitle className="text-base">Choose your provider</CardTitle><CardDescription>Use the account your team already sends email from.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <RadioGroup value={provider} onValueChange={(v) => setProvider(v as ProviderKey)} className="grid gap-2 sm:grid-cols-2">
              {PROVIDERS.map((p) => (
                <Label key={p.key} htmlFor={`prov-${p.key}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary">
                  <RadioGroupItem id={`prov-${p.key}`} value={p.key} />{p.label}
                </Label>
              ))}
            </RadioGroup>
            <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">{meta.steps.map((st) => <li key={st}>{st}</li>)}</ol>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{provider === "sendgrid" ? "From address (verified in SendGrid)" : "Email address"}</Label><Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="notifications@yourcompany.com" /></div>
              <div className="space-y-1.5"><Label>From name</Label><Input value={fromName} onChange={(e) => setFromName(e.target.value)} /></div>
              {provider === "smtp" && (<>
                <div className="space-y-1.5"><Label>Server host</Label><Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" /></div>
                <div className="space-y-1.5"><Label>Port</Label><Input type="number" value={port} onChange={(e) => setPort(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Username (if different from email)</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={secure} onCheckedChange={setSecure} id="sec" /><Label htmlFor="sec">Use SSL/TLS (usually port 465)</Label></div>
              </>)}
              <div className="space-y-1.5 sm:col-span-2"><Label>{meta.secretLabel}</Label><Input type="password" autoComplete="new-password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={connected ? "Leave blank to keep the saved one" : ""} /></div>
            </div>
            <Button onClick={save} disabled={busy === "save" || !fromEmail.trim() || (!secret && !connected)}>{busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save provider</Button>
          </CardContent>
        </Card>
      )}

      <Card className="sm-email-test">
        <span className="sm-email-icon sm-email-send-icon" aria-hidden="true"><Send /></span>
        <CardHeader><CardTitle className="text-base">Test connection {!connected && <Badge variant="outline" className="ml-2">Connect a provider first</Badge>}</CardTitle><CardDescription>Sends a real email. If it fails, the provider's exact message appears here.</CardDescription></CardHeader>
        <CardContent className="sm-email-test-controls flex flex-wrap gap-2">
          <Input className="sm-email-test-address" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <Button className="sm-email-test-button" variant="outline" disabled={!connected || busy === "test"} onClick={test}>{busy === "test" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test email<Send className="ml-2 h-4 w-4" /></Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmailProviderPage() {
  return <AdminOnly><Inner /></AdminOnly>;
}
