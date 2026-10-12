import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminOnly } from "@/components/settings/AdminOnly";
import { useWorkspace, updateWorkspaceSettings } from "@/hooks/useWorkspace";
import { useActiveClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Download, Loader2, Lock } from "lucide-react";
import socialMotiveLogo from "@/assets/socialmotive-logo.jpg";

const EXPORT_TABLES = ["campaign_briefs", "master_content_objects", "post_cards", "comments", "external_posts", "source_assets", "brand_voice_rules", "cadence_targets", "social_accounts"] as const;

function WorkspaceSettingsInner() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const { clients } = useActiveClient();
  const s = ws.settings;
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [orgType, setOrgType] = useState("agency");
  const [singular, setSingular] = useState("Client");
  const [plural, setPlural] = useState("Clients");
  const [planName, setPlanName] = useState("Unlimited");
  const [seatLimit, setSeatLimit] = useState("");
  const [clientLimit, setClientLimit] = useState("");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!s) return;
    setCompanyName(s.company_name); setLogoUrl(s.company_logo_url ?? "");
    setOrgType(s.org_type); setSingular(s.entity_label_singular); setPlural(s.entity_label_plural);
    setPlanName(s.plan_name); setSeatLimit(s.seat_limit?.toString() ?? ""); setClientLimit(s.client_limit?.toString() ?? "");
    setDomain(s.auto_admin_domain ?? "");
  }, [s]);

  function chooseOrg(v: string) {
    setOrgType(v);
    if (v === "brand") { setSingular("Department"); setPlural("Departments"); }
    else { setSingular("Client"); setPlural("Clients"); }
  }

  async function save() {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        company_name: companyName.trim() || "My Company",
        company_logo_url: logoUrl.trim() || null,
        org_type: orgType,
        entity_label_singular: singular.trim() || "Client",
        entity_label_plural: plural.trim() || "Clients",
        auto_admin_domain: domain.trim().replace(/^@/, "") || null,
      };
      if (ws.isOwner) {
        patch.plan_name = planName.trim() || "Unlimited";
        patch.seat_limit = seatLimit ? Number(seatLimit) : null;
        patch.client_limit = clientLimit ? Number(clientLimit) : null;
      }
      await updateWorkspaceSettings(patch as never);
      ws.refresh();
      toast.success("Workspace settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }

  async function exportData(clientId?: string) {
    setExporting(true);
    try {
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), company: s?.company_name };
      for (const t of EXPORT_TABLES) {
        let q = supabase.from(t).select("*");
        if (clientId) q = q.eq("client_id", clientId);
        const { data, error } = await q;
        if (error) throw error;
        out[t] = data;
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `socialmotive-export-${clientId ? clients.find((c) => c.id === clientId)?.slug : "all"}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setExporting(false); }
  }

  async function runDanger(rpc: "reset_workspace_content" | "prepare_blank_copy") {
    const { error } = await supabase.rpc(rpc, { _confirm: confirmText });
    if (error) { toast.error(error.message); return; }
    toast.success(rpc === "prepare_blank_copy" ? "Blank copy prepared" : "Workspace content cleared");
    ws.refresh();
    setConfirmText("");
    qc.invalidateQueries();
  }

  const locked = Boolean(s?.is_demo_master);
  if (!s) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <PageHeader title="Workspace" description="Your company profile, organization type and plan limits. SocialMotive branding stays the same in every workspace.">
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle className="text-base">Company profile</CardTitle><CardDescription>Shown as "SocialMotive for {companyName || "your company"}".</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-md border border-border p-3">
            <img src={socialMotiveLogo} alt="SocialMotive" className="h-10 rounded object-contain" />
            <span className="text-sm text-muted-foreground">for</span>
            {logoUrl ? <img src={logoUrl} alt={companyName} className="h-10 max-w-[140px] object-contain" /> : null}
            <span className="font-semibold">{companyName}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="cn">Company name</Label><Input id="cn" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="logo">Company logo link (optional)</Label><Input id="logo" placeholder="https://…" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Organization type</CardTitle><CardDescription>Controls how workspaces are named across the app.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={orgType} onValueChange={chooseOrg} className="grid gap-3 sm:grid-cols-2">
            {[{ v: "agency", t: "Agency", d: "You run social content for many clients." }, { v: "brand", t: "Brand", d: "One company with departments that each have their own social accounts." }].map((o) => (
              <Label key={o.v} htmlFor={`org-${o.v}`} className="flex cursor-pointer gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary">
                <RadioGroupItem id={`org-${o.v}`} value={o.v} className="mt-0.5" />
                <span><span className="block font-semibold">{o.t}</span><span className="text-xs text-muted-foreground font-normal">{o.d}</span></span>
              </Label>
            ))}
          </RadioGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Label (one)</Label><Input value={singular} onChange={(e) => setSingular(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Label (many)</Label><Input value={plural} onChange={(e) => setPlural(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Plan and limits {!ws.isOwner && <Badge variant="outline" className="ml-2">Owner only</Badge>}</CardTitle><CardDescription>Leave a limit blank for unlimited.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>Plan name</Label><Input disabled={!ws.isOwner} value={planName} onChange={(e) => setPlanName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Seat limit</Label><Input disabled={!ws.isOwner} type="number" min={1} placeholder="Unlimited" value={seatLimit} onChange={(e) => setSeatLimit(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{plural} limit</Label><Input disabled={!ws.isOwner} type="number" min={1} placeholder="Unlimited" value={clientLimit} onChange={(e) => setClientLimit(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sign-in</CardTitle><CardDescription>Anyone who signs in with a verified email at this domain becomes an Admin automatically. Leave blank to turn off.</CardDescription></CardHeader>
        <CardContent><div className="space-y-1.5 max-w-sm"><Label>Company email domain</Label><Input placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} /></div></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Data export</CardTitle><CardDescription>Download briefs, posts, comments, assets and strategy as a file.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={exporting} onClick={() => exportData()}><Download className="mr-2 h-4 w-4" />Everything</Button>
          {clients.map((c) => (
            <Button key={c.id} variant="outline" disabled={exporting} onClick={() => exportData(c.id)}><Download className="mr-2 h-4 w-4" />{c.name}</Button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">Danger zone {locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Locked demo workspace</Badge>}</CardTitle>
          <CardDescription>
            {locked
              ? "These tools are permanently disabled in this NuDaze demo workspace to prevent mistakes. They work only in sold copies, for the Owner."
              : "Owner-only tools for a new copy. Both permanently delete data and can't be undone."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "reset", title: "Reset to clean workspace", desc: `Deletes all briefs, posts, comments, reviews and assets. Settings, strategy, ${plural.toLowerCase()} and team stay.`, rpc: "reset_workspace_content" as const, cta: "Reset workspace content…" },
            { key: "blank", title: "Prepare blank copy for a new buyer", desc: `One step: deletes all content, strategy, ${plural.toLowerCase()}, social accounts, invites, activity and every team member except you, and resets the company profile and setup checklist so the buyer starts fresh.`, rpc: "prepare_blank_copy" as const, cta: "Prepare blank copy…" },
          ].map((tool) => (
            <div key={tool.key} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{tool.title}</p>
                <p className="text-xs text-muted-foreground">{tool.desc}</p>
              </div>
              {locked || !ws.isOwner ? (
                <Button variant="destructive" disabled title={locked ? "Disabled in the demo workspace" : "Owner only"}><Lock className="mr-2 h-4 w-4" />{tool.cta.replace("…", "")}</Button>
              ) : (
                <AlertDialog onOpenChange={() => setConfirmText("")}>
                  <AlertDialogTrigger asChild><Button variant="destructive">{tool.cta}</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{tool.title}?</AlertDialogTitle>
                      <AlertDialogDescription>This can't be undone. Type <strong>{s.company_name}</strong> to confirm.</AlertDialogDescription></AlertDialogHeader>
                    <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction disabled={confirmText !== s.company_name} onClick={() => runDanger(tool.rpc)} className="bg-destructive">Delete permanently</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  return <AdminOnly><WorkspaceSettingsInner /></AdminOnly>;
}
