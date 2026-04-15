import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Folder, FileText, Image, Film, File, ArrowLeft,
  Download, Search, Loader2, HardDrive, Globe, CheckCircle2, Link2, Eye, X,
} from "lucide-react";

interface DriveItem {
  id: string;
  name: string;
  size?: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl?: string;
  lastModifiedDateTime?: string;
  "@microsoft.graph.downloadUrl"?: string;
  remoteItem?: {
    id: string;
    folder?: { childCount: number };
    file?: { mimeType: string };
    parentReference?: {
      driveId: string;
      driveType?: string;
    };
    size?: number;
  };
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  siteId?: string;
  driveId?: string;
  action?: string;
}

type BrowseMode = "onedrive" | "sharepoint_sites" | "sharepoint_drive" | "remote_drive";

interface OneDriveBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FILE_ICON_MAP: Record<string, React.ElementType> = {
  image: Image,
  video: Film,
  text: FileText,
  application: File,
};

function getFileIcon(mimeType?: string) {
  if (!mimeType) return File;
  const prefix = mimeType.split("/")[0];
  return FILE_ICON_MAP[prefix] ?? File;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isShortcut(item: DriveItem): boolean {
  return !!item.remoteItem?.parentReference?.driveId;
}

export function OneDriveBrowserDialog({ open, onOpenChange }: OneDriveBrowserDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [mode, setMode] = useState<BrowseMode>("onedrive");
  const [items, setItems] = useState<DriveItem[]>([]);
  const [sites, setSites] = useState<Array<{ id: string; displayName: string; webUrl: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }]);
  const [searchQuery, setSearchQuery] = useState("NuDaze Brand");
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);
  const [currentDriveId, setCurrentDriveId] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const callBrowse = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("browse-onedrive", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const loadRoot = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callBrowse({ action: "list_root" });
      setItems(data.value ?? []);
      setBreadcrumbs([{ id: null, name: "My Files" }]);
      setMode("onedrive");
      setCurrentSiteId(null);
      setCurrentDriveId(null);
    } catch (e) {
      toast({ title: "Failed to load files", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callBrowse, toast]);

  const loadFolder = useCallback(async (itemId: string, name: string, item?: DriveItem) => {
    setLoading(true);
    try {
      // Check if this is a shortcut to a remote/shared folder
      if (item && isShortcut(item)) {
        const remote = item.remoteItem!;
        const remoteDriveId = remote.parentReference!.driveId;
        const remoteItemId = remote.id;
        
        const data = await callBrowse({ action: "list_remote_folder", driveId: remoteDriveId, itemId: remoteItemId });
        setItems(data.value ?? []);
        setMode("remote_drive");
        setCurrentDriveId(remoteDriveId);
        setBreadcrumbs((prev) => [...prev, { id: remoteItemId, name, driveId: remoteDriveId, action: "list_remote_folder" }]);
        return;
      }

      // If we're already browsing a remote drive, keep using that driveId
      if (mode === "remote_drive" && currentDriveId) {
        const data = await callBrowse({ action: "list_remote_folder", driveId: currentDriveId, itemId });
        setItems(data.value ?? []);
        setBreadcrumbs((prev) => [...prev, { id: itemId, name, driveId: currentDriveId, action: "list_remote_folder" }]);
        return;
      }

      const action = mode === "sharepoint_drive" ? "list_site_drive" : "list_folder";
      const body: Record<string, unknown> = { action, itemId };
      if (currentSiteId) body.siteId = currentSiteId;

      const data = await callBrowse(body);
      setItems(data.value ?? []);
      setBreadcrumbs((prev) => [...prev, { id: itemId, name, siteId: currentSiteId ?? undefined, action }]);
    } catch (e) {
      toast({ title: "Failed to load folder", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callBrowse, toast, mode, currentSiteId, currentDriveId]);

  const loadSharePointSites = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const data = await callBrowse({ action: "list_sharepoint_sites", searchQuery: query || "*" });
      setSites(data.value ?? []);
      setMode("sharepoint_sites");
      setBreadcrumbs([{ id: null, name: "SharePoint Sites" }]);
      setItems([]);
    } catch (e) {
      toast({ title: "Failed to load sites", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callBrowse, toast]);

  const openSiteDrive = useCallback(async (siteId: string, siteName: string) => {
    setLoading(true);
    setCurrentSiteId(siteId);
    try {
      const data = await callBrowse({ action: "list_site_drive", siteId });
      setItems(data.value ?? []);
      setMode("sharepoint_drive");
      setBreadcrumbs([{ id: null, name: "SharePoint Sites" }, { id: siteId, name: siteName, siteId }]);
    } catch (e) {
      toast({ title: "Failed to load site drive", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callBrowse, toast]);

  const navigateToBreadcrumb = useCallback(async (index: number) => {
    const crumb = breadcrumbs[index];
    if (index === 0 && mode === "sharepoint_sites") {
      await loadSharePointSites();
      return;
    }
    if (index === 0) {
      await loadRoot();
      return;
    }

    setLoading(true);
    try {
      let body: Record<string, unknown>;

      if (crumb.action === "list_remote_folder" && crumb.driveId) {
        body = { action: "list_remote_folder", driveId: crumb.driveId, itemId: crumb.id };
        setMode("remote_drive");
        setCurrentDriveId(crumb.driveId);
      } else if (crumb.siteId && !crumb.id?.includes("-")) {
        await openSiteDrive(crumb.id!, crumb.name);
        return;
      } else if (crumb.siteId) {
        body = { action: "list_site_drive", siteId: crumb.siteId, itemId: crumb.id };
      } else {
        body = crumb.id ? { action: "list_folder", itemId: crumb.id } : { action: "list_root" };
      }

      const data = await callBrowse(body);
      setItems(data.value ?? []);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    } catch (e) {
      toast({ title: "Navigation failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [breadcrumbs, mode, callBrowse, toast, loadRoot, loadSharePointSites, openSiteDrive]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const data = await callBrowse({ action: "search", searchQuery: searchQuery.trim() });
      setItems(data.value ?? []);
      setBreadcrumbs([{ id: null, name: "My Files" }, { id: null, name: `Search: "${searchQuery}"` }]);
    } catch (e) {
      toast({ title: "Search failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, callBrowse, toast]);

  const importFile = useCallback(async (item: DriveItem) => {
    setImporting(item.id);
    try {
      const isRemote = isShortcut(item);
      const getBody: Record<string, unknown> = { action: "get_item", itemId: isRemote ? item.remoteItem!.id : item.id };
      if (isRemote && item.remoteItem?.parentReference?.driveId) {
        getBody.driveId = item.remoteItem.parentReference.driveId;
      } else if (currentDriveId && mode === "remote_drive") {
        getBody.driveId = currentDriveId;
      }

      const detail = await callBrowse(getBody);
      const downloadUrl = detail["@microsoft.graph.downloadUrl"] ?? detail.webUrl;

      const mime = item.file?.mimeType ?? item.remoteItem?.file?.mimeType ?? "";
      let assetType: string = "link";
      if (mime.startsWith("image/")) assetType = "image";
      else if (mime.startsWith("video/")) assetType = "video";
      else if (mime.includes("pdf")) assetType = "pdf";
      else if (mime.includes("text") || mime.includes("document") || mime.includes("word")) assetType = "text_snippet";
      else if (mime.includes("presentation") || mime.includes("powerpoint")) assetType = "deck";

      const { error: insertErr } = await supabase.from("source_assets").insert({
        title: item.name,
        asset_type: assetType as any,
        external_url: downloadUrl || item.webUrl || "",
        description: `Imported from ${mode === "sharepoint_drive" ? "SharePoint" : mode === "remote_drive" ? "Shared Drive" : "OneDrive"} — ${formatSize(item.size ?? item.remoteItem?.size)}`,
        permission_state: "generation_allowed" as any,
        is_nudaze_origin: false,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });

      if (insertErr) throw insertErr;

      setImported((prev) => new Set([...prev, item.id]));
      qc.invalidateQueries({ queryKey: ["source_assets"] });
      toast({ title: "File imported", description: `"${item.name}" added to Asset Library.` });
    } catch (e) {
      toast({ title: "Import failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setImporting(null);
    }
  }, [callBrowse, mode, currentDriveId, toast, qc]);

  const handleOpen = useCallback(() => {
    if (items.length === 0 && sites.length === 0) {
      loadRoot();
    }
  }, [items.length, sites.length, loadRoot]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) handleOpen();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Browse OneDrive Files
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 items-center">
          <Button variant="default" size="sm" onClick={loadRoot}>
            <HardDrive className="h-3.5 w-3.5 mr-1.5" />
            My Files
          </Button>
          <span className="text-[10px] text-muted-foreground">SharePoint Sites require additional permissions — coming soon</span>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder={mode === "sharepoint_sites" ? "Search SharePoint sites…" : "Search files…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                mode === "sharepoint_sites" ? loadSharePointSites(searchQuery) : handleSearch();
              }
            }}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => mode === "sharepoint_sites" ? loadSharePointSites(searchQuery) : handleSearch()}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <span>/</span>}
              <button
                className="hover:text-foreground transition-colors hover:underline"
                onClick={() => navigateToBreadcrumb(i)}
                disabled={i === breadcrumbs.length - 1}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0 border rounded-lg">
          <div className="p-2 space-y-0.5">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))
            ) : mode === "sharepoint_sites" ? (
              sites.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No SharePoint sites found.</p>
              ) : (
                sites.map((site) => (
                  <button
                    key={site.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors text-left"
                    onClick={() => openSiteDrive(site.id, site.displayName)}
                  >
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{site.displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{site.webUrl}</p>
                    </div>
                  </button>
                ))
              )
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No files or folders found.</p>
            ) : (
              items.map((item) => {
                const shortcut = isShortcut(item);
                const isFolder = !!item.folder || !!item.remoteItem?.folder;
                const mime = item.file?.mimeType ?? item.remoteItem?.file?.mimeType;
                const IconComp = isFolder ? Folder : getFileIcon(mime);
                const isImported = imported.has(item.id);
                const isImporting = importing === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group"
                  >
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => isFolder && loadFolder(item.id, item.name, item)}
                      disabled={!isFolder}
                    >
                      <div className="relative shrink-0">
                        <IconComp className={`h-4 w-4 ${isFolder ? "text-primary" : "text-muted-foreground"}`} />
                        {shortcut && (
                          <Link2 className="h-2.5 w-2.5 text-primary absolute -bottom-1 -right-1" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{item.name}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          {(item.size != null || item.remoteItem?.size != null) && !isFolder && (
                            <span>{formatSize(item.size ?? item.remoteItem?.size)}</span>
                          )}
                          {isFolder && (item.folder || item.remoteItem?.folder) && (
                            <span>{(item.folder?.childCount ?? item.remoteItem?.folder?.childCount)} items</span>
                          )}
                          {shortcut && <span className="text-primary/70">Shortcut</span>}
                        </div>
                      </div>
                    </button>

                    {!isFolder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => importFile(item)}
                        disabled={isImporting || isImported}
                      >
                        {isImported ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                            <span className="text-xs">Imported</span>
                          </>
                        ) : isImporting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Import</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
