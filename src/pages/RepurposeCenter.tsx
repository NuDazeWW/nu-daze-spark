import { formatHashtags } from "@/lib/contentPresentation";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Repeat2, Sparkles, Loader2, ArrowRight, X, Send, FileText, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClient } from "@/contexts/ClientContext";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { postLabel } from "@/components/tracking/PostTracking";

const TYPE_LABEL: Record<string, string> = {
  repost_as_is: "Evergreen repost",
  cross_platform_rewrite: "Cross-platform rewrite",
  excerpt_quote: "Quote / excerpt",
  story_adaptation: "Story adaptation",
  reel_adaptation: "Reel adaptation",
  linkedin_to_instagram: "LinkedIn → Instagram",
  instagram_to_linkedin: "Instagram → LinkedIn",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Suggestion = {
  id: string; repurpose_type: string; target_platform: string; target_content_type: string; rationale: string;
  draft_copy: string | null; hashtags: string[]; source_excerpt: string | null; is_actioned: boolean; dismissed: boolean;
  source_post_card_id: string | null; source_asset_id: string | null; result_post_card_id: string | null; created_at: string;
};

export default function RepurposeCenter() {
  const { activeClientId } = useActiveClient();
  const { user } = useAuth();
  const ws = useWorkspace();
  const canCreate = ws.canCreate;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Suggestion | null>(null);
  const [draft, setDraft] = useState("");
  const [tags, setTags] = useState("");

  const sourcesQ = useQuery({
    queryKey: ["repurpose_sources", activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const [posts, assets] = await Promise.all([
        supabase.from("post_cards").select("id,post_number,platform,content_type,draft_copy,approval_status,created_at,source_references")
          .eq("is_sample", false).eq("client_id", activeClientId!).in("approval_status", ["approved", "exported", "posted"]).neq("content_type", "comment")
          .order("created_at", { ascending: false }).limit(60),
        supabase.from("source_assets").select("id,title,asset_type,description,created_at")
          .eq("client_id", activeClientId!).eq("permission_state", "generation_allowed").is("deleted_at", null)
          .order("created_at", { ascending: false }).limit(60),
      ]);
      if (posts.error) throw posts.error;
      if (assets.error) throw assets.error;
      return { posts: posts.data ?? [], assets: assets.data ?? [] };
    },
  });

  const suggQ = useQuery({
    queryKey: ["repurpose_suggestions", activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("repurpose_suggestions").select("*")
        .eq("client_id", activeClientId!).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as unknown as Suggestion[];
    },
  });

  const posts = sourcesQ.data?.posts ?? [];
  const assets = sourcesQ.data?.assets ?? [];
  const postById = useMemo(() => Object.fromEntries(posts.map((p) => [p.id, p])), [posts]);
  const assetById = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);
  const all = suggQ.data ?? [];
  const open = all.filter((s) => !s.is_actioned && !s.dismissed);
  const done = all.filter((s) => s.is_actioned);
  const countFor = (kind: "post" | "asset", id: string) =>
    open.filter((s) => (kind === "post" ? s.source_post_card_id : s.source_asset_id) === id).length;

  const scan = async (kind: "post" | "asset", id: string) => {
    if (scanning) return;
    setScanning(id);
    const { data, error } = await supabase.functions.invoke("repurpose-content", { body: { source_kind: kind, source_id: id } });
    setScanning(null);
    if (error || data?.error) {
      let msg = data?.error as string | undefined;
      try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      toast.error("Couldn't find ideas", { description: `${msg ?? "The idea service didn't respond."} Nothing was changed — try again in a moment.` });
      return;
    }
    if (!data?.created) { toast.info("No new ideas for this source", { description: "Try a different post or asset." }); return; }
    toast.success(`${data.created} repurpose idea${data.created === 1 ? "" : "s"} ready to review`);
    qc.invalidateQueries({ queryKey: ["repurpose_suggestions", activeClientId] });
  };

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repurpose_suggestions").update({ dismissed: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repurpose_suggestions", activeClientId] }),
  });

  const sendToQueue = useMutation({
    mutationFn: async (s: Suggestion) => {
      if (!user || !canCreate) throw new Error("Your role cannot create a draft");
      const src = s.source_post_card_id ? postById[s.source_post_card_id] : null;
      const asset = s.source_asset_id ? assetById[s.source_asset_id] : null;
      const refs = asset ? [asset.id] : src?.source_references ?? [];
      const { data: card, error } = await supabase.from("post_cards").insert({
        client_id: activeClientId, created_by: user!.id, platform: s.target_platform as any,
        content_type: s.target_content_type as any, draft_copy: draft, approval_status: "draft",
        hashtags: tags.split(/[\s,]+/).map((t) => t.replace(/^#/, "")).filter(Boolean),
        rationale: `${TYPE_LABEL[s.repurpose_type]}: ${s.rationale}`, source_references: refs,
        repurposed_from_id: s.source_post_card_id,
      } as any).select("id").single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("repurpose_suggestions")
        .update({ is_actioned: true, result_post_card_id: card.id } as any).eq("id", s.id);
      if (e2) throw e2;
      return card.id as string;
    },
    onSuccess: (id) => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["repurpose_suggestions", activeClientId] });
      qc.invalidateQueries({ queryKey: ["post_cards"] });
      toast.success("Draft added to Daily Queue", { action: { label: "Open it", onClick: () => navigate(`/queue?post=${id}`) } });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not add draft"),
  });

  const openEdit = (s: Suggestion) => {
    setEditing(s); setDraft(s.draft_copy ?? ""); setTags(formatHashtags(s.hashtags));
  };

  const sourceLabel = (s: Suggestion) => {
    if (s.source_post_card_id) { const p = postById[s.source_post_card_id]; return p ? postLabel(p as any) : "Approved post"; }
    if (s.source_asset_id) { const a = assetById[s.source_asset_id]; return a ? a.title : "Asset"; }
    return "Source";
  };

  const q = filter.toLowerCase();
  const fPosts = posts.filter((p) => !q || p.draft_copy.toLowerCase().includes(q) || postLabel(p as any).toLowerCase().includes(q));
  const fAssets = assets.filter((a) => !q || a.title.toLowerCase().includes(q));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Repurpose Center"
        description="Turn approved posts and cleared assets into new drafts — quotes, Stories, Reels, and cross-platform rewrites."
      />

      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
        {/* Sources */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold">1. Pick something to reuse</h2>
          </div>
          <Input placeholder="Search posts or assets…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <Tabs defaultValue="posts">
            <TabsList className="w-full">
              <TabsTrigger value="posts" className="flex-1">Approved posts ({posts.length})</TabsTrigger>
              <TabsTrigger value="assets" className="flex-1">Assets ({assets.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="space-y-2 max-h-[560px] overflow-y-auto">
              {fPosts.length === 0 && <p className="text-sm text-muted-foreground p-3">No approved posts yet.</p>}
              {fPosts.map((p) => (
                <SourceRow key={p.id} icon={FileText} title={postLabel(p as any)} meta={`${cap(p.platform)} · ${p.content_type}`}
                  text={p.draft_copy} count={countFor("post", p.id)} busy={scanning === p.id} disabled={!canCreate || !!scanning}
                  onScan={() => scan("post", p.id)} />
              ))}
            </TabsContent>
            <TabsContent value="assets" className="space-y-2 max-h-[560px] overflow-y-auto">
              {fAssets.length === 0 && <p className="text-sm text-muted-foreground p-3">No assets cleared for generation.</p>}
              {fAssets.map((a) => (
                <SourceRow key={a.id} icon={ImageIcon} title={a.title} meta={a.asset_type.replace("_", " ")}
                  text={a.description ?? ""} count={countFor("asset", a.id)} busy={scanning === a.id} disabled={!canCreate || !!scanning}
                  onScan={() => scan("asset", a.id)} />
              ))}
            </TabsContent>
          </Tabs>
          {!canCreate && <p className="text-xs text-muted-foreground">Your role can view ideas but not create drafts.</p>}
        </Card>

        {/* Suggestions */}
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold">2. Review ideas ({open.length})</h2>
          {open.length === 0 ? (
            <EmptyState icon={Repeat2} title="No ideas waiting" description="Click “Find ideas” on any approved post or asset to get 3–5 ready-to-edit repurpose drafts." />
          ) : open.map((s) => (
            <Card key={s.id} className="sm-content-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{TYPE_LABEL[s.repurpose_type] ?? s.repurpose_type}</Badge>
                  <Badge variant="secondary">{cap(s.target_platform)} · {s.target_content_type}</Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">from {sourceLabel(s)}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Dismiss idea" disabled={!canCreate} onClick={() => dismiss.mutate(s.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="font-display text-lg font-semibold">{TYPE_LABEL[s.repurpose_type] ?? "Repurpose idea"}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.rationale}</p>
              <p className="text-sm whitespace-pre-line line-clamp-4">{s.draft_copy}</p>
              {s.source_excerpt && <p className="text-xs border-l-2 border-border pl-2 text-muted-foreground italic line-clamp-2">Source: “{s.source_excerpt}”</p>}
              <div className="flex justify-end">
                <Button size="sm" disabled={!canCreate} onClick={() => openEdit(s)}>
                  Review & send to queue <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          ))}

          {done.length > 0 && (
            <details className="pt-2">
              <summary className="text-sm text-muted-foreground cursor-pointer">Sent to queue ({done.length})</summary>
              <div className="space-y-1 mt-2">
                {done.map((s) => (
                  <button key={s.id} className="w-full text-left text-sm flex items-center justify-between rounded-md border border-border/50 px-3 py-2 hover:bg-secondary/50"
                    onClick={() => s.result_post_card_id && navigate(`/queue?post=${s.result_post_card_id}`)}>
                    <span>{TYPE_LABEL[s.repurpose_type]} · {cap(s.target_platform)} — from {sourceLabel(s)}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing && `${TYPE_LABEL[editing.repurpose_type]} · ${cap(editing.target_platform)} ${editing.target_content_type}`}</DialogTitle>
            <DialogDescription>Edit as needed. It goes to the Daily Queue as a Draft and still needs Preflight and approval.</DialogDescription>
          </DialogHeader>
          <Textarea rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#hashtags" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={!draft.trim() || sendToQueue.isPending} onClick={() => editing && sendToQueue.mutate(editing)}>
              {sendToQueue.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send to Daily Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SourceRow({ icon: Icon, title, meta, text, count, busy, disabled, onScan }: {
  icon: React.ElementType; title: string; meta: string; text: string; count: number; busy: boolean; disabled: boolean; onScan: () => void;
}) {
  return (
    <div className="rounded-md border border-border/60 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{title}</span>
        </span>
        <span className="font-mono text-[11px] text-muted-foreground capitalize shrink-0">{meta}</span>
      </div>
      {text && <p className="text-xs text-muted-foreground line-clamp-2">{text}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{count ? `${count} idea${count === 1 ? "" : "s"} waiting` : ""}</span>
        <Button size="sm" variant="ai" disabled={disabled} onClick={onScan}>
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
          {busy ? "Thinking…" : "Find ideas"}
        </Button>
      </div>
    </div>
  );
}
