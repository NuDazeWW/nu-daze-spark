import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { BriefApprovalActions, BriefDiscussion, useBriefComments, useWorkspaceUsers } from "@/components/briefs/BriefCollaboration";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClient } from "@/contexts/ClientContext";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useVoiceProfiles } from "@/hooks/useVoiceProfiles";
import { useCreditGate } from "@/components/billing/CreditGate";
import { printOnePager, angleOf } from "@/lib/campaignOnePager";
import { Printer, AlertTriangle, CheckCircle2, FileText, Layers, Loader2, Plus, Sparkles, Wand2 } from "lucide-react";

type Brief = any;

const TYPES: Record<string, string> = {
  thought_leadership: "Thought leadership",
  awareness: "Awareness",
  event: "Event",
  product_service: "Product / service",
  recruitment: "Recruitment",
  education: "Education",
  evergreen: "Evergreen",
};
const CHANNELS: Record<string, string> = {
  linkedin_post: "LinkedIn post",
  instagram_feed: "Instagram feed",
  facebook_post: "Facebook post",
  instagram_story: "Instagram Story",
  instagram_reel: "Instagram Reel",
};
const REQUIRED: [keyof Brief, string][] = [
  ["objective", "Objective"],
  ["target_audience", "Target audience"],
  ["core_message", "Core message"],
  ["proof_points", "At least one proof point"],
  ["primary_cta", "Primary CTA"],
  ["success_metric", "Success metric"],
];

function missingFields(b: Brief) {
  return REQUIRED.filter(([k]) => {
    const v = b[k];
    return Array.isArray(v) ? v.filter(Boolean).length === 0 : !String(v ?? "").trim();
  }).map(([, l]) => l);
}

const empty = {
  title: "", campaign_type: "thought_leadership", objective: "", target_audience: "", core_message: "",
  proof_points: [] as string[], primary_cta: "", destination_url: "", success_metric: "", timing_window: "",
  constraints: "", target_channels: Object.keys(CHANNELS),
};

