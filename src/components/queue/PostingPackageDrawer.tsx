import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReadiness } from "@/hooks/useReadiness";
import { readPackageDraft, writePackageDraft } from "@/lib/packageDrafts";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { postLabel } from "@/components/tracking/PostTracking";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostCard } from "@/hooks/usePostCards";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NativePostPreview } from "@/components/preview/NativePostPreview";
import { usePreflight } from "@/hooks/usePreflight";
import { PreflightPanel } from "@/components/preflight/PreflightPanel";
import { MediaStudio } from "@/components/media/MediaStudio";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpenPlatformButton } from "@/components/posting/OpenPlatformButton";
import { PublishComposer } from "@/components/posting/PublishComposer";
import { ChangeView } from "@/components/review/ChangeView";
import { Input } from "@/components/ui/input";
import { Split } from "lucide-react";
import { SplitPlatformsDialog } from "./SplitPlatformsDialog";
import { formatHashtags, outboundText } from "@/lib/contentPresentation";
import { evaluateReadiness } from "@/lib/readiness";
import {
  Copy, Check, Download, Package, AlertTriangle, CheckCircle2, XCircle, ExternalLink, ShieldCheck, Save, ArrowRight,
} from "lucide-react";

const LIMITS: Record<string, number> = { linkedin: 3000, instagram: 2200, facebook: 63206 };
const MAX_HASHTAGS: Record<string, number> = { linkedin: 5, instagram: 30, facebook: 30 };

type Check = { level: "pass" | "warn" | "fail"; label: string; fix?: { label: string; to: string }[] };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildPackageText(card: PostCard, firstComment: string, notes: string, assets: { title: string; url: string | null }[]) {
  const lines = [
    `SOCIALMOTIVE POSTING PACKAGE`,
    `Platform: ${card.platform} · ${card.content_type}`,
    card.scheduled_for ? `Scheduled: ${new Date(card.scheduled_for).toLocaleString()}` : `Scheduled: not set`,
    "",
    "=== FINAL COPY ===",
    card.draft_copy,
    "",
    "=== HASHTAGS ===",
    formatHashtags(card.hashtags) || "(none)",
    "",
    "=== FIRST COMMENT ===",
    firstComment || "(none)",
    "",
    "=== TAGGING INSTRUCTIONS ===",
    `People: ${(card.people_tags ?? []).join(", ") || "(none)"}`,
    `Organizations: ${(card.org_tags ?? []).join(", ") || "(none)"}`,
    "",
    "=== MEDIA ===",
    ...(assets.length ? assets.map((a) => `- ${a.title}${a.url ? `: ${a.url}` : ""}`) : [card.suggested_asset_description ? `Suggested: ${card.suggested_asset_description}` : "(none)"]),
    "",
    "=== POSTING NOTES ===",
    notes || "(none)",
  ];
  return lines.join("\n");
}

