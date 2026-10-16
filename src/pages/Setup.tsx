import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { useWorkspace, SETUP_STEPS, markSetupStep, updateWorkspaceSettings, type SetupStepKey, ROLE_META, type WorkspaceRole } from "@/hooks/useWorkspace";
import { useAccountTags } from "@/hooks/useAccountTags";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Eye, Building2, Users, Link2, Mail, AtSign, Bell, Send, ExternalLink,
  ArrowRight, ArrowLeft, ShieldCheck, Globe, Download, Loader2, Lock, Music2, Youtube, Sparkles, Pin,
  ChevronDown, ChevronUp, ChevronRight,
} from "lucide-react";
import artTeam from "@/assets/setup/art-team.png";
import artEmail from "@/assets/setup/art-email.png";
import artWorkspace from "@/assets/setup/art-workspace.png";
import artBrands from "@/assets/setup/art-brands.png";
import artTags from "@/assets/setup/art-tags.png";
import artSocial from "@/assets/setup/art-social.png";
import headerBirdUrl from "@/assets/brand/socialmotive-header-bird.png";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { useClientSocialAccounts, PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { openInNewTab } from "@/lib/openInNewTab";
import socialMotiveLogo from "@/assets/socialmotive-logo.jpg";

const PLATFORMS = ["linkedin", "instagram", "facebook"] as const;
const PL: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" };
const EXPORT_TABLES = ["campaign_briefs", "master_content_objects", "post_cards", "comments", "external_posts", "source_assets", "brand_voice_rules", "cadence_targets", "social_accounts"] as const;

/* ================= 8-step guided setup ================= */

function SetupInner() {
  const [params, setParams] = useSearchParams();
  const preview = params.get("preview") === "1";
  const ws = useWorkspace();
  const { user } = useAuth();
  const { clients, activeClient } = useActiveClient();
  const [step, setStep] = useState<SetupStepKey>(() => (params.get("step") as SetupStepKey) || "company");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = params.get("step") as SetupStepKey | null;
    if (s && SETUP_STEPS.some((x) => x.key === s)) setStep(s);
  }, [params]);


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
      <nav aria-label="Setup" className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild className="sm-setup-pill"><Link to="/"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Back to workspace</Link></Button>
        <Button variant="outline" size="sm" asChild className="sm-setup-pill"><Link to="/setup">Workspace settings</Link></Button>
        <Button variant="outline" size="sm" asChild className="sm-setup-pill"><Link to="/help">Help</Link></Button>
      </nav>

      <div className="sm-setup-hero">
        <div className="min-w-0">
          <h1>Workspace setup</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {preview
              ? "Previewing the setup a new organization sees. Nothing you enter is saved."
              : `${ws.setupCompleted} of ${ws.setupTotal} steps complete. Reopen any step to change it.`}
          </p>
        </div>
        <div className="sm-setup-hero-side">
          <img src={headerBirdUrl} alt="" aria-hidden className="sm-setup-hero-bird" />
          <p className="sm-dash-tagline text-sm leading-snug">Turn strategy<br />into <em className="sm-dash-em-cyan not-italic font-semibold">social</em> <em className="not-italic font-semibold text-brand-citrine">momentum.</em></p>
          <Button variant="outline" className="sm-setup-pill" onClick={() => setParams(preview ? {} : { preview: "1" })}><Eye className="mr-2 h-4 w-4" />{preview ? "Exit preview" : "Preview as new organization"}</Button>
        </div>
      </div>
      {preview && <Alert><AlertDescription>Preview mode: this is what a brand-new workspace looks like. Changes are not saved.</AlertDescription></Alert>}

      <div className="sm-setup-progress" role="progressbar" aria-valuenow={preview ? 0 : ws.setupCompleted} aria-valuemax={ws.setupTotal} aria-label={`${preview ? 0 : ws.setupCompleted} of ${ws.setupTotal} steps complete`}>
        <i style={{ width: `${((preview ? 0 : ws.setupCompleted) / ws.setupTotal) * 100}%` }} />
      </div>

      <div className="sm-setup-layout grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <ol className="sm-setup-steps space-y-2">
          {SETUP_STEPS.map((s, i) => (
            <li key={s.key}>
              <Button variant="ghost" onClick={() => setStep(s.key)} className={cn("sm-setup-step flex h-auto min-h-14 w-full items-start justify-start gap-3 rounded-xl px-4 py-3 text-left text-sm whitespace-normal", s.key === step ? "sm-setup-step-active font-semibold" : "hover:bg-muted/60")}>
                <span className={cn("sm-setup-step-dot", progress[s.key] && "sm-setup-step-dot-done", s.key === step && !progress[s.key] && "sm-setup-step-dot-active")}>
                  {progress[s.key] ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </span>
                <span><span className="font-mono text-xs text-muted-foreground mr-1">{i + 1}.</span>{s.title}</span>
              </Button>
            </li>
          ))}
        </ol>

        <Card className="sm-setup-focus">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0"><Building2 className="sm-icon-well h-16 w-16 shrink-0 rounded-2xl p-4" /><div><CardTitle className="text-2xl">{current.title}</CardTitle><CardDescription className="mt-2">{current.description}</CardDescription></div></CardHeader>
          <CardContent className="space-y-6">
            {step === "company" && (<>
              <div className="flex items-center gap-4 rounded-md border border-border p-3">
                <img src={socialMotiveLogo} alt="SocialMotive" className="h-10 rounded object-contain" />
                <span className="text-sm text-muted-foreground">for</span>
                {logoUrl ? <img src={logoUrl} alt={companyName} className="h-10 max-w-[140px] object-contain" /> : null}
                <span className="font-semibold">{companyName || "your company"}</span>
              </div>
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
                {idx < SETUP_STEPS.length - 1 && <Button variant="outline" className="sm-setup-pill" onClick={next}>Skip for now</Button>}
                <Button disabled={busy} className="sm-setup-save" onClick={() => complete(actions[step])}>{idx === SETUP_STEPS.length - 1 ? "Finish" : "Save & continue"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ================= Settings grid cards ================= */

function GridCard({ title, desc, icon: Icon, href, linkLabel, children, className, art }: {
  title: string; desc?: string; icon: typeof Users; href?: string; linkLabel?: string; children?: React.ReactNode; className?: string; art?: string;
}) {
  return (
    <Card className={cn("sm-setup-hub-card relative flex flex-col overflow-hidden", className)}>
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="sm-icon-well sm-setup-well"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1">{title}</span>
          {href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        </CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      {art && <img src={art} alt="" aria-hidden loading="lazy" width={816} height={816} className="sm-setup-card-art" />}
      <CardContent className={cn("relative z-10 flex-1 space-y-2", art && "sm-setup-hub-pad")}>{children}</CardContent>
      {href && <div className="relative z-10 mt-auto px-5 pb-5 pt-3"><Button asChild size="sm" variant="outline" className="sm-setup-card-cta w-full"><Link to={href}>{linkLabel ?? "Manage"}</Link></Button></div>}
    </Card>
  );
}

function PostToCard() {
  const { activeClientId, activeClient } = useActiveClient();
  const { data: accounts = [] } = useClientSocialAccounts(activeClientId);
  return (
    <GridCard title="Post to" desc={`Quick links to post for ${activeClient?.name ?? "the selected brand"}.`} icon={Send}>
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
    </GridCard>
  );
}

function ReviewChipsEditor() {
  const ws = useWorkspace();
  const [open, setOpen] = useState(false);
  const [chips, setChips] = useState(ws.reviewChips);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setChips(ws.reviewChips); }, [JSON.stringify(ws.reviewChips)]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (i: number, k: "label" | "instruction", v: string) => setChips((c) => c.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const clean = chips.map((c) => ({ label: c.label.trim(), instruction: c.instruction.trim() })).filter((c) => c.label && c.instruction);
  const dupes = new Set(clean.map((c) => c.label.toLowerCase())).size !== clean.length;
  const save = async () => {
    setBusy(true);
    try { await updateWorkspaceSettings({ review_chips: clean } as never); ws.refresh(); toast.success("Revision chips saved"); }
    catch (e) { toast.error("Couldn't save", { description: (e as Error).message }); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-2 border-t pt-3">
      <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen((o) => !o)}>
        Manage revision chips{open ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
      </Button>
      {open && (<>
        <p className="text-xs text-muted-foreground">One-tap feedback on the review screen. The instruction is what the AI receives when revising.</p>
        {chips.map((c, i) => (
          <div key={i} className="space-y-1.5 rounded-md border p-2">
            <div className="flex gap-2">
              <Input value={c.label} maxLength={30} placeholder="Chip label" onChange={(e) => set(i, "label", e.target.value)} />
              <Button size="sm" variant="ghost" onClick={() => setChips((x) => x.filter((_, j) => j !== i))}>Remove</Button>
            </div>
            <Textarea rows={2} value={c.instruction} maxLength={300} placeholder="Instruction for the AI" onChange={(e) => set(i, "instruction", e.target.value)} />
          </div>
        ))}
        {dupes && <p className="text-xs text-destructive">Two chips have the same label.</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={chips.length >= 10} onClick={() => setChips((x) => [...x, { label: "", instruction: "" }])}>Add chip</Button>
          <Button size="sm" disabled={busy || dupes} onClick={save}>Save chips</Button>
        </div>
      </>)}
    </div>
  );
}

function GovernanceCard() {
  const ws = useWorkspace();
  const save = async (patch: Record<string, unknown>) => {
    try { await updateWorkspaceSettings(patch as never); ws.refresh(); toast.success("Governance updated"); }
    catch (e) { toast.error("Couldn't save", { description: (e as Error).message }); }
  };
  return (
    <GridCard title="Governance" desc="Optional guardrails. Turn on only what your team needs." icon={ShieldCheck}>
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
      <ReviewChipsEditor />
    </GridCard>
  );
}

function TeamCard() {
  const { data: users = [] } = useQuery({
    queryKey: ["workspace_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_workspace_users");
      if (error) throw error;
      return (data ?? []) as { user_id: string; display_name: string | null; email: string; role: WorkspaceRole }[];
    },
  });
  const roles = [...new Set(users.map((u) => u.role).filter(Boolean))];
  return (
    <GridCard title="Team" desc={`${users.length} member${users.length === 1 ? "" : "s"} in this workspace.`} icon={Users} href="/settings/team" linkLabel="Manage team" art={artTeam}>
      <div className="sm-setup-avatars">
        {users.slice(0, 6).map((u) => {
          const name = u.display_name ?? u.email;
          const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
          return <span key={u.user_id} title={name} className="sm-setup-avatar">{initials}</span>;
        })}
        {users.length > 6 && <span className="sm-setup-avatar sm-setup-avatar-more">+{users.length - 6}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => <Badge key={r} variant="outline" className="text-xs">{ROLE_META[r]?.label ?? r}</Badge>)}
      </div>
    </GridCard>
  );
}

function ConnectionsCard() {
  const tiles = [
    { key: "linkedin", label: "LinkedIn" }, { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" }, { key: "x", label: "X" },
    { key: "ai", label: "AI tools" },
  ];
  return (
    <GridCard title="Social Connections" desc="Posting accounts and AI tools." icon={Link2} href="/settings/connections" linkLabel="Manage connections" art={artSocial}>
      <div className="flex flex-wrap gap-2.5 pt-1">
        {tiles.map((t) => (
          <div key={t.key} className="sm-setup-tile" title={t.label} role="img" aria-label={t.label}>
            {t.key === "ai" ? <Sparkles className="h-5 w-5" /> : <PlatformIcon platform={t.key} className="h-5 w-5" />}
          </div>
        ))}
      </div>
    </GridCard>
  );
}

function EmailProviderCard() {
  const { data } = useQuery({
    queryKey: ["email_provider_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_provider_settings").select("provider").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const connected = Boolean(data && data.provider && data.provider !== "none");
  return (
    <GridCard title="Email Provider" desc="The email account used to send team alerts." icon={Mail} href="/settings/email-provider" linkLabel="Configure email provider" art={artEmail}>
      <div className="flex items-center gap-2 text-sm">
        <span className="capitalize">{connected ? data!.provider : "Not connected"}</span>
        {connected && <Badge className="sm-setup-connected gap-1"><CheckCircle2 className="h-3 w-3" />Connected</Badge>}
      </div>
    </GridCard>
  );
}

function WorkspaceCard() {
  const ws = useWorkspace();
  const s = ws.settings;
  return (
    <GridCard title="Workspace" desc="Company name, logo and organization type." icon={Building2} href="/setup?step=company" linkLabel="Edit workspace details" art={artWorkspace}>
      <div className="flex items-center gap-3 rounded-md border border-border p-2.5">
        <img src={socialMotiveLogo} alt="SocialMotive" className="h-8 rounded object-contain" />
        <span className="text-xs text-muted-foreground">for</span>
        {s?.company_logo_url ? <img src={s.company_logo_url} alt={s.company_name} className="h-8 max-w-[100px] object-contain" /> : null}
        <span className="truncate text-sm font-semibold">{s?.company_name}</span>
      </div>
      <p className="text-xs text-muted-foreground capitalize">{s?.org_type} · {s?.entity_label_plural}</p>
    </GridCard>
  );
}

function BrandProfilesCard() {
  const { clients } = useActiveClient();
  return (
    <GridCard title="Your Brand Profiles" desc="Brands, their social accounts and profile links." icon={Building2} href="/settings/clients" linkLabel="Manage brand profiles" art={artBrands}>
      <div className="flex flex-wrap gap-1.5">
        {clients.length === 0 && <p className="text-sm text-muted-foreground">No brand profiles yet.</p>}
        {clients.map((c) => <Badge key={c.id} variant="outline" className="text-xs">{c.name}</Badge>)}
      </div>
    </GridCard>
  );
}

function AccountTagsCard() {
  const { activeTags } = useAccountTags();
  return (
    <GridCard title="Account Tags" desc="People and organizations you tag in posts." icon={AtSign} href="/settings/tags" linkLabel="Manage tags" art={artTags}>
      <div className="flex flex-wrap gap-1.5">
        {activeTags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
        {activeTags.slice(0, 12).map((t) => <Badge key={t.id} variant="outline" className="text-xs font-mono">@{t.handle}</Badge>)}
        {activeTags.length > 12 && <Badge variant="outline" className="text-xs">+{activeTags.length - 12} more</Badge>}
      </div>
    </GridCard>
  );
}

function NotificationsCard() {
  return (
    <GridCard title="Notifications" desc="Which emails your team gets, and when." icon={Bell} href="/settings/notifications" linkLabel="Manage notifications">
      <p className="text-sm text-muted-foreground">Daily digest, post approvals, review requests and went-out alerts — configured per teammate.</p>
    </GridCard>
  );
}

function PlanLimitsCard() {
  const ws = useWorkspace();
  const s = ws.settings;
  const [planName, setPlanName] = useState("");
  const [seatLimit, setSeatLimit] = useState("");
  const [clientLimit, setClientLimit] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!s) return;
    setPlanName(s.plan_name); setSeatLimit(s.seat_limit?.toString() ?? ""); setClientLimit(s.client_limit?.toString() ?? "");
  }, [s]);
  const save = async () => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({ plan_name: planName.trim() || "Unlimited", seat_limit: seatLimit ? Number(seatLimit) : null, client_limit: clientLimit ? Number(clientLimit) : null } as never);
      ws.refresh(); toast.success("Plan and limits saved");
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  return (
    <GridCard title="Plan and limits" desc="Leave a limit blank for unlimited." icon={ShieldCheck}>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label className="text-xs">Plan name</Label><Input disabled={!ws.isOwner} value={planName} onChange={(e) => setPlanName(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Seats</Label><Input disabled={!ws.isOwner} type="number" min={1} placeholder="∞" value={seatLimit} onChange={(e) => setSeatLimit(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">{ws.entityPlural}</Label><Input disabled={!ws.isOwner} type="number" min={1} placeholder="∞" value={clientLimit} onChange={(e) => setClientLimit(e.target.value)} /></div>
      </div>
      {ws.isOwner
        ? <Button size="sm" variant="outline" disabled={saving} onClick={save}>{saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Save</Button>
        : <Badge variant="outline" className="text-xs">Owner only</Badge>}
    </GridCard>
  );
}

function SignInCard() {
  const ws = useWorkspace();
  const s = ws.settings;
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (s) setDomain(s.auto_admin_domain ?? ""); }, [s]);
  const save = async () => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({ auto_admin_domain: domain.trim().replace(/^@/, "") || null } as never);
      ws.refresh(); toast.success("Sign-in domain saved");
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  return (
    <GridCard title="Sign-in" desc="Verified emails at this domain become Admins automatically. Blank turns it off." icon={Lock}>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1"><Label className="text-xs">Company email domain</Label><Input placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} /></div>
        <Button size="sm" variant="outline" disabled={saving} onClick={save}>Save</Button>
      </div>
    </GridCard>
  );
}

function WebAddressCard() {
  const ws = useWorkspace();
  const s = ws.settings;
  const [appDomain, setAppDomain] = useState("");
  const [dnsCheck, setDnsCheck] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (s) setAppDomain((s as { app_domain?: string | null }).app_domain ?? ""); }, [s]);
  const clean = () => appDomain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  const save = async () => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({ app_domain: clean() || null } as never);
      ws.refresh(); toast.success("Web address saved");
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  return (
    <GridCard title="Your web address" desc="The address your team uses to open this workspace. Email links point here once it's saved." icon={Globe}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px] space-y-1"><Label className="text-xs">Web address</Label><Input placeholder="social.yourcompany.com" value={appDomain} onChange={(e) => { setAppDomain(e.target.value); setDnsCheck(null); }} /></div>
        <Button size="sm" variant="outline" disabled={!appDomain.trim()} onClick={async () => {
          const d = clean();
          setDnsCheck("Checking…");
          try {
            const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(d)}&type=A`).then((x) => x.json());
            const ips: string[] = (r.Answer ?? []).filter((a: { type: number }) => a.type === 1).map((a: { data: string }) => a.data);
            setDnsCheck(ips.includes("185.158.133.1") ? `${d} points to SocialMotive. It's ready once the connection shows Active.` : ips.length ? `${d} points somewhere else (${ips.join(", ")}). Update the A record to 185.158.133.1.` : `${d} isn't set up yet. Add the A record below.`);
          } catch { setDnsCheck("Couldn't check right now. Try again in a minute."); }
        }}>Check address</Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={save}>Save</Button>
      </div>
      {dnsCheck && <p className="text-sm">{dnsCheck}</p>}
      <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        <li>Choose an address you own and save it here.</li>
        <li>At your domain provider, add an A record pointing to 185.158.133.1, plus the TXT verification record shown when connected.</li>
        <li>Ask your SocialMotive operator to connect the address at handover. Changes can take up to 72 hours.</li>
        <li>Press Check address to confirm it points here.</li>
      </ol>
    </GridCard>
  );
}

function DataExportCard() {
  const ws = useWorkspace();
  const { clients } = useActiveClient();
  const [exporting, setExporting] = useState(false);
  async function exportData(clientId?: string) {
    setExporting(true);
    try {
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), company: ws.settings?.company_name };
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
    } catch (e) { toast.error((e as Error).message); } finally { setExporting(false); }
  }
  return (
    <GridCard title="Data export" desc="Download briefs, posts, comments, assets and strategy as a file." icon={Download} className="lg:col-span-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={exporting} onClick={() => exportData()}><Download className="mr-2 h-4 w-4" />Everything</Button>
        {clients.map((c) => (
          <Button key={c.id} variant="outline" size="sm" disabled={exporting} onClick={() => exportData(c.id)}><Download className="mr-2 h-4 w-4" />{c.name}</Button>
        ))}
      </div>
    </GridCard>
  );
}

function DangerZoneCard() {
  const ws = useWorkspace();
  const s = ws.settings;
  const [confirmText, setConfirmText] = useState("");
  const locked = Boolean(s?.is_demo_master);
  async function runDanger(rpc: "reset_workspace_content" | "prepare_blank_copy") {
    const { error } = await supabase.rpc(rpc, { _confirm: confirmText });
    if (error) { toast.error(error.message); return; }
    toast.success(rpc === "prepare_blank_copy" ? "Blank copy prepared" : "Workspace content cleared");
    ws.refresh();
    setConfirmText("");
  }
  if (!s || (locked && !s.company_name)) return null;
  const tools = [
    { key: "reset", title: "Reset to clean workspace", desc: `Deletes all briefs, posts, comments, reviews and assets. Settings, strategy, ${ws.entityPlural.toLowerCase()} and team stay.`, rpc: "reset_workspace_content" as const, cta: "Reset workspace content…" },
    { key: "blank", title: "Prepare blank copy for a new organization", desc: `Run once by our team during handover: deletes all content, strategy, ${ws.entityPlural.toLowerCase()}, social accounts, invites, activity and every team member except the operator. Locks itself afterwards.`, rpc: "prepare_blank_copy" as const, cta: "Prepare blank copy…" },
  ];
  return (
    <Card className="sm-setup-hub-card border-destructive/40 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          Danger zone {locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Locked demo workspace</Badge>}
        </CardTitle>
        <CardDescription>
          {locked
            ? "These tools are permanently disabled in this NuDaze demo workspace. In a sold copy, our team runs the blank-copy preparation during handover."
            : "Operator-only tools, run by our team during handover. Both permanently delete data and can't be undone."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tools.map((tool) => (
          <div key={tool.key} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{tool.title}</p>
              <p className="text-xs text-muted-foreground">{tool.desc}</p>
            </div>
            {locked || !ws.isOwner ? (
              <Button variant="destructive" size="sm" disabled title={locked ? "Disabled in the demo workspace" : "Owner only"}><Lock className="mr-2 h-4 w-4" />{tool.cta.replace("…", "")}</Button>
            ) : (
              <AlertDialog onOpenChange={() => setConfirmText("")}>
                <AlertDialogTrigger asChild><Button variant="destructive" size="sm">{tool.cta}</Button></AlertDialogTrigger>
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
  );
}

function SettingsGrid() {
  const ws = useWorkspace();
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold">Workspace settings</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PostToCard />
        {ws.canManage && <GovernanceCard />}
        {ws.canManage && <TeamCard />}
        {ws.canManage && <ConnectionsCard />}
        {ws.canManage && <EmailProviderCard />}
        {ws.canManage && <WorkspaceCard />}
        <BrandProfilesCard />
        <AccountTagsCard />
        <NotificationsCard />
        {ws.canManage && <PlanLimitsCard />}
        {ws.canManage && <SignInCard />}
        {ws.canManage && <WebAddressCard />}
        {ws.canManage && <DataExportCard />}
        {ws.canManage && <DangerZoneCard />}
      </div>
    </section>
  );
}

export default function Setup() {
  const ws = useWorkspace();
  if (ws.loading) return null;
  if (!ws.canManage) return <div className="sm-reference sm-setup animate-fade-in space-y-6"><PageHeader title="Setup" description="Your settings in one place." /><SettingsGrid /></div>;
  return <div className="space-y-8"><SetupInner /><div className="sm-reference sm-setup"><SettingsGrid /></div></div>;
}
