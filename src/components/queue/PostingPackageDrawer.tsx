import { useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy, Check, Download, Package, AlertTriangle, CheckCircle2, XCircle, ExternalLink, ShieldCheck, Save, ArrowRight,
} from "lucide-react";

const LIMITS: Record<string, number> = { linkedin: 3000, instagram: 2200 };
const MAX_HASHTAGS: Record<string, number> = { linkedin: 5, instagram: 30 };

type Check = { level: "pass" | "warn" | "fail"; label: string };

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
    (card.hashtags ?? []).join(" ") || "(none)",
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
  card, open, onOpenChange, canExport, onMarkExported,
}: {
  card: PostCard | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  canExport: boolean;
  onMarkExported: (id: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [firstComment, setFirstComment] = useState("");
  const [notes, setNotes] = useState("");
  const [checksum, setChecksum] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstComment(card?.first_comment ?? "");
    setNotes(card?.posting_notes ?? "");
  }, [card?.id]);

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
    const limit = LIMITS[card.platform] ?? 3000;
    const len = card.draft_copy.length;
    c.push(len > limit
      ? { level: "fail", label: `Copy is ${len}/${limit} characters — over the ${card.platform} limit` }
      : { level: "pass", label: `Copy length ${len}/${limit}` });
    const tags = card.hashtags?.length ?? 0;
    const maxTags = MAX_HASHTAGS[card.platform] ?? 30;
    c.push(tags > maxTags
      ? { level: "warn", label: `${tags} hashtags — recommended max ${maxTags}` }
      : { level: "pass", label: `${tags} hashtag${tags === 1 ? "" : "s"}` });
    const needsMedia = card.platform === "instagram" || ["story", "reel", "carousel"].includes(card.content_type);
    if (needsMedia && assets.length === 0) {
      c.push(card.suggested_asset_description
        ? { level: "warn", label: "No media attached — only a suggested asset description" }
        : { level: "fail", label: "Visual format with no media attached" });
    } else c.push({ level: "pass", label: assets.length ? `${assets.length} media file${assets.length === 1 ? "" : "s"} attached` : "No media required" });
    const blocked = assets.filter((a) => a.permission_state !== "generation_allowed");
    if (blocked.length) c.push({ level: "warn", label: `${blocked.length} asset(s) not cleared for use (${blocked.map((b) => b.permission_state).join(", ")})` });
    if (card.approval_status === "approved" || card.approval_status === "exported" || card.approval_status === "posted")
      c.push({ level: "pass", label: "Approved through review" });
    else c.push({ level: "fail", label: "Not yet approved" });
    if (!card.scheduled_for) c.push({ level: "warn", label: "No scheduled time set" });
    return c;
  }, [card, assets]);

  const pf = usePreflight(card);
  const preflightFail = card && !pf.gate.clear ? 1 : 0;
  const failCount = checks.filter((c) => c.level === "fail").length + preflightFail;

  if (!card) return null;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
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
    <div className="space-y-2">
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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Posting Package</SheetTitle>
          <SheetDescription className="capitalize">{card.platform} · {card.content_type}
            {card.scheduled_for && ` · ${new Date(card.scheduled_for).toLocaleString()}`}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="package" className="mt-5">
          <TabsList className="w-full">
            <TabsTrigger value="package" className="flex-1">Posting package</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">Native preview</TabsTrigger>
            <TabsTrigger value="preflight" className="flex-1">Preflight</TabsTrigger>
          </TabsList>
          <TabsContent value="preflight" className="mt-4">
            <PreflightPanel pf={pf} isAdmin={canExport} />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <NativePostPreview key={card.id} card={card} enabled={open} firstComment={firstComment} />
          </TabsContent>
          <TabsContent value="package" className="space-y-5 mt-5">
          <div className={`rounded-lg border p-3 space-y-1.5 ${failCount ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" /> {failCount ? `${failCount} blocking issue${failCount > 1 ? "s" : ""}` : "Ready to post"}
            </div>
            {card && (pf.gate.clear
              ? <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /><span className="text-muted-foreground">Preflight cleared</span></div>
              : <div className="flex items-center gap-2 text-xs"><XCircle className="h-3.5 w-3.5 text-destructive" /><span>Preflight not cleared ({pf.gate.state}) — see Preflight tab</span></div>)}
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {c.level === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> :
                  c.level === "warn" ? <AlertTriangle className="h-3.5 w-3.5 text-accent" /> :
                    <XCircle className="h-3.5 w-3.5 text-destructive" />}
                <span className={c.level === "pass" ? "text-muted-foreground" : ""}>{c.label}</span>
              </div>
            ))}
          </div>

          <Section title="Final copy" copyText={card.draft_copy} k="copy">
            <p className="text-sm whitespace-pre-wrap leading-relaxed rounded-md bg-muted/30 p-3 max-h-72 overflow-y-auto">{card.draft_copy}</p>
          </Section>

          <Section title="Hashtags" copyText={(card.hashtags ?? []).join(" ")} k="tags">
            <p className="text-sm text-primary/80">{(card.hashtags ?? []).join(" ") || <span className="text-muted-foreground">None</span>}</p>
          </Section>

          <Section title="First comment" copyText={firstComment} k="first">
            <Textarea value={firstComment} onChange={(e) => setFirstComment(e.target.value)} rows={3}
              placeholder="Optional — e.g. link, extra context, or hashtags to post as the first comment" />
          </Section>

          <Section title="Tagging instructions" k="tagging"
            copyText={[...(card.people_tags ?? []), ...(card.org_tags ?? [])].join(" ")}>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">People:</span> {(card.people_tags ?? []).join(", ") || "—"}</p>
              <p><span className="text-muted-foreground">Organizations:</span> {(card.org_tags ?? []).join(", ") || "—"}</p>
              <p className="text-xs text-muted-foreground">Type each tag manually in the post so the platform links the profile.</p>
            </div>
          </Section>

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

          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>Checksum {checksum}</span>
            {card.package_checksum && <span>Last exported {card.package_checksum}{card.package_checksum !== checksum && " · changed since"}</span>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => copy(packageText, "all")}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy full package
            </Button>
            <Button variant="outline" size="sm" onClick={download}><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
            <Button variant="ghost" size="sm" onClick={save} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
            {canExport && card.approval_status === "approved" && (
              <Button size="sm" className="ml-auto" disabled={failCount > 0} onClick={markExported}>
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Mark exported
              </Button>
            )}
          </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
