import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Folder, FileText, Image, Film, File, ArrowLeft,
  Download, Search, Loader2, HardDrive, Globe, CheckCircle2,
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
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  siteId?: string;
}

type BrowseMode = "onedrive" | "sharepoint_sites" | "sharepoint_drive";

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

export function OneDriveBrowserDialog({ open, onOpenChange }: OneDriveBrowserDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [mode, setMode] = useState<BrowseMode>("onedrive");
  const [items, setItems] = useState<DriveItem[]>([]);
  const [sites, setSites] = useState<Array<{ id: string; displayName: string; webUrl: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());

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
    } catch (e) {
      toast({ title: "Failed to load files", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callBrowse, toast]);

  const loadFolder = useCallback(async (itemId: string, name: string) => {
    setLoading(true);
    try {
      const action = mode === "sharepoint_drive" ? "list_site_drive" : "list_folder";
      const body: Record<string, unknown> = { action, itemId };
      if (currentSiteId) body.siteId = currentSiteId;

      const data = await callBrowse(body);
      setItems(data.value ?? []);
      setBreadcrumbs((prev) => [...prev, { id: itemId, name, siteId: currentSiteId ?? undefined }]);
    } catch (e) {
      toast({ title: "Failed to load folder", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callBrowse, toast, mode, currentSiteId]);

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
    if (index === 0 && mode !== "sharepoint_sites") {
      await loadRoot();
      return;
    }
    if (crumb.siteId && !crumb.id?.includes("-")) {
      // It's a site root
      await openSiteDrive(crumb.id!, crumb.name);
      return;
    }

    setLoading(true);
    try {
      const action = crumb.siteId ? "list_site_drive" : "list_folder";
      const body: Record<string, unknown> = { action };
      if (crumb.id) body.itemId = crumb.id;
      if (crumb.siteId) body.siteId = crumb.siteId;

      if (!crumb.id) {
        if (crumb.siteId) {
          body.action = "list_site_drive";
          body.siteId = crumb.siteId;
          delete body.itemId;
        } else {
          body.action = "list_root";
        }
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
      // Get download URL
      const detail = await callBrowse({ action: "get_item", itemId: item.id });
      const downloadUrl = detail["@microsoft.graph.downloadUrl"] ?? detail.webUrl;

      // Determine asset type from mime
      const mime = item.file?.mimeType ?? "";
      let assetType: string = "link";
      if (mime.startsWith("image/")) assetType = "image";
      else if (mime.startsWith("video/")) assetType = "video";
      else if (mime.includes("pdf")) assetType = "pdf";
      else if (mime.includes("text") || mime.includes("document") || mime.includes("word")) assetType = "text_snippet";
      else if (mime.includes("presentation") || mime.includes("powerpoint")) assetType = "deck";

      // Insert into source_assets
      const { error: insertErr } = await supabase.from("source_assets").insert({
        title: item.name,
        asset_type: assetType as any,
        external_url: downloadUrl || item.webUrl || "",
        description: `Imported from ${mode === "sharepoint_drive" ? "SharePoint" : "OneDrive"} — ${formatSize(item.size)}`,
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
  }, [callBrowse, mode, toast, qc]);

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
            Browse OneDrive & SharePoint
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode !== "sharepoint_sites" ? "default" : "outline"}
            size="sm"
            onClick={loadRoot}
          >
            <HardDrive className="h-3.5 w-3.5 mr-1.5" />
            My Files
          </Button>
          <Button
            variant={mode === "sharepoint_sites" || mode === "sharepoint_drive" ? "default" : "outline"}
            size="sm"
            onClick={() => loadSharePointSites()}
          >
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            SharePoint Sites
          </Button>
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
                const isFolder = !!item.folder;
                const IconComp = isFolder ? Folder : getFileIcon(item.file?.mimeType);
                const isImported = imported.has(item.id);
                const isImporting = importing === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group"
                  >
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => isFolder && loadFolder(item.id, item.name)}
                      disabled={!isFolder}
                    >
                      <IconComp className={`h-4 w-4 shrink-0 ${isFolder ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{item.name}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          {item.size != null && !isFolder && <span>{formatSize(item.size)}</span>}
                          {isFolder && item.folder && <span>{item.folder.childCount} items</span>}
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
