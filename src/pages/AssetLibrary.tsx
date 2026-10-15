import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAssets, type SourceAsset } from "@/hooks/useAssets";
import { AssetFormDialog, defaultAssetForm, type AssetFormData } from "@/components/assets/AssetFormDialog";
import { BulkUploadDialog } from "@/components/assets/BulkUploadDialog";
import { ReelCreatorDialog } from "@/components/assets/ReelCreatorDialog";
import { OneDriveBrowserDialog } from "@/components/sources/OneDriveBrowserDialog";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  FolderOpen, Plus, Pencil, Trash2, Search, AlertCircle, Download, Eye,
  Image, Video, FileText, Link2, Type, Presentation, Quote, BookOpen,
  CalendarClock, Sparkles, Film, Undo2, Archive, Trash, Calendar, Users, PartyPopper,
  Tags, MoreVertical, Info, X,
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

type TypeGroup = "all" | "images" | "videos" | "documents" | "other";
const groupOf = (t: string): TypeGroup =>
  t === "image" ? "images" : t === "video" ? "videos" : ["pdf", "deck", "case_study"].includes(t) ? "documents" : "other";
const TYPE_GROUPS: { value: TypeGroup; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: FolderOpen },
  { value: "images", label: "Images", icon: Image },
  { value: "videos", label: "Videos", icon: Video },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "other", label: "Other", icon: Link2 },
];