export default function CampaignBriefs() {
  const { activeClientId } = useActiveClient();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { ensure } = useCreditGate();
  const [editing, setEditing] = useState<Brief | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [review, setReview] = useState<{ score: number; questions: string[]; issues: string[] } | null>(null);
  const [voiceId, setVoiceId] = useState<string>("");
  const [threeAngles, setThreeAngles] = useState(true);
  const { profiles: voices } = useVoiceProfiles();
  const activeVoices = voices.filter((v) => v.is_active);

  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ["briefs", activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_briefs").select("*").eq("client_id", activeClientId!).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const selected = briefs.find((b: Brief) => b.id === selectedId) ?? briefs[0];

  const { data: masters = [] } = useQuery({
    queryKey: ["masters", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_content_objects")
        .select("*, post_cards(id, platform, content_type, post_number, draft_copy, approval_status, campaign_pillar, scheduled_for, preflight_reviews(motive_score, created_at))")
        .eq("brief_id", selected!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (b: Brief) => {
      const payload = { ...b, proof_points: (b.proof_points ?? []).filter((p: string) => p.trim()) };
      delete payload.created_at; delete payload.updated_at;
      if (b.id) {
        const { error } = await supabase.from("campaign_briefs").update({ ...payload, updated_by: user?.id }).eq("id", b.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("campaign_briefs").insert({ ...payload, client_id: activeClientId, created_by: user!.id }).select().single();
        if (error) throw error;
        setSelectedId(data.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["briefs"] }); qc.invalidateQueries({ queryKey: ["masters"] }); setEditing(null); toast.success("Brief saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status, updated_by: user?.id };
      if (status === "approved") { patch.approved_at = new Date().toISOString(); patch.approved_by = user?.id; }
      const { error } = await supabase.from("campaign_briefs").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["briefs"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const runReview = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("generate-from-brief", { body: { brief_id: id, mode: "review" } });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      return data;
    },
    onSuccess: setReview,
    onError: (e: any) => toast.error(e.message),
  });

  const generate = useMutation({
    mutationFn: async (id: string) => {
      const b: any = briefs.find((x: any) => x.id === id);
      const qty = Math.max(b?.target_channels?.length ?? 1, 1) * (threeAngles ? 3 : 1);
      if (!(await ensure({ bucket: "text_drafts", capability: "text_draft", quantity: qty, clientId: b?.client_id, label: `${qty} platform drafts` }))) return { variants: 0, skipped: true };
      const { data, error } = await supabase.functions.invoke("generate-from-brief", { body: { brief_id: id, voice_profile_id: voiceId || undefined, angles: threeAngles } });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      return data;
    },
    onSuccess: (d) => { if (d?.skipped) return; qc.invalidateQueries({ queryKey: ["masters"] }); toast.success(`Master content created with ${d.variants} platform variants — now in the Daily Queue`); },
    onError: (e: any) => toast.error(e.message),
  });

  const missing = selected ? missingFields(selected) : [];
  const completeness = selected ? Math.round(((REQUIRED.length - missing.length) / REQUIRED.length) * 100) : 0;

  const ws = useWorkspace();
  const isAdmin = ws.canManage;
  const wsUsers = useWorkspaceUsers();
  const comments = useBriefComments(selected?.id);
  const totalComments = comments.data?.length ?? 0;
  const openComments = (comments.data ?? []).filter((c: any) => !c.is_resolved).length;
  const genBlocked = !!selected?.approval_mode_enabled && openComments > 0;
  const who = (id?: string | null) => { const u = wsUsers.data?.find((x) => x.user_id === id); return u?.display_name || u?.email || "a team member"; };
  const approverName = who(selected?.approved_by);
  const assignedName = who(selected?.assigned_approver_id);
  const { data: canApprove } = useQuery({
    queryKey: ["can_approve_brief", selected?.id, selected?.assigned_approver_id, user?.id],
    enabled: !!selected?.id && !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("can_approve_brief", { _user_id: user!.id, _brief_id: selected!.id });
      return !!data;
    },
  });
  const toggleMode = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = await supabase.from("campaign_briefs").update({ approval_mode_enabled: on } as never).eq("id", selected!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["briefs"] }),
    onError: (e: any) => toast.error(e.message),
  });

  // Deep link: /campaign-briefs?brief=<id>
  const [params] = useSearchParams();
  const linked = params.get("brief");
  useEffect(() => { if (linked && briefs.some((b: Brief) => b.id === linked)) setSelectedId(linked); }, [linked, briefs]);

  return (
    <div>
      <PageHeader title="Campaign Briefs" description="Define the strategy once. Generate one master message and coordinated platform variants from it.">
        <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1" /> New brief</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && briefs.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              <FileText className="h-6 w-6 mx-auto mb-2" />No briefs yet. Start one to plan a coordinated content set.
            </Card>
          )}
          {briefs.map((b: Brief) => (
            <button key={b.id} onClick={() => { setSelectedId(b.id); setReview(null); }}
              className={`sm-brief-card w-full text-left rounded-lg border p-3 transition-colors ${selected?.id === b.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{b.title}</span>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground font-mono">{TYPES[b.campaign_type]} · v{b.version}</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{selected.title}</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{TYPES[selected.campaign_type]} · version {selected.version}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditing({ ...selected })}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => printOnePager(selected, masters)}><Printer className="h-4 w-4 mr-1" />Campaign one-pager</Button>
                  <Button variant="outline" size="sm" disabled={runReview.isPending} onClick={() => runReview.mutate(selected.id)}>
                    {runReview.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}AI completeness review
                  </Button>
                  {selected.status !== "approved" ? (
                    selected.approval_mode_enabled ? (
                      <BriefApprovalActions brief={selected} canApprove={!!canApprove} blocked={missing.length > 0} />
                    ) : (
                      <Button size="sm" disabled={missing.length > 0 || setStatus.isPending} onClick={() => setStatus.mutate({ id: selected.id, status: "approved" })}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Approve brief
                      </Button>
                    )
                  ) : (
                    <>
                      {activeVoices.length > 0 && (
                        <Select value={voiceId || "brand"} onValueChange={(v) => setVoiceId(v === "brand" ? "" : v)}>
                          <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Brand voice" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brand">Brand voice (default)</SelectItem>
                            {activeVoices.map((v) => (
                              <SelectItem key={v.id} value={v.id}>Write as {v.name}{v.role_title ? ` · ${v.role_title}` : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Data-Driven Insight, Founder Story and Bold Contrarian Take for every channel">
                        <Checkbox checked={threeAngles} onCheckedChange={(c) => setThreeAngles(!!c)} />3 angles per channel
                      </label>
                      <Button size="sm" disabled={generate.isPending || genBlocked} title={genBlocked ? "Check off every discussion comment first" : undefined} onClick={() => generate.mutate(selected.id)}>
                        {generate.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}Generate content set
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Brief completeness</span><span className="font-mono">{completeness}%</span></div>
                <Progress value={completeness} />
                {missing.length > 0 && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Missing before approval: {missing.join(", ")}</p>
                )}
              </div>

              {selected.approval_mode_enabled && (
                <div className="mb-5 rounded-lg border border-border p-3 text-xs space-y-1">
                  <div className="font-medium text-sm mb-1">Ready to generate</div>
                  <Check ok={missing.length === 0} label="Required strategy fields completed" />
                  <Check ok={selected.status === "approved"} label={selected.status === "approved" ? `Brief approved by ${approverName}` : selected.status === "in_review" ? `Waiting for approval${selected.assigned_approver_id ? ` from ${assignedName}` : " from any Approver or Admin"}` : "Brief approved"} />
                  <Check ok={openComments === 0} label={openComments === 0 ? `${totalComments} of ${totalComments} discussion items checked off` : `${openComments} open comment${openComments === 1 ? "" : "s"} must be checked off before generation`} />
                  {isAdmin && (
                    <label className="flex items-center gap-2 pt-1 text-muted-foreground"><Checkbox checked onCheckedChange={() => toggleMode.mutate(false)} />Approval mode on for this brief</label>
                  )}
                </div>
              )}
              {!selected.approval_mode_enabled && isAdmin && (
                <label className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={false} onCheckedChange={() => toggleMode.mutate(true)} />Turn on approval mode for this brief</label>
              )}

              {review && (
                <div className="mb-5 rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
                  <div className="font-medium">AI review · readiness {Math.round(review.score)}/100</div>
                  {review.issues.length > 0 && <ul className="list-disc pl-5 text-muted-foreground">{review.issues.map((i, n) => <li key={n}>{i}</li>)}</ul>}
                  {review.questions.length > 0 && (<><div className="font-medium pt-1">Questions to resolve</div><ul className="list-disc pl-5 text-muted-foreground">{review.questions.map((q, n) => <li key={n}>{q}</li>)}</ul></>)}
                </div>
              )}

              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <Field label="Objective" v={selected.objective} />
                <Field label="Target audience" v={selected.target_audience} />
                <Field label="Core message" v={selected.core_message} wide />
                <Field label="Proof points" v={(selected.proof_points ?? []).map((p: string) => `• ${p}`).join("\n")} wide />
                <Field label="Primary CTA" v={selected.primary_cta} />
                <Field label="Destination URL" v={selected.destination_url} />
                <Field label="Success metric" v={selected.success_metric} />
                <Field label="Timing" v={selected.timing_window} />
                <Field label="Constraints" v={selected.constraints} wide />
                <Field label="Channels" v={(selected.target_channels ?? []).map((c: string) => CHANNELS[c]).join(", ")} wide />
              </dl>
            </Card>

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Layers className="h-4 w-4" />Master content objects</h3>
              {masters.length === 0 && <p className="text-sm text-muted-foreground">None yet. Approve the brief and generate a content set.</p>}
              <div className="space-y-4">
                {masters.map((m: any) => (
                  <Card key={m.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">From brief v{m.brief_version}</div>
                      </div>
                      {m.is_stale && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Brief changed — may be stale</Badge>}
                    </div>
                    <p className="text-sm mt-3">{m.core_message}</p>
                    {m.cta && <p className="text-xs text-muted-foreground mt-2">CTA: {m.cta}</p>}
                    <div className="grid gap-3 mt-4 md:grid-cols-2">
                      {(m.post_cards ?? []).map((p: any) => (
                        <div key={p.id} className="rounded-md border border-border p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono uppercase text-muted-foreground">{p.platform} · {p.content_type}{angleOf(p) ? ` · ${angleOf(p)}` : ""}</span>
                            <StatusBadge status={p.approval_status} />
                          </div>
                          <p className="text-xs line-clamp-4 whitespace-pre-line">{p.draft_copy}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {editing && <BriefDialog brief={editing} onClose={() => setEditing(null)} onSave={(b) => save.mutate(b)} saving={save.isPending} />}
    </div>
  );
}

function Field({ label, v, wide }: { label: string; v?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="whitespace-pre-line">{v?.trim() ? v : <span className="text-muted-foreground/60 italic">Not set</span>}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "approved" ? "default" : status === "archived" ? "outline" : "secondary";
  return <Badge variant={variant as any} className="capitalize text-[10px]">{status.replace("_", " ")}</Badge>;
}

function BriefDialog({ brief, onClose, onSave, saving }: { brief: Brief; onClose: () => void; onSave: (b: Brief) => void; saving: boolean }) {
  const [b, setB] = useState<Brief>(brief);
  const set = (k: string, v: any) => setB((x: Brief) => ({ ...x, [k]: v }));
  const proofText = useMemo(() => (b.proof_points ?? []).join("\n"), [b.proof_points]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{b.id ? "Edit brief" : "New campaign brief"}</DialogTitle></DialogHeader>
        {b.id && b.status === "approved" && (
          <p className="text-xs text-muted-foreground rounded-md bg-muted/40 p-2">Changing the objective, audience, message, proof points or CTA creates a new version, returns the brief to draft, and flags existing content as possibly stale.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Title</Label><Input value={b.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label>Campaign type</Label>
            <Select value={b.campaign_type} onValueChange={(v) => set("campaign_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TYPES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Timing</Label><Input placeholder="e.g. Nov 3 – Nov 21" value={b.timing_window ?? ""} onChange={(e) => set("timing_window", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Objective *</Label><Textarea rows={2} value={b.objective ?? ""} onChange={(e) => set("objective", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Target audience *</Label><Textarea rows={2} value={b.target_audience ?? ""} onChange={(e) => set("target_audience", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Core message *</Label><Textarea rows={3} value={b.core_message ?? ""} onChange={(e) => set("core_message", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Proof points * <span className="text-muted-foreground font-normal">(one per line — AI will use only these)</span></Label>
            <Textarea rows={3} value={proofText} onChange={(e) => set("proof_points", e.target.value.split("\n"))} />
          </div>
          <div><Label>Primary CTA *</Label><Input value={b.primary_cta ?? ""} onChange={(e) => set("primary_cta", e.target.value)} /></div>
          <div><Label>Destination URL</Label><Input value={b.destination_url ?? ""} onChange={(e) => set("destination_url", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Success metric *</Label><Input value={b.success_metric ?? ""} onChange={(e) => set("success_metric", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Constraints</Label><Textarea rows={2} placeholder="Required language, claims to avoid, compliance notes" value={b.constraints ?? ""} onChange={(e) => set("constraints", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Channels</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(CHANNELS).map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={b.target_channels?.includes(k)} onCheckedChange={(c) => set("target_channels", c ? [...(b.target_channels ?? []), k] : b.target_channels.filter((x: string) => x !== k))} />{l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!b.title.trim() || saving} onClick={() => onSave(b)}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save brief</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
