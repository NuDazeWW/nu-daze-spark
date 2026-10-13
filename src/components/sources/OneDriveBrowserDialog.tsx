import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { HardDrive, Search, Globe, FolderOpen } from "lucide-react";
import type { DriveItem, BreadcrumbItem, SharePointSite, CloudProvider } from "./onedrive/types";
import { formatSize, isShortcut } from "./onedrive/utils";
import { OneDriveFileList } from "./onedrive/OneDriveFileList";
import { OneDrivePreview } from "./onedrive/OneDrivePreview";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDERS: { id: CloudProvider; label: string; icon: typeof HardDrive }[] = [
  { id: "onedrive", label: "OneDrive", icon: HardDrive },
  { id: "sharepoint", label: "SharePoint", icon: Globe },
  { id: "google_drive", label: "Google Drive", icon: FolderOpen },
];
const LABEL: Record<CloudProvider, string> = { onedrive: "OneDrive", sharepoint: "SharePoint", google_drive: "Google Drive" };

/**
 * One folder browser for every connected drive. All providers go through the
 * `browse-cloud-storage` function, which returns the same item shape.
 */
export function CloudStorageBrowserDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [provider, setProvider] = useState<CloudProvider>("onedrive");
  const [items, setItems] = useState<DriveItem[]>([]);
  const [sites, setSites] = useState<SharePointSite[]>([]);
  const [showSites, setShowSites] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const call = useCallback(async (p: CloudProvider, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("browse-cloud-storage", { body: { provider: p, ...body } });
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const j = await error.context.json(); msg = j.details && j.status !== 412 ? `${j.error}` : j.details ?? j.error ?? msg; } catch { /* keep */ }
      }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const fail = useCallback((title: string, e: unknown) =>
    toast({ title, description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" }), [toast]);

  /** Load one level. The crumb trail fully describes how to re-fetch any level. */
  const loadCrumb = useCallback(async (p: CloudProvider, crumb: BreadcrumbItem, trail: BreadcrumbItem[]) => {
    setLoading(true);
    try {
      if (crumb.action === "list_sharepoint_sites") {
        const data = await call(p, { action: "list_sharepoint_sites", searchQuery: crumb.searchQuery || "*" });
        setSites(data.value ?? []);
        setItems([]);
        setShowSites(true);
      } else {
        const data = await call(p, { action: crumb.action, itemId: crumb.id ?? undefined, siteId: crumb.siteId, driveId: crumb.driveId, searchQuery: crumb.searchQuery });
        setItems(data.value ?? []);
        setShowSites(false);
      }
      setCrumbs(trail);
    } catch (e) {
      fail(`Couldn't open ${LABEL[p]}`, e);
    } finally {
      setLoading(false);
    }
  }, [call, fail]);

  const rootCrumb = (p: CloudProvider): BreadcrumbItem =>
    p === "sharepoint" ? { id: null, name: "SharePoint sites", action: "list_sharepoint_sites" }
      : { id: null, name: p === "google_drive" ? "My Drive" : "My Files", action: "list_root" };

  const switchProvider = useCallback((p: CloudProvider) => {
    setProvider(p);
    setSearchQuery("");
    const root = rootCrumb(p);
    loadCrumb(p, root, [root]);
  }, [loadCrumb]);

  const openFolder = useCallback((item: DriveItem) => {
    const current = crumbs[crumbs.length - 1];
    let next: BreadcrumbItem;
    if (isShortcut(item)) {
      next = { id: item.remoteItem!.id, name: item.name, driveId: item.remoteItem!.parentReference!.driveId, action: "list_remote_folder" };
    } else if (current?.action === "list_remote_folder") {
      next = { id: item.id, name: item.name, driveId: current.driveId, action: "list_remote_folder" };
    } else if (current?.siteId) {
      next = { id: item.id, name: item.name, siteId: current.siteId, action: "list_site_drive" };
    } else {
      next = { id: item.id, name: item.name, action: "list_folder" };
    }
    loadCrumb(provider, next, [...crumbs, next]);
  }, [crumbs, provider, loadCrumb]);

  const openSite = useCallback((site: SharePointSite) => {
    const next: BreadcrumbItem = { id: null, name: site.displayName, siteId: site.id, action: "list_site_drive" };
    loadCrumb(provider, next, [...crumbs, next]);
  }, [crumbs, provider, loadCrumb]);

  const runSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    if (showSites) {
      const root = { ...rootCrumb("sharepoint"), searchQuery: q };
      loadCrumb(provider, root, [root]);
      return;
    }
    const siteId = crumbs.find((c) => c.siteId)?.siteId;
    const next: BreadcrumbItem = { id: null, name: `Search: "${q}"`, siteId, action: "search", searchQuery: q };
    loadCrumb(provider, next, [...crumbs.slice(0, siteId ? 2 : 1), next]);
  }, [searchQuery, showSites, crumbs, provider, loadCrumb]);

  /** Item detail request (download link / web link) for the current location. */
  const detailFor = useCallback(async (item: DriveItem) => {
    const current = crumbs[crumbs.length - 1];
    const body: Record<string, unknown> = { action: "get_item", itemId: isShortcut(item) ? item.remoteItem!.id : item.id };
    if (isShortcut(item)) body.driveId = item.remoteItem!.parentReference?.driveId;
    else if (current?.action === "list_remote_folder") body.driveId = current.driveId;
    else if (current?.siteId) body.siteId = current.siteId;
    return call(provider, body);
  }, [crumbs, provider, call]);

  const importFile = useCallback(async (item: DriveItem) => {
    setImporting(item.id);
    try {
      const detail = await detailFor(item);
      const link = provider === "google_drive" ? (detail.webUrl ?? item.webUrl) : (detail["@microsoft.graph.downloadUrl"] ?? detail.webUrl);
      const mime = item.file?.mimeType ?? item.remoteItem?.file?.mimeType ?? "";
      let assetType = "link";
      if (mime.startsWith("image/")) assetType = "image";
      else if (mime.startsWith("video/")) assetType = "video";
      else if (mime.includes("pdf")) assetType = "pdf";
      else if (mime.includes("presentation") || mime.includes("powerpoint")) assetType = "deck";
      else if (mime.includes("text") || mime.includes("document") || mime.includes("word")) assetType = "text_snippet";

      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("source_assets").insert({
        title: item.name,
        asset_type: assetType as never,
        external_url: link || item.webUrl || "",
        description: `Imported from ${LABEL[provider]} — ${formatSize(item.size ?? item.remoteItem?.size)}`,
        permission_state: "generation_allowed" as never,
        is_nudaze_origin: false,
        created_by: auth.user!.id,
      });
      if (error) throw error;
      setImported((prev) => new Set([...prev, item.id]));
      qc.invalidateQueries({ queryKey: ["source_assets"] });
      toast({ title: "File imported", description: `"${item.name}" added to Asset Library.` });
    } catch (e) {
      fail("Import failed", e);
    } finally {
      setImporting(null);
    }
  }, [detailFor, provider, qc, toast, fail]);

  const previewFile = useCallback(async (item: DriveItem) => {
    const mime = item.file?.mimeType ?? item.remoteItem?.file?.mimeType ?? "";
    if (!mime.startsWith("image/") && !mime.startsWith("video/")) return;
    setPreviewLoading(true);
    setPreviewItem(item);
    setPreviewUrl(null);
    try {
      if (provider === "google_drive") {
        // Drive download links need a Google sign-in; the thumbnail is viewable directly.
        setPreviewUrl(item.thumbnailUrl ? item.thumbnailUrl.replace(/=s\d+$/, "=s1600") : null);
      } else {
        const detail = await detailFor(item);
        setPreviewUrl(detail["@microsoft.graph.downloadUrl"] ?? detail.webUrl ?? null);
      }
    } catch (e) {
      fail("Preview failed", e);
      setPreviewItem(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [provider, detailFor, fail]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o && crumbs.length === 0) switchProvider(provider); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Connected Folders
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Connected drive">
          {PROVIDERS.map((p) => (
            <Button
              key={p.id}
              role="tab"
              aria-selected={provider === p.id}
              variant={provider === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => switchProvider(p.id)}
            >
              <p.icon className="h-3.5 w-3.5 mr-1.5" />
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={showSites ? "Search SharePoint sites…" : `Search ${LABEL[provider]}…`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
          />
          <Button size="icon" variant="outline" onClick={runSearch} aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <span>/</span>}
              <button
                className="hover:text-foreground transition-colors hover:underline"
                onClick={() => loadCrumb(provider, crumb, crumbs.slice(0, i + 1))}
                disabled={i === crumbs.length - 1}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0 border rounded-lg">
          <div className="p-2 space-y-0.5">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)
            ) : showSites ? (
              sites.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No SharePoint sites found.</p>
              ) : (
                sites.map((site) => (
                  <button
                    key={site.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors text-left"
                    onClick={() => openSite(site)}
                  >
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{site.displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{site.webUrl}</p>
                    </div>
                  </button>
                ))
              )
            ) : (
              <OneDriveFileList
                items={items}
                importing={importing}
                imported={imported}
                previewLoading={previewLoading}
                previewItemId={previewItem?.id ?? null}
                onFolderClick={openFolder}
                onImport={importFile}
                onPreview={previewFile}
              />
            )}
          </div>
        </ScrollArea>

        {previewItem && (
          <OneDrivePreview
            item={previewItem}
            url={previewUrl}
            loading={previewLoading}
            importing={importing}
            imported={imported}
            onImport={importFile}
            onClose={() => { setPreviewItem(null); setPreviewUrl(null); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Kept for existing imports. */
export const OneDriveBrowserDialog = CloudStorageBrowserDialog;