export default function AssetLibrary() {
  const {
    assets, trashedAssets, summaryMap, isLoading, error, isAdmin,
    insert, update, softDelete, restore, permanentDelete, uploadFile, downloadAsset,
    isInserting, isUpdating, isDeleting, isRestoring, isPermanentDeleting,
  } = useAssets();

  const { uploadAndCreateReels, isPending: isBulkPending, progress: bulkProgress } = useBulkReelUpload();
  const { warnIfDuplicate } = useDuplicateDetection(assets);
  const { usageMap } = useAssetUsage();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reelCreatorOpen, setReelCreatorOpen] = useState(false);
  const [oneDriveOpen, setOneDriveOpen] = useState(false);

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
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeGroup, setTypeGroup] = useState<TypeGroup>("all");

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && a.asset_type !== filterType) return false;
      if (filterPermission !== "all" && a.permission_state !== filterPermission) return false;
      if (typeGroup !== "all" && groupOf(a.asset_type) !== typeGroup) return false;
      return true;
    });
  }, [assets, search, filterType, filterPermission, typeGroup]);
  // Inspector follows the selection; default to the first visible asset so the detail panel is always populated.
  const selected = useMemo(() => {
    if (selectedId === "none") return null;
    return filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

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
    // Duplicate check on create
    if (!editing) {
      warnIfDuplicate(form.title, form.file?.name);
    }
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

  const toggleBulkSelect = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    for (const id of bulkSelected) {
      await softDelete(id);
    }
    toast(`${bulkSelected.size} assets moved to trash`);
    setBulkSelected(new Set());
    setBulkMode(false);
  };

  const handleBulkPermission = async (permission: string) => {
    for (const id of bulkSelected) {
      await update({ id, permission_state: permission } as never);
    }
    toast(`Updated permission for ${bulkSelected.size} assets`);
    setBulkSelected(new Set());
    setBulkMode(false);
  };

  if (isLoading) {
    return (
      <div className="sm-reference sm-assets animate-fade-in">
        <PageHeader title="Asset Library" description="Manage uploaded source assets, permissions, and summaries." />
        <div className="space-y-3 py-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sm-reference sm-assets animate-fade-in">
        <PageHeader title="Asset Library" description="Manage uploaded source assets, permissions, and summaries." />
        <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription>Failed to load assets: {error.message}</AlertDescription></Alert>
      </div>
    );
  }

  const isExpired = (a: SourceAsset) => a.expires_at && new Date(a.expires_at) < new Date();

  return (
    <div className="sm-reference sm-assets animate-fade-in">
      <PageHeader title="Asset Library" description="Manage uploaded source assets, permissions, and summaries." />
      <ExpirationAlerts />

      {/* Toolbar */}
      <div className="sm-al-toolbar">
        <div className="sm-al-row">
          <div className="sm-al-search">
            <Search aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets…" aria-label="Search assets" />
          </div>
          {!showTrash && (
            <>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="sm-al-select w-[150px]"><SelectValue placeholder="All types" /></SelectTrigger>
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
                <SelectTrigger className="sm-al-select w-[170px]"><SelectValue placeholder="All permissions" /></SelectTrigger>
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
          {!showTrash && isAdmin && <Button onClick={openCreate} className="sm-al-primary"><Plus className="mr-2 h-4 w-4" />Add Asset</Button>}
        </div>
        <div className="sm-al-row sm-al-row-secondary">
          <span className="sm-al-count">{showTrash ? trashedAssets.length : filtered.length} assets</span>
          <Button
            variant={showTrash ? "default" : "outline"}
            onClick={() => { setShowTrash(!showTrash); setSelectedId(null); }}
            className="relative sm-al-chip"
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
              <Button className="sm-al-chip" variant={bulkMode ? "default" : "outline"} onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); }}>
                <Tags className="mr-2 h-4 w-4" />{bulkMode ? "Exit Bulk" : "Bulk Actions"}
              </Button>
              <Button className="sm-al-chip" variant="outline" onClick={() => setOneDriveOpen(true)}><FolderOpen className="mr-2 h-4 w-4" />Connected Folders</Button>
              <Button className="sm-al-chip" variant="outline" onClick={() => setReelCreatorOpen(true)}><Film className="mr-2 h-4 w-4" />Create Video Reel</Button>
              <Button className="sm-al-chip" variant="outline" onClick={() => setBulkOpen(true)}><Sparkles className="mr-2 h-4 w-4" />AI Reel Cards</Button>
            </>
          )}
        </div>
      </div>

      {!showTrash && (
        <div className="sm-al-types" role="group" aria-label="Asset type">
          {TYPE_GROUPS.map(({ value, label, icon: GIcon }) => {
            const n = value === "all" ? assets.length : assets.filter((a) => groupOf(a.asset_type) === value).length;
            return (
              <button key={value} type="button" className="sm-al-type-chip" aria-pressed={typeGroup === value} onClick={() => setTypeGroup(value)}>
                <GIcon aria-hidden="true" />{label}<span>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bulk actions bar */}
      {bulkMode && bulkSelected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border bg-muted/30">
          <span className="text-sm font-medium">{bulkSelected.size} selected</span>
          <Select onValueChange={handleBulkPermission}>
            <SelectTrigger className="w-[170px] h-8 text-xs">
              <SelectValue placeholder="Set permission…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="generation_allowed">Gen Allowed</SelectItem>
              <SelectItem value="summarization_only">Summary Only</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setBulkSelected(new Set()); setBulkMode(false); }}>Cancel</Button>
        </div>
      )}

      {/* Trash View */}
      {showTrash ? (
        trashedAssets.length === 0 ? (
          <EmptyState icon={Trash} title="Trash is empty" description="Deleted assets will appear here for recovery." />
        ) : (
          <div className="sm-asset-grid grid gap-4 md:grid-cols-2 2xl:grid-cols-4 xl:grid-cols-3">
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
          <div className={selected ? "sm-al-layout has-inspector" : "sm-al-layout"}>
          <div className="sm-al-grid">
            {filtered.map((asset) => {
              const perm = PERMISSION_BADGE[asset.permission_state];
              const summary = summaryMap.get(asset.id);
              const expired = isExpired(asset);
              const isSel = selected?.id === asset.id;
              const topics = summary?.key_topics?.slice(0, 3) ?? [];
              const dateValue = (asset as any).content_date ?? asset.created_at;
              return (
                <article key={asset.id} className={`sm-al-card ${isSel ? "is-selected" : ""} ${expired ? "is-expired" : ""} ${bulkMode && bulkSelected.has(asset.id) ? "is-bulk" : ""}`}>
                  <div className="sm-al-thumb">
                    <AssetThumbnail filePath={asset.file_path} assetType={asset.asset_type} title={asset.title} onClick={() => setSelectedId(asset.id)} />
                    <span className="sm-al-type">{asset.asset_type.replace("_", " ")}</span>
                    {bulkMode && (
                      <span className="sm-al-check"><Checkbox checked={bulkSelected.has(asset.id)} onCheckedChange={() => toggleBulkSelect(asset.id)} aria-label={`Select ${asset.title}`} /></span>
                    )}
                  </div>
                  <div className="sm-al-body">
                    <div className="sm-al-title-row">
                      <button type="button" className="sm-al-title" title={asset.title} onClick={() => setSelectedId(asset.id)} aria-pressed={isSel}>{asset.title}</button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="sm-al-more" aria-label={`Actions for ${asset.title}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedId(asset.id)}><Info className="mr-2 h-3.5 w-3.5" />Details</DropdownMenuItem>
                          {asset.file_path && <DropdownMenuItem onClick={() => setViewingAsset(asset)}><Eye className="mr-2 h-3.5 w-3.5" />Preview</DropdownMenuItem>}
                          {asset.file_path && <DropdownMenuItem onClick={() => downloadAsset(asset.file_path!, asset.asset_type)}><Download className="mr-2 h-3.5 w-3.5" />Download</DropdownMenuItem>}
                          {isAdmin && <DropdownMenuItem onClick={() => openEdit(asset)}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</DropdownMenuItem>}
                          {isAdmin && <DropdownMenuItem className="text-destructive" disabled={isDeleting} onClick={() => handleSoftDelete(asset)}><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {topics.length > 0 && <div className="sm-al-tags">{topics.map((t) => <span key={t}>{t}</span>)}</div>}
                    <div className="sm-al-foot">
                      <span className="sm-al-date">{asset.is_nudaze_origin && <b>NuDaze · </b>}{format(new Date(dateValue), "MMM d, yyyy")}</span>
                      {expired ? <span className="sm-al-status" data-tone="blocked">Expired</span> : <span className="sm-al-status" data-tone={asset.permission_state}>{perm.label}</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {selected && (
            <aside className="sm-al-inspector" aria-label={`Details for ${selected.title}`}>
              {(() => {
                const a = selected;
                const Icon = ASSET_TYPE_ICON[a.asset_type] ?? FileText;
                const perm = PERMISSION_BADGE[a.permission_state];
                const summary = summaryMap.get(a.id);
                const expired = isExpired(a);
                const usageCount = usageMap.get(a.id) ?? 0;
                const rows: [string, React.ReactNode][] = [
                  ["Type", <span className="capitalize">{a.asset_type.replace("_", " ")}</span>],
                  ["Description", a.description],
                  ["Origin", a.is_nudaze_origin ? "NuDaze" : null],
                  ["Content date", (a as any).content_date ? format(new Date((a as any).content_date), "MMM d, yyyy") : null],
                  ["Event", (a as any).is_event ? (a as any).event_name : null],
                  ["Contributors", (a as any).contributors?.length ? (a as any).contributors.join(", ") : null],
                  ["Expires", a.expires_at ? <>{format(new Date(a.expires_at), "MMM d, yyyy")}{expired && " · Expired"}</> : null],
                  ["Used in", usageCount > 0 ? `${usageCount} use${usageCount !== 1 ? "s" : ""}` : null],
                  ["Created", format(new Date(a.created_at), "MMM d, yyyy")],
                  ["Updated", a.updated_at !== a.created_at ? format(new Date(a.updated_at), "MMM d, yyyy") : null],
                ];
                return (
                  <>
                    <div className="sm-al-insp-head">
                      <span className="sm-al-insp-icon"><Icon /></span>
                      <div className="min-w-0 flex-1"><h2>{a.title}</h2><p className="capitalize">{a.asset_type.replace("_", " ")}</p></div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId("none")} aria-label="Close details"><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="sm-al-insp-preview"><AssetThumbnail filePath={a.file_path} assetType={a.asset_type} title={a.title} onClick={() => a.file_path && setViewingAsset(a)} /></div>
                    <section className="sm-al-insp-section">
                      <div className="sm-al-insp-title"><span>Basic information</span>{isAdmin && <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}</div>
                      <dl>{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                    </section>
                    <section className="sm-al-insp-section">
                      <div className="sm-al-insp-title"><span>Asset status</span></div>
                      {isAdmin ? (
                        <Select value={a.permission_state} onValueChange={(v) => update({ id: a.id, permission_state: v } as never)}>
                          <SelectTrigger className="sm-al-select" aria-label="Asset status"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="generation_allowed">Gen Allowed</SelectItem>
                            <SelectItem value="summarization_only">Summary Only</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : <span className="sm-al-status" data-tone={a.permission_state}>{perm.label}</span>}
                    </section>
                    {summary && (
                      <section className="sm-al-insp-section">
                        <div className="sm-al-insp-title"><span><Sparkles className="mr-1 inline h-3.5 w-3.5" />Summary</span></div>
                        <p className="sm-al-insp-copy">{summary.summary}</p>
                        {summary.key_topics && summary.key_topics.length > 0 && <div className="sm-al-tags">{summary.key_topics.map((t) => <span key={t}>{t}</span>)}</div>}
                      </section>
                    )}
                    <div className="sm-al-insp-actions">
                      {a.file_path && <Button className="sm-al-primary" onClick={() => downloadAsset(a.file_path!, a.asset_type)}><Download className="mr-2 h-4 w-4" />Download</Button>}
                      {a.file_path && <Button variant="outline" onClick={() => setViewingAsset(a)}><Eye className="mr-2 h-4 w-4" />Preview</Button>}
                      {isAdmin && <Button variant="outline" onClick={() => handleSoftDelete(a)} disabled={isDeleting} aria-label="Delete asset"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </>
                );
              })()}
            </aside>
          )}
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
      <OneDriveBrowserDialog open={oneDriveOpen} onOpenChange={setOneDriveOpen} />

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