export function PostingPackageDrawer({
  card, open, onOpenChange, canExport, onMarkExported, initialTab,
}: {
  initialTab?: "package" | "publish" | "schedule" | "preflight";
  card: PostCard | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  canExport: boolean;
  onMarkExported: (id: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const authoritative = useReadiness(card);
  const draftKey = `${user?.id}:${card?.client_id}:${card?.id}:package`;
  const [publishMode, setPublishMode] = useState<"now" | "schedule" | "manual">("now");
  const { canCreate, canManage, role, approvalRequired, preflightMode } = useWorkspace();
  const [splitOpen, setSplitOpen] = useState(false);
  const qc = useQueryClient();
  const [firstComment, setFirstComment] = useState("");
  const [notes, setNotes] = useState("");
  const [checksum, setChecksum] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openedPlatform, setOpenedPlatform] = useState(false);
  const [tab, setTab] = useState("package");
  const [postedUrl, setPostedUrl] = useState("");

  useEffect(() => { if (open) { setTab(initialTab === "schedule" ? "publish" : initialTab ?? "package"); setPublishMode(initialTab === "schedule" ? "schedule" : "now"); } }, [open, card?.id, initialTab]);

  useEffect(() => {
    const saved = readPackageDraft<{ firstComment?: string; notes?: string; postedUrl?: string }>(draftKey, {});
    setFirstComment(saved.firstComment ?? card?.first_comment ?? "");
    setNotes(saved.notes ?? card?.posting_notes ?? "");
    setPostedUrl(saved.postedUrl ?? "");
  }, [card?.id]);

  useEffect(() => { if (card) writePackageDraft(draftKey, { firstComment, notes, postedUrl }); }, [firstComment, notes, postedUrl]);
  const refs = card?.source_references ?? [];
  const { data: assets = [] } = useQuery({
    queryKey: ["package_assets", card?.id, refs.join(",")],
    enabled: open && refs.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_assets").select("id,title,file_path,external_url,asset_type,permission_state").in("id", refs);
      if (error) throw error;
      return Promise.all((data ?? []).map(async (a) => {
        let url: string | null = a.external_url;
        if (a.file_path) {
          const { data: s } = await supabase.storage.from("source-assets").createSignedUrl(a.file_path, 60 * 60 * 24);
          url = s?.signedUrl ?? url;
        }
        return { ...a, url };
      }));
    },
  });

  const packageText = useMemo(
    () => (card ? buildPackageText(card, firstComment, notes, assets.map((a) => ({ title: a.title, url: a.url }))) : ""),
    [card, firstComment, notes, assets],
  );

  useEffect(() => { if (packageText) sha256(packageText).then((h) => setChecksum(h.slice(0, 12))); }, [packageText]);

  const checks: Check[] = useMemo(() => {
    if (!card) return [];
    const c: Check[] = [];
    const edit = { label: "Fix in Daily Queue", to: `/queue?post=${card.id}&edit=1` };
    const limit = LIMITS[card.platform] ?? 3000;
    const len = card.draft_copy.length;
    c.push(len > limit
      ? { level: "fail", label: `Copy is ${len}/${limit} characters — over the ${card.platform} limit`, fix: [edit] }
      : { level: "pass", label: `Copy length ${len}/${limit}` });
    const tags = card.hashtags?.length ?? 0;
    const maxTags = MAX_HASHTAGS[card.platform] ?? 30;
    c.push(tags > maxTags
      ? { level: "warn", label: `${tags} hashtags — recommended max ${maxTags}`, fix: [edit] }
      : { level: "pass", label: `${tags} hashtag${tags === 1 ? "" : "s"}` });
    const needsMedia = card.platform === "instagram" || ["story", "reel", "carousel"].includes(card.content_type);
    if (needsMedia && assets.length === 0) {
      c.push(card.suggested_asset_description
        ? { level: "warn", label: "No media attached — only a suggested asset description", fix: [{ ...edit, label: "Attach media" }, { label: "Asset Library", to: "/assets" }] }
        : { level: "fail", label: "Visual format with no media attached", fix: [{ ...edit, label: "Attach media" }, { label: "Asset Library", to: "/assets" }] });
    } else c.push({ level: "pass", label: assets.length ? `${assets.length} media file${assets.length === 1 ? "" : "s"} attached` : "No media required" });
    const blocked = assets.filter((a) => a.permission_state !== "generation_allowed");
    if (blocked.length) c.push({ level: "warn", label: `${blocked.length} asset(s) not cleared for use (${blocked.map((b) => b.permission_state).join(", ")})`, fix: [{ label: "Review in Asset Library", to: "/assets" }] });
    if (card.approval_status === "approved" || card.approval_status === "exported" || card.approval_status === "posted")
      c.push({ level: "pass", label: "Approved through review" });
    else if (!approvalRequired) c.push({ level: "pass", label: "Approval optional in this workspace" });
    else c.push({ level: "fail", label: "Not yet approved", fix: [{ label: "Review in Daily Queue", to: `/queue?post=${card.id}` }] });
    if (!card.scheduled_for) c.push({ level: "warn", label: "No scheduled time set", fix: [{ label: "Schedule", to: "#schedule" }] });
    return c;
  }, [card, assets]);

  const pf = usePreflight(card);
  const preflightFail = card && !pf.gate.clear ? 1 : 0;
  const failCount = checks.filter((c) => c.level === "fail").length + preflightFail;

  if (!card) return null;
  const readiness = authoritative.data ?? { label: authoritative.isError ? "Checks unavailable" : "Checks pending", tone: "pending", required: 0, advisory: 0, canDeliver: false };
  const otherFails = checks.filter((c) => c.level === "fail").length;
  const postReason = approvalRequired && !["approved", "exported", "posted"].includes(card.approval_status)
    ? "Approve first"
    : failCount > 0 ? `Fix ${failCount} blocking issue${failCount === 1 ? "" : "s"} first` : null;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => toast({ title: "Copy failed", description: "Try again or select the text manually.", variant: "destructive" }));
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
    toast({ title: "Copied" });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("post_cards")
      .update({ first_comment: firstComment || null, posting_notes: notes || null }).eq("id", card.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["post_cards"] });
    toast({ title: "Package saved" });
  };

  const download = () => {
    const blob = new Blob([`${packageText}\n\nChecksum: ${checksum}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SocialMotive-${card.platform}-${card.content_type}-${checksum}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const markPosted = async () => {
    const url = postedUrl.trim();
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) return toast({ title: "That link doesn't look right", description: "Your text was kept. Paste the full post link starting with https://, or leave it blank.", variant: "destructive" });
    if (saving) return;
    setSaving(true);
    const { error } = await supabase.rpc("mark_posted_manual", { _post: card.id, _url: postedUrl.trim() || undefined });
    setSaving(false);
    if (error) return toast({ title: "Couldn't mark as posted", description: error.message, variant: "destructive" });
    toast({ title: "Marked as posted" });
    setOpenedPlatform(false);
    qc.invalidateQueries();
  };

  const markExported = async () => {
    const { error } = await supabase.from("post_cards").update({
      first_comment: firstComment || null, posting_notes: notes || null,
      package_checksum: checksum, package_generated_at: new Date().toISOString(),
    }).eq("id", card.id);
    if (error) return toast({ title: "Export failed", description: error.message, variant: "destructive" });
    await onMarkExported(card.id);
    onOpenChange(false);
  };

  const Section = ({ title, copyText, k, children }: { title: string; copyText?: string; k: string; children: React.ReactNode }) => (
    <div className="sm-package-section space-y-2" data-section={k}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        {copyText ? (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={() => copy(copyText, k)}>
            {copied === k ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />} Copy
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm-package-drawer w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="sm-package-header">
          <SheetTitle className="flex items-center gap-2"><PlatformIcon platform={card.platform} className="h-5 w-5" /> Posting Package · {postLabel(card)}</SheetTitle>
          <SheetDescription className="capitalize">{card.platform} · {card.content_type}
            {card.scheduled_for && ` · ${new Date(card.scheduled_for).toLocaleString()}`}</SheetDescription>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/review?post=${card.id}`); toast({ title: "Executive review link copied" }); }}>
              Copy executive review link
            </Button>
            <Button variant="outline" size="sm" className="mt-2 w-fit" disabled={!approvalRequired || !["owner", "admin", "editor"].includes(role ?? "") || saving || card.is_sample || ["in_review", "posted", "archived"].includes(card.approval_status)} title={!approvalRequired ? "Executive Review is off in Setup" : card.approval_status === "in_review" ? "Already sent for review" : "Send this post for Executive Review"} onClick={async () => {
              if (saving) return; setSaving(true);
              const { error } = await supabase.from("post_cards").update({ approval_status: "in_review", updated_by: user?.id }).eq("id", card.id).neq("approval_status", "in_review");
              setSaving(false);
              if (error) toast({ title: "Could not send for review", description: error.message, variant: "destructive" });
              else { toast({ title: "Sent for Executive Review" }); qc.invalidateQueries({ queryKey: ["post_cards"] }); }
            }}>Send for Executive Review</Button>
            {!approvalRequired && <Link className="text-xs underline" to="/setup">Executive Review is off · Setup</Link>}
            {canCreate && (
              <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={() => setSplitOpen(true)}>
                <Split className="mr-2 h-4 w-4" /> Split across platforms
              </Button>
            )}
          </div>
        </SheetHeader>
        {splitOpen && <SplitPlatformsDialog card={card} open={splitOpen} onOpenChange={setSplitOpen} />}

        <Tabs value={tab} onValueChange={setTab} className="mt-5">
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
            <TabsTrigger value="package" className="flex-1 shrink-0">Posting package</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 shrink-0">Native preview</TabsTrigger>
            <TabsTrigger value="preflight" className="flex-1 shrink-0">Preflight</TabsTrigger>
            <TabsTrigger value="changes" className="flex-1 shrink-0">Changes</TabsTrigger>
            <TabsTrigger value="media" className="flex-1 shrink-0">AI media</TabsTrigger>
            <TabsTrigger value="publish" className="flex-1 shrink-0">Publish</TabsTrigger>
          </TabsList>
          <TabsContent value="changes" className="mt-4">
            <ChangeView card={card} />
          </TabsContent>
          <TabsContent value="media" className="mt-4">
            <MediaStudio key={card.id} clientId={card.client_id} postCardId={card.id} platform={card.platform} canCreate={canCreate} defaultPrompt={card.suggested_asset_description ?? ""} />
          </TabsContent>
          <TabsContent value="publish" className="mt-4">
            <PublishComposer key={card.id} card={card} canPublish={canExport && ["owner", "admin", "editor", "reviewer"].includes(role ?? "")} initialMode={publishMode} />
          </TabsContent>
          <TabsContent value="preflight" className="mt-4">
            <PreflightPanel pf={pf} isAdmin={canExport} draft={card.draft_copy} />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <NativePostPreview key={card.id} card={card} enabled={open} firstComment={firstComment} />
          </TabsContent>
          <TabsContent value="package" className="space-y-5 mt-5">
          <div className={`rounded-lg border p-3 space-y-1.5 ${failCount ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" /> {otherFails ? `${readiness.label} · ${otherFails} other issue${otherFails > 1 ? "s" : ""} to fix` : readiness.label}
            </div>
            {readiness.tone === "ready"
              ? <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /><span className="text-muted-foreground">Preflight checks passed for this version</span></div>
              : <div className="flex flex-wrap items-center gap-2 text-xs">{readiness.tone === "blocked" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <AlertTriangle className="h-3.5 w-3.5 text-accent" />}
                  <span>{readiness.tone === "blocked" ? `${readiness.required} required Preflight check${readiness.required === 1 ? "" : "s"} remain. A good Motive Score doesn't replace them.` : readiness.tone === "pending" ? "Preflight hasn't checked this version yet." : readiness.tone === "advisory" ? "Advisory notes only — they don't block publishing." : "Not approved yet."}</span>
                  <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => setTab("preflight")}>Open Preflight</Button></div>}
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {c.level === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> :
                  c.level === "warn" ? <AlertTriangle className="h-3.5 w-3.5 text-accent" /> :
                    <XCircle className="h-3.5 w-3.5 text-destructive" />}
                <span className={c.level === "pass" ? "text-muted-foreground" : ""}>{c.label}</span>
                {c.level !== "pass" && c.fix?.map((f) => f.to === "#schedule" ? (
                  <button key={f.label} type="button" onClick={() => { setPublishMode("schedule"); setTab("publish"); }} className="text-primary underline underline-offset-2 hover:no-underline">{f.label}</button>
                ) : (
                  <Link key={f.label} to={f.to} onClick={() => onOpenChange(false)} className="text-primary underline underline-offset-2 hover:no-underline">{f.label}</Link>
                ))}
              </div>
            ))}
          </div>

          <Section title="Final copy" copyText={card.draft_copy} k="copy">
            <p className="text-sm whitespace-pre-wrap leading-relaxed rounded-md bg-muted/30 p-3 max-h-72 overflow-y-auto">{card.draft_copy}</p>
          </Section>

          <Section title="Hashtags" copyText={formatHashtags(card.hashtags) || undefined} k="tags">
            <p className="text-sm text-primary/80">{formatHashtags(card.hashtags) || <span className="text-muted-foreground">None</span>}</p>
          </Section>

          <Section title="First comment" copyText={firstComment || undefined} k="first">
            <Textarea value={firstComment} onChange={(e) => setFirstComment(e.target.value)} rows={3}
              placeholder="Optional — e.g. link, extra context, or hashtags to post as the first comment" />
          </Section>

          <details><summary className="text-sm font-semibold cursor-pointer">Tagging instructions</summary>
          <Section title="Tags" k="tagging"
            copyText={[...(card.people_tags ?? []), ...(card.org_tags ?? [])].join(" ") || undefined}>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">People:</span> {(card.people_tags ?? []).join(", ") || "—"}</p>
              <p><span className="text-muted-foreground">Organizations:</span> {(card.org_tags ?? []).join(", ") || "—"}</p>
              <p className="text-xs text-muted-foreground">Copied names may need to be re-selected on the platform to become linked mentions.</p>
            </div>
          </Section>

          </details>
          <Section title="Media" k="media">
            {assets.length ? (
              <div className="space-y-1.5">
                {assets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm rounded-md border border-border/40 px-3 py-2">
                    <span className="truncate">{a.title} <Badge variant="outline" className="ml-1 text-[10px]">{a.asset_type}</Badge></span>
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1 shrink-0">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">{card.suggested_asset_description || "No media attached."}</p>
            )}
          </Section>

          <Section title="Posting notes" k="notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Anything the person posting should know (timing, crop, who to notify)" />
          </Section>

          <Separator />

          {card.package_checksum && card.package_checksum !== checksum && (
            <p className="text-xs text-muted-foreground">This package changed since it was last exported.</p>
          )}

          <div className="sm-package-actions flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => copy(packageText, "all")}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy full package
            </Button>
            <Button variant="outline" size="sm" onClick={download}><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
            <span title={postReason ?? "Copies caption + hashtags and opens the platform. You post it yourself."}>
              <OpenPlatformButton clientId={card.client_id} platform={card.platform} variant="default"
                disabled={!!postReason}
                copyText={outboundText(card.draft_copy, card.hashtags)}
                onOpened={() => setOpenedPlatform(true)} />
            </span>
            <Button variant="ghost" size="sm" onClick={save} disabled={saving || !["owner", "admin", "editor", "reviewer"].includes(role ?? "")}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
            {canExport && card.approval_status === "approved" && (
              <Button size="sm" className="ml-auto" disabled={failCount > 0} onClick={markExported}>
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Mark exported
              </Button>
            )}
          </div>

          {canExport && !card.is_sample && ["approved", "exported"].includes(card.approval_status) && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">{openedPlatform ? "Posted it?" : "Already posted it yourself?"}</p>
              <p className="text-xs text-muted-foreground">Marking as posted records your confirmation. It doesn't publish anything or verify delivery.</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input className="h-8 flex-1 min-w-[200px]" placeholder="Live post link (optional)"
                  value={postedUrl} onChange={(e) => setPostedUrl(e.target.value)} />
                <Button size="sm" variant="outline" disabled={saving} onClick={markPosted}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark as posted
                </Button>
              </div>
            </div>
          )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
