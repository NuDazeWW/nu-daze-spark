import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAssets, type SourceAsset } from "@/hooks/useAssets";
import { AssetFormDialog, defaultAssetForm, type AssetFormData } from "@/components/assets/AssetFormDialog";
import { BulkUploadDialog } from "@/components/assets/BulkUploadDialog";
import { ReelCreatorDialog } from "@/components/assets/ReelCreatorDialog";
import { DeleteConfirmDialog } from "@/components/strategy/DeleteConfirmDialog";
import { useBulkReelUpload } from "@/hooks/useBulkReelUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FolderOpen, Plus, Pencil, Trash2, Search, AlertCircle,
  Image, Video, FileText, Link2, Type, Presentation, Quote, BookOpen,
  Shield, ShieldAlert, ShieldOff, Archive, CalendarClock, Sparkles, Film,
} from "lucide-react";
import { format } from "date-fns";

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
    assets, summaryMap, isLoading, error, isAdmin,
    insert, update, remove, uploadFile,
    isInserting, isUpdating, isDeleting,
  } = useAssets();

  const { uploadAndCreateReels, isPending: isBulkPending, progress: bulkProgress } = useBulkReelUpload();
  const [bulkOpen, setBulkOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SourceAsset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetFormData>(defaultAssetForm);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPermission, setFilterPermission] = useState("all");

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && a.asset_type !== filterType) return false;
      if (filterPermission !== "all" && a.permission_state !== filterPermission) return false;
      return true;
    });
  }, [assets, search, filterType, filterPermission]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultAssetForm);
    setFormOpen(true);
  };

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
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let file_path = editing?.file_path ?? null;
      if (form.file) {
        file_path = await uploadFile(form.file);
      }
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        asset_type: form.asset_type,
        permission_state: form.permission_state,
        is_nudaze_origin: form.is_nudaze_origin,
        external_url: form.external_url || null,
        text_content: form.text_content || null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        file_path,
      };
      if (editing) {
        await update({ id: editing.id, ...payload } as never);
      } else {
        await insert(payload as never);
      }
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
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
        {isAdmin && (
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)}><Film className="mr-2 h-4 w-4" />Create Reels</Button>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Asset</Button>
          </>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
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
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(asset)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(asset.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-2">
                  {asset.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs capitalize">{asset.asset_type.replace("_", " ")}</Badge>
                    <Badge variant={perm.variant} className="text-xs">{perm.label}</Badge>
                    {asset.is_nudaze_origin && <Badge variant="outline" className="text-xs border-primary/30 text-primary">NuDaze</Badge>}
                    {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
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
      )}

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit Asset" : "Add Asset"}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={submitting || isInserting || isUpdating}
        showFileUpload={!editing}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }}
        title="this asset"
        isPending={isDeleting}
      />

      <BulkUploadDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSubmit={async (files) => {
          await uploadAndCreateReels(files);
          setBulkOpen(false);
        }}
        isPending={isBulkPending}
        progress={bulkProgress}
      />
    </div>
  );
}
