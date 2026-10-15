import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { useWorkspace, SETUP_STEPS, markSetupStep, updateWorkspaceSettings, type SetupStepKey, ROLE_META, type WorkspaceRole } from "@/hooks/useWorkspace";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminOnly } from "@/components/settings/AdminOnly";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { CheckCircle2, Circle, Eye, Building2, Users, Link2, Mail, Briefcase, AtSign, Bell, Send, ExternalLink, ArrowRight, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { useClientSocialAccounts, PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { openInNewTab } from "@/lib/openInNewTab";

const PLATFORMS = ["linkedin", "instagram", "facebook"] as const;
const PL: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" };

function SetupInner() {
  const [params, setParams] = useSearchParams();
  const preview = params.get("preview") === "1";
  const ws = useWorkspace();
  const { user } = useAuth();
  const { clients, activeClient } = useActiveClient();
  const [step, setStep] = useState<SetupStepKey>(() => (params.get("step") as SetupStepKey) || "company");
  const [busy, setBusy] = useState(false);

  // form state
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [orgType, setOrgType] = useState("agency");
  const [entityName, setEntityName] = useState("");
  const [accounts, setAccounts] = useState<Record<string, string>>({ linkedin: "", instagram: "", facebook: "" });
  const [voiceName, setVoiceName] = useState("Core tone");
  const [voiceRule, setVoiceRule] = useState("");
  const [weekly, setWeekly] = useState<Record<string, string>>({ linkedin: "5", instagram: "5", facebook: "3" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("editor");

  useEffect(() => {
    if (!ws.settings || preview) return;
    setCompanyName(ws.settings.company_name);
    setLogoUrl(ws.settings.company_logo_url ?? "");
    setOrgType(ws.settings.org_type);
  }, [ws.settings, preview]);

  const idx = SETUP_STEPS.findIndex((s) => s.key === step);
  const progress = preview ? {} : ws.progress;
  const singular = orgType === "brand" ? "Department" : "Client";

  function next() {
    const n = SETUP_STEPS[idx + 1];
    if (n) setStep(n.key);
  }

  async function complete(fn: () => Promise<void>) {
    if (preview) { toast.info("Preview mode — nothing was saved"); next(); return; }
    setBusy(true);
    try {
      await fn();
      await markSetupStep(ws.progress, step);
      ws.refresh();
      toast.success("Step saved");
      next();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  const actions: Record<SetupStepKey, () => Promise<void>> = {
    company: () => updateWorkspaceSettings({ company_name: companyName.trim() || "My Company", company_logo_url: logoUrl.trim() || null }),
    org_type: () => updateWorkspaceSettings({ org_type: orgType, entity_label_singular: singular, entity_label_plural: `${singular}s` }),
    first_entity: async () => {
      if (!entityName.trim()) { if (clients.length) return; throw new Error(`Enter a ${singular.toLowerCase()} name`); }
      const chosen = PLATFORMS.filter((p) => accounts[p].trim());
      const slug = entityName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data, error } = await supabase.from("clients").insert({ name: entityName.trim(), slug, platforms: chosen.length ? chosen : ["linkedin"] } as never).select("id").single();
      if (error) throw error;
      if (chosen.length) {
        const { error: e2 } = await supabase.from("social_accounts").insert(chosen.map((p) => ({ client_id: data.id, platform: p, account_name: entityName.trim(), handle: accounts[p].trim() })) as never);
        if (e2) throw e2;
      }
    },
    brand_voice: async () => {
      if (!voiceRule.trim()) throw new Error("Describe your brand voice");
      const { error } = await supabase.from("brand_voice_rules").insert({ rule_name: voiceName.trim() || "Core tone", rule_content: voiceRule.trim(), category: "tone", client_id: activeClient?.id ?? null, created_by: user!.id } as never);
      if (error) throw error;
    },
    cadence: async () => {
      const rows = PLATFORMS.filter((p) => Number(weekly[p]) > 0).map((p) => ({ platform: p, content_type: "post", weekly_target: Number(weekly[p]), daily_target: Math.ceil(Number(weekly[p]) / 5), client_id: activeClient?.id ?? null, created_by: user!.id }));
      if (rows.length) { const { error } = await supabase.from("cadence_targets").insert(rows as never); if (error) throw error; }
    },
    team: async () => {
      if (!inviteEmail.trim()) return;
      const { error } = await supabase.from("workspace_invites").insert({ email: inviteEmail.trim().toLowerCase(), role: inviteRole, client_ids: activeClient ? [activeClient.id] : [], invited_by: user!.id } as never);
      if (error) throw error;
    },
    ai_tools: async () => {},
    email: async () => {
      const { data } = await supabase.from("email_provider_settings").select("provider").maybeSingle();
      if (!data || data.provider === "none") throw new Error("Connect an email provider first, or choose Skip for now.");
    },
  };

  const current = SETUP_STEPS[idx];

  return (
    <div className="sm-reference sm-setup animate-fade-in space-y-6">
      <PageHeader title="Workspace setup" description={preview ? "Previewing the setup a new organization sees. Nothing you enter is saved." : `${ws.setupCompleted} of ${ws.setupTotal} steps complete. Reopen any step to change it.`}>
        <Button variant="outline" onClick={() => setParams(preview ? {} : { preview: "1" })}><Eye className="mr-2 h-4 w-4" />{preview ? "Exit preview" : "Preview as new organization"}</Button>
      </PageHeader>
      {preview && <Alert><AlertDescription>Preview mode: this is what a brand-new workspace looks like. Changes are not saved.</AlertDescription></Alert>}

      <div className="sm-setup-layout grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <ol className="sm-setup-steps space-y-2">
          {SETUP_STEPS.map((s, i) => (
            <li key={s.key}>
              <Button variant="ghost" onClick={() => setStep(s.key)} className={cn("sm-setup-step flex h-auto min-h-14 w-full items-start justify-start gap-3 rounded-xl px-4 py-3 text-left text-sm whitespace-normal", s.key === step ? "sm-setup-step-active bg-muted font-semibold" : "hover:bg-muted/60")}>
                {progress[s.key] ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand-success shrink-0" /> : <Circle className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />}
                <span><span className="font-mono text-xs text-muted-foreground mr-1">{i + 1}.</span>{s.title}</span>
              </Button>
            </li>
          ))}
        </ol>

        <Card className="sm-setup-focus">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0"><Building2 className="h-16 w-16 shrink-0 rounded-2xl p-4 border border-primary/25 bg-primary/10 text-primary" /><div><CardTitle className="text-2xl">{current.title}</CardTitle><CardDescription className="mt-2">{current.description}</CardDescription></div></CardHeader>
          <CardContent className="space-y-6">
            {step === "company" && (<>
              <div className="space-y-1.5"><Label>Company name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." /></div>
              <div className="space-y-1.5"><Label>Company logo link (optional)</Label><Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" /></div>
              <p className="text-xs text-muted-foreground">The app stays branded SocialMotive; your company appears alongside it.</p>
            </>)}
            {step === "org_type" && (
              <RadioGroup value={orgType} onValueChange={setOrgType} className="grid gap-3 sm:grid-cols-2">
                {[{ v: "agency", t: "Agency", d: "Manage social for many clients." }, { v: "brand", t: "Brand", d: "One company; departments with their own social accounts." }].map((o) => (
                  <Label key={o.v} htmlFor={`s-${o.v}`} className="flex cursor-pointer gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary">
                    <RadioGroupItem id={`s-${o.v}`} value={o.v} className="mt-0.5" /><span><span className="block font-semibold">{o.t}</span><span className="text-xs font-normal text-muted-foreground">{o.d}</span></span>
                  </Label>
                ))}
              </RadioGroup>
            )}
            {step === "first_entity" && (<>
              {!preview && clients.length > 0 && <p className="text-sm text-muted-foreground">Already set up: {clients.map((c) => c.name).join(", ")}. Add another below, or continue.</p>}
              <div className="space-y-1.5"><Label>{singular} name</Label><Input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder={orgType === "brand" ? "e.g. Marketing" : "e.g. Acme Co."} /></div>
              <div className="grid gap-3 sm:grid-cols-3">
                {PLATFORMS.map((p) => (
                  <div key={p} className="space-y-1.5"><Label>{PL[p]} account</Label><Input value={accounts[p]} onChange={(e) => setAccounts({ ...accounts, [p]: e.target.value })} placeholder="@handle or page name" /></div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Leave a platform blank if this {singular.toLowerCase()} doesn't use it. You can add more accounts later.</p>
            </>)}
            {step === "brand_voice" && (<>
              <div className="space-y-1.5"><Label>Rule name</Label><Input value={voiceName} onChange={(e) => setVoiceName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>How should content sound?</Label><Textarea rows={4} value={voiceRule} onChange={(e) => setVoiceRule(e.target.value)} placeholder="Confident and specific. Plain language, no hype. Lead with a concrete insight." /></div>
              <p className="text-xs text-muted-foreground">Faster: <Link className="underline" to="/strategy?builder=preset">pick an industry starter kit</Link>, <Link className="underline" to="/strategy?builder=website">generate a voice from your website</Link>, or <Link className="underline" to="/strategy?builder=document">import a brand guide</Link>.</p>
              <p className="text-xs text-muted-foreground">Saved to {activeClient?.name ?? "the workspace"}. Add banned phrases, hashtags and more in <Link className="underline" to="/strategy">Strategy & Rules</Link>.</p>
            </>)}
            {step === "cadence" && (
              <div className="grid gap-3 sm:grid-cols-3">
                {PLATFORMS.map((p) => (
                  <div key={p} className="space-y-1.5"><Label>{PL[p]} posts / week</Label><Input type="number" min={0} value={weekly[p]} onChange={(e) => setWeekly({ ...weekly, [p]: e.target.value })} /></div>
                ))}
              </div>
            )}
            {step === "team" && (<>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1.5"><Label>Teammate email (optional)</Label><Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" /></div>
                <div className="space-y-1.5"><Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(["admin", "editor", "reviewer", "viewer"] as WorkspaceRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Manage everyone later on the <Link className="underline" to="/settings/team">Team</Link> page.</p>
            </>)}

            {step === "ai_tools" && (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>SocialMotive includes built-in AI for images and short videos — no setup needed. If your team already pays for tools like OpenAI, Runway or Luma, connect them so Motive Media Studio can use them.</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild><Link to="/settings/connections?tab=ai">Connect AI tools</Link></Button>
                  <Button size="sm" variant="outline" asChild><Link to="/media-studio">Try Motive Media Studio</Link></Button>
                </div>
              </div>
            )}

            {step === "email" && (
              <p className="text-sm text-muted-foreground">Connect the email account (SendGrid, Gmail, Outlook, Yahoo or your own mail server) used for team notifications on the <Link className="underline" to="/settings/email-provider">Email Provider</Link> page, then choose who gets notified on <Link className="underline" to="/settings/notifications">Notifications</Link>.</p>
            )}

            <div className="sm-setup-footer flex flex-wrap gap-3 justify-between pt-6">
              <Button variant="ghost" disabled={idx === 0} onClick={() => setStep(SETUP_STEPS[idx - 1].key)}>Back</Button>
              <div className="flex gap-2">
                {idx < SETUP_STEPS.length - 1 && <Button variant="outline" onClick={next}>Skip for now</Button>}
                <Button disabled={busy} onClick={() => complete(actions[step])}>{idx === SETUP_STEPS.length - 1 ? "Finish" : "Save & continue"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const HUB: { title: string; desc: string; href: string; icon: typeof Users; admin?: boolean }[] = [
  { title: "Team", desc: "Invite people and choose Admin, Editor, Approver or Viewer.", href: "/settings/team", icon: Users, admin: true },
  { title: "Social Connections", desc: "Connect posting accounts and AI tools.", href: "/settings/connections", icon: Link2, admin: true },
  { title: "Email Provider", desc: "The email account used to send team alerts.", href: "/settings/email-provider", icon: Mail, admin: true },
  { title: "Workspace", desc: "Company name, logo and your web address.", href: "/settings/workspace", icon: Briefcase, admin: true },
  { title: "Your Brand Profiles", desc: "Brands, their social accounts and profile links.", href: "/settings/clients", icon: Building2 },
  { title: "Account Tags", desc: "People and organizations you tag in posts.", href: "/settings/tags", icon: AtSign },
  { title: "Notifications", desc: "Which emails you get, and when.", href: "/settings/notifications", icon: Bell },
];

function PostToCard() {
  const { activeClientId, activeClient } = useActiveClient();
  const { data: accounts = [] } = useClientSocialAccounts(activeClientId);
  return (
    <Card className="sm-setup-hub-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Send className="h-4 w-4 text-primary" />Post to</CardTitle>
        <CardDescription>Quick links to post for {activeClient?.name ?? "the selected brand"}.</CardDescription></CardHeader>
      <CardContent className="space-y-2">
        {accounts.length === 0 && <p className="text-sm text-muted-foreground">No social accounts saved yet.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-sm">
            <PlatformIcon platform={a.platform} className="h-4 w-4" />
            <span className="flex-1 truncate">{PLATFORM_LABEL[a.platform] ?? a.platform}{a.handle ? ` · ${a.handle}` : ""}</span>
            {a.profile_url
              ? <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => openInNewTab(a.profile_url!)}>Open<ExternalLink className="ml-1 h-3 w-3" /></Button>
              : <Button size="sm" variant="ghost" className="whitespace-nowrap" asChild><Link to={`/settings/clients?accounts=${activeClientId}`}>Add link</Link></Button>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GovernanceCard() {
  const ws = useWorkspace();
  const save = async (patch: Record<string, unknown>) => {
    try { await updateWorkspaceSettings(patch as never); ws.refresh(); toast.success("Governance updated"); }
    catch (e) { toast.error("Couldn't save", { description: (e as Error).message }); }
  };
  return (
    <Card className="sm-setup-hub-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Governance</CardTitle>
        <CardDescription>Optional guardrails. Turn on only what your team needs.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div><Label className="text-sm">Require approval to publish</Label>
            <p className="text-xs text-muted-foreground">{ws.approvalRequired ? "Posts need sign-off first." : "Publish, schedule or export straight from draft."}</p></div>
          <Switch checked={ws.approvalRequired} onCheckedChange={(v) => save({ post_approval_required: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Preflight checks</Label>
          <Select value={ws.preflightMode} onValueChange={(v) => save({ preflight_mode: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="advisory">Advisory — show issues, never block</SelectItem>
              <SelectItem value="strict">Strict — block until cleared</SelectItem>
              <SelectItem value="off">Off</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function SetupHub() {
  const ws = useWorkspace();
  const items = HUB.filter((h) => !h.admin || ws.canManage);
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold">Workspace settings</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PostToCard />
        {ws.canManage && <GovernanceCard />}
        {items.map((h) => (
          <Link key={h.href} to={h.href} className="group">
            <Card className="sm-setup-hub-card h-full transition-colors group-hover:border-primary/50">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><h.icon className="h-4 w-4 text-primary" />{h.title}<ArrowRight className="ml-auto h-4 w-4 opacity-50 group-hover:opacity-100" /></CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{h.desc}</p></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Setup() {
  const ws = useWorkspace();
  if (ws.loading) return null;
  if (!ws.canManage) return <div className="sm-reference sm-setup animate-fade-in space-y-6"><PageHeader title="Setup" description="Your settings in one place." /><SetupHub /></div>;
  return <div className="space-y-8"><SetupInner /><SetupHub /></div>;
}
