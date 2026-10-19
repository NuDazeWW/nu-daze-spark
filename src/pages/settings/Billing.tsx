import { nonprofitDisplay, isNonprofitEligible } from "@/lib/pricing";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminOnly } from "@/components/settings/AdminOnly";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clapperboard, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resetDemoToCameraReady } from "@/lib/demoSeed";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtUsd, startCheckout, useBilling, useCreditWeights, useTierDefinitions, type TierDefinition } from "@/hooks/useBilling";
import { NonprofitIntakeDialog } from "@/components/billing/NonprofitIntakeDialog";

function BillingInner() {
  const { snapshot, refresh } = useBilling();
  const tiers = useTierDefinitions();
  const [params, setParams] = useSearchParams();
  const [cycle, setCycle] = useState<"monthly" | "annual">(params.get("billing") === "monthly" ? "monthly" : "annual");
  const [busy, setBusy] = useState<string | null>(null);
  const [intake, setIntake] = useState(false);
  const wantNonprofit = params.get("nonprofit") === "true";
  const preTier = params.get("tier");
  const b = snapshot?.billing;
  const isOwner = snapshot?.role === "owner";
  const internal = b?.billing_status === "internal";
  const npVerified = b?.nonprofit_status === "verified";

  useEffect(() => {
    const c = params.get("checkout");
    if (c === "success") { toast.success("Payment received. Your plan updates as soon as payment is confirmed — usually within a minute."); setTimeout(refresh, 4000); }
    if (c === "cancel") toast("Checkout canceled — nothing was charged.");
    if (c) { params.delete("checkout"); setParams(params, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = async (t: TierDefinition) => {
    setBusy(t.tier_slug);
    try { await startCheckout({ action: "subscribe", tier: t.tier_slug, cycle: npVerified ? "annual" : cycle, nonprofit: npVerified && isNonprofitEligible(t.tier_slug) }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  if (!snapshot || !b) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{snapshot.tier.name} plan <Badge variant="outline">v{b.tier_definition_version}</Badge>
            <Badge variant={b.billing_status === "past_due" ? "destructive" : "secondary"}>{internal ? "Internal comp · $0" : b.billing_status.replace("_", " ")}</Badge></CardTitle>
          <CardDescription>
            {b.billing_cycle === "annual" ? "Annual" : "Monthly"} billing · cycle ends {new Date(b.cycle_end).toLocaleDateString()} · payment method: <b>{b.payment_method_status}</b>
            {snapshot.current_version > b.tier_definition_version && ` · version ${snapshot.current_version} applies at your next renewal`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={internal || busy === "portal"} onClick={() => { setBusy("portal"); startCheckout({ action: "portal" }).catch((e) => toast.error(e.message)).finally(() => setBusy(null)); }}>Manage card & invoices</Button>

        </CardContent>
      </Card>

      {!internal && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle>Change plan</CardTitle><CardDescription>Plans take effect when payment is confirmed.</CardDescription></div>
            <div className="flex items-center gap-2 text-sm">Monthly <Switch checked={cycle === "annual" || npVerified} disabled={npVerified} onCheckedChange={(v) => setCycle(v ? "annual" : "monthly")} /> Annual</div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {(tiers.data ?? []).map((t) => {
              const disp = nonprofitDisplay(t, cycle as "monthly" | "annual", npVerified); const price = disp.perMonthCents;
              const current = t.tier_slug === b.tier_slug;
              return (
                <div key={t.id} className={cn("rounded-lg border p-4", preTier === t.tier_slug && "border-primary ring-1 ring-primary", t.tier_slug === "pro" && "border-primary/60")}>
                  <p className="font-display font-semibold">{t.name}</p>
                  <p className="mt-1 text-2xl font-semibold">{fmtUsd(price)}<span className="text-xs text-muted-foreground"> /mo</span></p>
                  {disp.note && <p className="text-xs font-medium">{disp.note}</p>}
                  <p className="text-xs text-muted-foreground">+ {fmtUsd(disp.nonprofitApplied ? t.nonprofit_implementation_fee_cents : t.implementation_fee_cents)} one-time setup</p>
                  <Button className="mt-3 w-full" size="sm" variant={current ? "outline" : "default"} disabled={current || busy === t.tier_slug} onClick={() => subscribe(t)}>
                    {busy === t.tier_slug ? <Loader2 className="h-4 w-4 animate-spin" /> : current ? "Current plan" : "Choose"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <NonprofitCard onApply={() => setIntake(true)} status={b.nonprofit_status} highlight={wantNonprofit} cycle={b.billing_cycle} />
      <NonprofitIntakeDialog open={intake} onOpenChange={setIntake} intendedTier={preTier ?? b.tier_slug} onSubmitted={refresh} />

      <BillingModeCard mode={b.billing_mode} isOwner={isOwner} eligible={b.tier_slug === "enterprise" || npVerified} onChange={refresh} />
      <StripeConfigCard />
      {internal && <DemoControls onDone={refresh} />}
      {isOwner && <PricingEngineCard />}
    </div>
  );
}

function NonprofitCard({ onApply, status, highlight, cycle }: { onApply: () => void; status: string; highlight: boolean; cycle: string }) {
  const apps = useQuery({
    queryKey: ["nonprofit_applications"],
    queryFn: async () => { const { data } = await supabase.from("nonprofit_applications").select("*").order("created_at", { ascending: false }); return data ?? []; },
  });
  const qc = useQueryClient();
  const review = async (id: string, decision: "verified" | "rejected") => {
    const notes = window.prompt(`Notes for this ${decision} decision (IRS Tax Exempt Organization Search result):`) ?? "";
    const { error } = await supabase.rpc("review_nonprofit_application", { _id: id, _decision: decision, _notes: notes });
    if (error) return toast.error(error.message);
    toast.success(`Application ${decision}`); qc.invalidateQueries();
  };
  const viewLetter = async (path: string) => {
    const { data, error } = await supabase.storage.from("nonprofit-letters").createSignedUrl(path, 120);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  };
  return (
    <Card className={cn(highlight && "border-primary")}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Non-profit program</CardTitle>
          <CardDescription>40% off annual plans, 25% off setup. Status: <b>{status === "none" ? "not applied" : status === "pending" ? "verification pending" : status}</b>
            {status === "verified" && cycle !== "annual" && " — switch to annual billing to receive the non-profit rate."}</CardDescription>

        </div>
        {status !== "verified" && <Button variant="outline" onClick={onApply}>{status === "pending" ? "Submit another" : "Apply"}</Button>}
      </CardHeader>
      {!!apps.data?.length && (
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>EIN</TableHead><TableHead>Status</TableHead><TableHead>Re-verify by</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {apps.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.legal_name}<p className="text-xs text-muted-foreground">{a.contact_name} · {a.contact_email}</p></TableCell>
                  <TableCell className="font-mono">{a.ein}</TableCell>
                  <TableCell>{a.status}</TableCell>
                  <TableCell>{a.reverification_due ?? "—"}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    <Button size="sm" variant="ghost" onClick={() => viewLetter(a.letter_path)}>Letter</Button>
                    <Button size="sm" variant="ghost" asChild><a href="https://apps.irs.gov/app/eos/" target="_blank" rel="noopener noreferrer">IRS search</a></Button>
                    {a.status === "pending" && <><Button size="sm" onClick={() => review(a.id, "verified")}>Approve</Button><Button size="sm" variant="outline" onClick={() => review(a.id, "rejected")}>Reject</Button></>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

function BillingModeCard({ mode, isOwner, eligible, onChange }: { mode: string; isOwner: boolean; eligible: boolean; onChange: () => void }) {
  const set = async (m: string) => {
    const { error } = await supabase.rpc("set_billing_mode", { _mode: m });
    if (error) return toast.error(error.message);
    toast.success("Billing mode updated"); onChange();
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>How add-ons are billed</CardTitle>
        <CardDescription>Card: credit packs, storage, seats, brands and channels charge immediately. Invoice: add-ons go on your next invoice (Force Enterprise and verified non-profits).</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        {(["self_serve_card", "invoice"] as const).map((m) => (
          <Button key={m} variant={mode === m ? "default" : "outline"} disabled={!isOwner || (m === "invoice" && !eligible)} onClick={() => set(m)}>
            {m === "invoice" ? "Invoice" : "Card on file"}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function StripeConfigCard() {
  const s = useQuery({
    queryKey: ["stripe_status"],
    queryFn: async () => { const { data, error } = await supabase.functions.invoke("stripe-checkout", { body: { action: "status" } }); if (error) throw error; return data as { mode: string; webhook_secret: boolean; price_ids: Record<string, boolean> }; },
  });
  const hook = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/stripe-webhook`;
  const priceCount = s.data ? Object.values(s.data.price_ids).filter(Boolean).length : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Payments connection
          {s.data && <Badge variant={s.data.mode === "live" ? "default" : s.data.mode === "test" ? "secondary" : "destructive"}>{s.data.mode === "not_configured" ? "Not connected" : `${s.data.mode} mode`}</Badge>}
        </CardTitle>
        <CardDescription>Each workspace uses its own Stripe account. Switching from test to live is a key change in this workspace's settings — no rebuild.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {s.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : s.data && (
          <>
            <p>Stripe key: <b>{s.data.mode === "not_configured" ? "missing" : "set"}</b> · Webhook signing secret: <b>{s.data.webhook_secret ? "set" : "missing"}</b> · Price IDs: <b>{priceCount} of 12</b> {priceCount === 0 && "(using prices from this page's plan table)"}</p>
            <p className="text-xs text-muted-foreground">Webhook address to add in Stripe: <code className="break-all font-mono">{hook}</code> — events: checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DemoControls({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [purge, setPurge] = useState(false);
  const [busy, setBusy] = useState(false);
  const counts = useQuery({
    queryKey: ["demo_counts", open], enabled: open,
    queryFn: async () => { const { data, error } = await supabase.rpc("demo_content_counts"); if (error) throw error; return data as Record<string, number>; },
  });
  const reset = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("reset_demo_allowances");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Allowances restored. Posts were not touched."); onDone();
  };
  const cameraReady = async () => {
    if (!user) return;
    setBusy(true);
    try { const r = await resetDemoToCameraReady(user.id); toast.success(`Camera-ready: ${r.posts} demo posts loaded`); onDone(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const clear = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("clear_demo_content", { _confirm: confirm, _purge_media: purge });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Demo content cleared"); setOpen(false); setConfirm(""); onDone();
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo controls</CardTitle>
        <CardDescription>For this internal demo workspace only. Guardrails stay live; these restore a clean state between demos. Every run is logged.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={reset} disabled={busy}><RotateCcw className="mr-2 h-4 w-4" />Reset demo allowances</Button>
        <Button variant="secondary" onClick={cameraReady} disabled={busy}><Clapperboard className="mr-2 h-4 w-4" />Reset to camera-ready demo</Button>
        <Button variant="outline" onClick={() => setOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Clear demo content…</Button>
        <p className="w-full text-xs text-muted-foreground">Reset restores media credits, AI drafts and X spend, recounts storage from real files, unpauses every bucket and clears alert counters. It never deletes posts. Camera-ready replaces all posts with the curated NuDaze launch set (briefs, scored posts, calendar, comment targets, repurpose ideas) — ideal between video takes.</p>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear demo content</DialogTitle>
            <DialogDescription>This permanently deletes post records from this workspace.</DialogDescription>
          </DialogHeader>
          {counts.data ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["Drafts", counts.data.drafts], ["Scheduled", counts.data.scheduled], ["Published", counts.data.published]].map(([l, n]) => (
                <div key={l as string} className="rounded-lg border p-2"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold">{n}</p></div>
              ))}
            </div>
          ) : <Loader2 className="h-4 w-4 animate-spin" />}
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">Posts already sent to live social platforms <b>cannot be recalled</b> by anything in this app. Clearing removes our records only — it does not un-publish anything.</p>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={purge} onCheckedChange={(v) => setPurge(Boolean(v))} /> Also purge demo media ({counts.data?.media_files ?? 0} files) to free storage</label>
          <div><Label>Type CLEAR DEMO CONTENT to confirm</Label><Input value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy || confirm.trim().toUpperCase() !== "CLEAR DEMO CONTENT"} onClick={clear}>Clear content</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PricingEngineCard() {
  const tiers = useTierDefinitions();
  const weights = useCreditWeights();
  const qc = useQueryClient();
  const audit = useQuery({
    queryKey: ["pricing_audit"],
    queryFn: async () => { const { data } = await supabase.from("pricing_config_audit").select("*").order("created_at", { ascending: false }).limit(20); return data ?? []; },
  });
  const [edit, setEdit] = useState<TierDefinition | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const FIELDS: [string, string, boolean][] = [
    ["monthly_price_cents", "Monthly price (cents)", false], ["annual_price_cents", "Annual price per month (cents)", false],
    ["nonprofit_annual_price_cents", "Non-profit annual per month (cents)", false], ["implementation_fee_cents", "Setup fee (cents)", false],
    ["media_credits", "Media credits", true], ["text_drafts", "AI drafts", true], ["x_cap_cents", "X cap (cents)", true],
    ["storage_gb", "Storage (GB)", true], ["seats", "Seats", true], ["brands", "Brands", true], ["dispatches", "Direct posts", true],
  ];
  const openEdit = (t: TierDefinition) => {
    setEdit(t);
    setDraft(Object.fromEntries(FIELDS.map(([k, , inA]) => [k, String(inA ? (t.allowances as Record<string, unknown>)[k] : (t as unknown as Record<string, unknown>)[k])])));
  };
  const save = async () => {
    if (!edit) return;
    const changes: Record<string, unknown> = { allowances: {} };
    for (const [k, , inA] of FIELDS) {
      const n = Number(draft[k]);
      if (!Number.isFinite(n) || n < 0) return toast.error(`${k} must be a number`);
      if (inA) (changes.allowances as Record<string, number>)[k] = n; else changes[k] = n;
    }
    const { data, error } = await supabase.rpc("update_tier_definition", { _slug: edit.tier_slug, _changes: changes as never });
    if (error) return toast.error(error.message);
    toast.success(`${edit.name} saved as version ${data}. Existing subscribers keep their version until renewal.`);
    setEdit(null); qc.invalidateQueries();
  };
  const saveWeight = async (cap: string, v: string) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return toast.error("Whole number required");
    const { error } = await supabase.rpc("update_credit_weight", { _capability: cap, _credits: n });
    if (error) return toast.error(error.message);
    toast.success("Credit weight updated"); qc.invalidateQueries();
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing engine</CardTitle>
        <CardDescription>Owner only. Edits create a new plan version for new subscribers; existing subscribers move at their next renewal. Every change is audited.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Table>
          <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Version</TableHead><TableHead>Monthly</TableHead><TableHead>Annual /mo</TableHead><TableHead>Credits</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {(tiers.data ?? []).map((t) => (
              <TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell>v{t.version}</TableCell><TableCell>{fmtUsd(t.monthly_price_cents)}</TableCell><TableCell>{fmtUsd(t.annual_price_cents)}</TableCell><TableCell>{t.allowances.media_credits}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openEdit(t)}>Edit</Button></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
        <div>
          <p className="mb-2 text-sm font-medium">Credit weights</p>
          <div className="grid gap-2 md:grid-cols-3">
            {(weights.data ?? []).map((w) => (
              <div key={w.capability} className="flex items-center gap-2 rounded border p-2 text-sm">
                <span className="flex-1">{w.label}</span>
                <Input type="number" min={0} defaultValue={w.credits} className="h-8 w-20" onBlur={(e) => Number(e.target.value) !== w.credits && saveWeight(w.capability, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Recent changes</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {(audit.data ?? []).map((a) => <li key={a.id}>{new Date(a.created_at).toLocaleString()} · {a.entity} · {a.entity_key}</li>)}
            {!audit.data?.length && <li>No changes yet.</li>}
          </ul>
        </div>
      </CardContent>
      <Dialog open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit {edit?.name}</DialogTitle><DialogDescription>Saving creates version {(edit?.version ?? 0) + 1}.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(([k, l]) => <div key={k}><Label className="text-xs">{l}</Label><Input type="number" value={draft[k] ?? ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} /></div>)}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save new version</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function Billing() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Plan & billing" description="Your plan, payments, non-profit status and spend controls." />
      <AdminOnly><BillingInner /></AdminOnly>
    </div>
  );
}
