import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAssets, type SourceAsset } from "@/hooks/useAssets";
import { AssetFormDialog, defaultAssetForm, type AssetFormData } from "@/components/assets/AssetFormDialog";
import { BulkUploadDialog } from "@/components/assets/BulkUploadDialog";
import { ReelCreatorDialog } from "@/components/assets/ReelCreatorDialog";
import { AssetLightbox } from "@/components/assets/AssetLightbox";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { ExpirationAlerts } from "@/components/assets/ExpirationAlerts";
import { DeleteConfirmDialog } from "@/components/strategy/DeleteConfirmDialog";
import { useBulkReelUpload } from "@/hooks/useBulkReelUpload";
import { useDuplicateDetection } from "@/hooks/useDuplicateDetection";
import { useAssetUsage } from "@/hooks/useAssetUsage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  FolderOpen, Plus, Pencil, Trash2, Search, AlertCircle, Download, Eye,
  Image, Video, FileText, Link2, Type, Presentation, Quote, BookOpen,
  CalendarClock, Sparkles, Film, Undo2, Archive, Trash, Calendar, Users, PartyPopper,
  Tags, BarChart3,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const ASSET_TYPE_ICON: Record<string, React.ElementType> = {
  image: Image, video: Video, pdf: FileText, link: Link2,
  text_snippet: Type, deck: Presentation, testimonial: Quote, case_study: BookOpen,
};

const PERMISSION_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  generation_allowed: { label: "Gen Allowed", variant: "default" },
  summarization_only: { label: "Summary Only", variant: "secondary" },
  blocked: { label: "Blocked", variant: "destructive" },
  archived: { label: "Archived", variant: "outline" },
};

export default function AssetLibrary() {
  const {
    assets, trashedAssets, summaryMap, isLoading, error, isAdmin,
    insert, update, softDelete, restore, permanentDelete, uploadFile, downloadAsset,
    isInserting, isUpdating, isDeleting, isRestoring, isPermanentDeleting,
  } = useAssets();

  const { uploadAndCreateReels, isPending: isBulkPending, progress: bulkProgress } = useBulkReelUpload();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reelCreatorOpen, setReelCreatorOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SourceAsset | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [viewingAsset, setViewingAsset] = useState<SourceAsset | null>(null);
  const [form, setForm] = useState<AssetFormData>(defaultAssetForm);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPermission, setFilterPermission] = useState("all");
  const [showTrash, setShowTrash] = useState(false);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && a.asset_type !== filterType) return false;
      if (filterPermission !== "all" && a.permission_state !== filterPermission) return false;
      return true;
    });
  }, [assets, search, filterType, filterPermission]);

  const handleSoftDelete = useCallback(async (asset: SourceAsset) => {
    await softDelete(asset.id);
    toast(`"${asset.title}" moved to trash`, {
      description: "You can restore it from the trash bin.",
      action: {
        label: "Undo",
        onClick: () => restore(asset.id),
      },
      duration: 8000,
    });
  }, [softDelete, restore]);

  const openCreate = () => { setEditing(null); setForm(defaultAssetForm); setFormOpen(true); };

  const openEdit = (a: SourceAsset) => {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description ?? "",
      asset_type: a.asset_type,
      permission_state: a.permission_state,
      is_nudaze_origin: a.is_nudaze_origin,
      external_url: a.external_url ?? "",
      text_content: a.text_content ?? "",
      expires_at: a.expires_at ? a.expires_at.split("T")[0] : "",
      file: null,
      content_date: (a as any).content_date ?? "",
      is_event: (a as any).is_event ?? false,
      event_name: (a as any).event_name ?? "",
      contributors: (a as any).contributors ?? [],
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let file_path = editing?.file_path ?? null;
      if (form.file) file_path = await uploadFile(form.file);
      const payload: Record<string, unknown> = {
        title: form.title, description: form.description || null,
        asset_type: form.asset_type, permission_state: form.permission_state,
        is_nudaze_origin: form.is_nudaze_origin, external_url: form.external_url || null,
        text_content: form.text_content || null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null, file_path,
        content_date: form.content_date || null,
        is_event: form.is_event,
        event_name: form.is_event ? form.event_name || null : null,
        contributors: form.contributors,
      };
      if (editing) await update({ id: editing.id, ...payload } as never);
      else await insert(payload as never);
      setFormOpen(false);
    } finally { setSubmitting(false); }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Asset Library" description="Manage uploaded source assets, permissions, and summaries." />
        <div className="space-y-3 py-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Asset Library" description="Manage uploaded source assets, permissions, and summaries." />
        <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription>Failed to load assets: {error.message}</AlertDescription></Alert>
      </div>
    );
  }

  const isExpired = (a: SourceAsset) => a.expires_at && new Date(a.expires_at) < new Date();

  return (
    <div className="animate-fade-in">
      <PageHeader title="Asset Library" description="Manage uploaded source assets, permissions, and summaries." />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets…" className="pl-9" />
        </div>
        {!showTrash && (
          <>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="text_snippet">Text Snippet</SelectItem>
                <SelectItem value="deck">Deck</SelectItem>
                <SelectItem value="testimonial">Testimonial</SelectItem>
                <SelectItem value="case_study">Case Study</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPermission} onValueChange={setFilterPermission}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="All permissions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Permissions</SelectItem>
                <SelectItem value="generation_allowed">Gen Allowed</SelectItem>
                <SelectItem value="summarization_only">Summary Only</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        <Button
          variant={showTrash ? "default" : "outline"}
          onClick={() => setShowTrash(!showTrash)}
          className="relative"
        >
          <Trash className="mr-2 h-4 w-4" />
          {showTrash ? "Back to Library" : "Trash"}
          {trashedAssets.length > 0 && !showTrash && (
            <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1.5 text-[10px]">
              {trashedAssets.length}
            </Badge>
          )}
        </Button>
        {!showTrash && isAdmin && (
          <>
            <Button variant="outline" onClick={() => setReelCreatorOpen(true)}><Film className="mr-2 h-4 w-4" />Create Video Reel</Button>
            <Button variant="outline" onClick={() => setBulkOpen(true)}><Sparkles className="mr-2 h-4 w-4" />AI Reel Cards</Button>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Asset</Button>
          </>
        )}
      </div>

      {/* Trash View */}
      {showTrash ? (
        trashedAssets.length === 0 ? (
          <EmptyState icon={Trash} title="Trash is empty" description="Deleted assets will appear here for recovery." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {trashedAssets.map((asset) => {
              const Icon = ASSET_TYPE_ICON[asset.asset_type] ?? FileText;
              return (
                <Card key={asset.id} className="border-destructive/30 opacity-80">
                  <CardHeader className="py-3 px-4 flex-row items-start justify-between space-y-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <CardTitle className="text-sm font-semibold truncate">{asset.title}</CardTitle>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => restore(asset.id)} disabled={isRestoring} title="Restore">
                        <Undo2 className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => setPermanentDeleteId(asset.id)} title="Delete permanently">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0 space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs capitalize">{asset.asset_type.replace("_", " ")}</Badge>
                      <Badge variant="destructive" className="text-xs">Trashed</Badge>
                    </div>
                    {asset.deleted_at && (
                      <p className="text-[10px] text-muted-foreground/60">
                        Deleted {formatDistanceToNow(new Date(asset.deleted_at), { addSuffix: true })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* Active Assets */
        filtered.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={assets.length === 0 ? "No assets yet" : "No matching assets"}
            description={assets.length === 0 ? "Upload images, PDFs, videos, links, and text snippets to build your content library." : "Try adjusting your search or filters."}
            action={assets.length === 0 && isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Asset</Button> : undefined}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((asset) => {
              const Icon = ASSET_TYPE_ICON[asset.asset_type] ?? FileText;
              const perm = PERMISSION_BADGE[asset.permission_state];
              const summary = summaryMap.get(asset.id);
              const expired = isExpired(asset);

              return (
                <Card key={asset.id} className={expired ? "border-destructive/40 opacity-75" : ""}>
                  <CardHeader className="py-3 px-4 flex-row items-start justify-between space-y-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <CardTitle className="text-sm font-semibold truncate">{asset.title}</CardTitle>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {asset.file_path && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => setViewingAsset(asset)} title="Preview"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => downloadAsset(asset.file_path!, asset.asset_type)} title="Download"><Download className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(asset)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleSoftDelete(asset)} disabled={isDeleting}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0 space-y-2">
                    <AssetThumbnail
                      filePath={asset.file_path}
                      assetType={asset.asset_type}
                      title={asset.title}
                      onClick={() => setViewingAsset(asset)}
                    />
                    {asset.description && <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs capitalize">{asset.asset_type.replace("_", " ")}</Badge>
                      <Badge variant={perm.variant} className="text-xs">{perm.label}</Badge>
                      {asset.is_nudaze_origin && <Badge variant="outline" className="text-xs border-primary/30 text-primary">NuDaze</Badge>}
                      {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                    </div>
                    {/* Metadata: date, event, contributors */}
                    <div className="space-y-1">
                      {(asset as any).content_date && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {format(new Date((asset as any).content_date), "MMM d, yyyy")}
                        </div>
                      )}
                      {(asset as any).is_event && (asset as any).event_name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <PartyPopper className="h-3 w-3 shrink-0" />
                          {(asset as any).event_name}
                        </div>
                      )}
                      {(asset as any).contributors?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="h-3 w-3 shrink-0" />
                          <span className="truncate">{(asset as any).contributors.join(", ")}</span>
                        </div>
                      )}
                    </div>
                    {asset.expires_at && !expired && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        Expires {format(new Date(asset.expires_at), "MMM d, yyyy")}
                      </div>
                    )}
                    {summary && (
                      <div className="mt-2 rounded-md bg-secondary/50 p-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          <Sparkles className="h-3 w-3" /> Summary
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">{summary.summary}</p>
                        {summary.key_topics && summary.key_topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {summary.key_topics.map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 pt-1">
                      Created {format(new Date(asset.created_at), "MMM d, yyyy")}
                      {asset.updated_at !== asset.created_at && ` · Updated ${format(new Date(asset.updated_at), "MMM d, yyyy")}`}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      <AssetFormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? "Edit Asset" : "Add Asset"}
        form={form} setForm={setForm} onSubmit={handleSubmit}
        isPending={submitting || isInserting || isUpdating}
        showFileUpload={!editing}
      />

      <DeleteConfirmDialog
        open={!!permanentDeleteId}
        onOpenChange={() => setPermanentDeleteId(null)}
        onConfirm={async () => { if (permanentDeleteId) { await permanentDelete(permanentDeleteId); setPermanentDeleteId(null); } }}
        title="this asset permanently"
        isPending={isPermanentDeleting}
      />

      <BulkUploadDialog
        open={bulkOpen} onOpenChange={setBulkOpen}
        onSubmit={async (files) => { await uploadAndCreateReels(files); setBulkOpen(false); }}
        isPending={isBulkPending} progress={bulkProgress}
      />

      <ReelCreatorDialog open={reelCreatorOpen} onOpenChange={setReelCreatorOpen} />

      <AssetLightbox
        open={!!viewingAsset}
        onOpenChange={(o) => { if (!o) setViewingAsset(null); }}
        filePath={viewingAsset?.file_path ?? null}
        title={viewingAsset?.title ?? ""}
        assetType={viewingAsset?.asset_type ?? ""}
      />
    </div>
  );
}
