import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConnectedSources, type ConnectedSource } from "@/hooks/useConnectedSources";
import { SourceFormDialog, defaultSourceForm, type SourceFormData } from "@/components/sources/SourceFormDialog";
import { BulkUrlImportDialog } from "@/components/sources/BulkUrlImportDialog";
import { DeleteConfirmDialog } from "@/components/strategy/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Link2, Plus, Pencil, Trash2, AlertCircle,
  HardDrive, Globe, Cloud, FolderSync, BookOpen, Database,
  Download, Loader2, Link, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

const SOURCE_TYPE_META: Record<string, { icon: React.ElementType; label: string }> = {
  google_drive: { icon: HardDrive, label: "Google Drive" },
  sharepoint: { icon: Cloud, label: "SharePoint" },
  onedrive: { icon: FolderSync, label: "OneDrive" },
  webpage: { icon: Globe, label: "Webpage" },
  notion: { icon: BookOpen, label: "Notion" },
  dropbox: { icon: Database, label: "Dropbox" },
};

export default function ConnectedSources() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const {
    data, isLoading, error,
    insert, update, remove,
    isInserting, isUpdating, isDeleting,
  } = useConnectedSources();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectedSource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<SourceFormData>(defaultSourceForm);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [quickUrl, setQuickUrl] = useState("");
  const [quickScraping, setQuickScraping] = useState(false);

  if (!isAdmin) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Connected Sources" description="Link external document libraries and web sources." />
        <EmptyState icon={Link2} title="Admin access required" description="Only administrators can manage connected sources." />
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setForm(defaultSourceForm);
    setFormOpen(true);
  };

  const openEdit = (s: ConnectedSource) => {
    setEditing(s);
    setForm({
      source_name: s.source_name,
      source_type: s.source_type,
      is_connected: s.is_connected,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (editing) {
      await update({ id: editing.id, ...form });
    } else {
      await insert(form as Partial<ConnectedSource>);
    }
    setFormOpen(false);
  };

  // Scrape a single webpage source's URL from its config
  const handleScrapeSource = async (source: ConnectedSource) => {
    const config = source.connection_config as Record<string, unknown> | null;
    const url = config?.url as string | undefined;
    if (!url) {
      toast({ title: "No URL configured", description: "Edit this source and add a URL in connection config.", variant: "destructive" });
      return;
    }

    setScrapingId(source.id);
    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke("import-webpage", {
        body: { urls: [url] },
      });

      if (fnErr || result?.error) {
        toast({ title: "Scrape failed", description: fnErr?.message || result?.error, variant: "destructive" });
        return;
      }

      // Update last_synced_at
      await update({ id: source.id, last_synced_at: new Date().toISOString() } as Partial<ConnectedSource> & { id: string });
      qc.invalidateQueries({ queryKey: ["source_assets"] });
      qc.invalidateQueries({ queryKey: ["asset_summaries"] });

      const imported = result?.imported ?? 0;
      toast({
        title: imported > 0 ? "Page imported" : "Import failed",
        description: imported > 0
          ? `"${source.source_name}" scraped and saved to Asset Library.`
          : "Could not scrape this URL.",
        variant: imported > 0 ? "default" : "destructive",
      });
    } catch (e) {
      toast({ title: "Scrape error", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setScrapingId(null);
    }
  };

  // Quick import: scrape a URL directly without creating a source first

  const handleQuickImport = async () => {
    if (!quickUrl.trim()) return;
    setQuickScraping(true);
    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke("import-webpage", {
        body: { urls: [quickUrl.trim()] },
      });

      if (fnErr || result?.error) {
        toast({ title: "Import failed", description: fnErr?.message || result?.error, variant: "destructive" });
        return;
      }

      qc.invalidateQueries({ queryKey: ["source_assets"] });
      qc.invalidateQueries({ queryKey: ["asset_summaries"] });

      const imported = result?.imported ?? 0;
      if (imported > 0) {
        toast({ title: "Page imported", description: "Scraped and saved to Asset Library." });
        setQuickUrl("");
      } else {
        toast({ title: "Import failed", description: "Could not scrape this URL.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Import error", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setQuickScraping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Connected Sources" description="Link external document libraries and web sources." />
        <div className="space-y-3 py-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Connected Sources" description="Link external document libraries and web sources." />
        <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription>Failed to load sources: {error.message}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Connected Sources" description="Link external document libraries and web sources." />

      {/* Quick Import Bar */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-3">
            <Link className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  placeholder="Paste a URL to scrape & import into Asset Library…"
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickImport()}
                  disabled={quickScraping}
                />
                <Button onClick={handleQuickImport} disabled={!quickUrl.trim() || quickScraping} size="sm">
                  {quickScraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="ml-1.5">Import</span>
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              Bulk Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Source Actions */}
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Source</Button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No sources connected"
          description="Connect Google Drive, SharePoint, or add webpage links for content sourcing."
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Source</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((source) => {
            const meta = SOURCE_TYPE_META[source.source_type] ?? { icon: Globe, label: source.source_type };
            const Icon = meta.icon;
            const isWebpage = source.source_type === "webpage";
            const isScraping = scrapingId === source.id;
            const config = source.connection_config as Record<string, unknown> | null;
            const hasUrl = !!(config?.url);

            return (
              <Card key={source.id} className="group">
                <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <CardTitle className="text-sm font-semibold truncate">{source.source_name}</CardTitle>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isWebpage && hasUrl && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleScrapeSource(source)}
                            disabled={isScraping}
                          >
                            {isScraping ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5 text-primary" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Scrape & import to Asset Library</TooltipContent>
                      </Tooltip>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(source)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(source.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                    <Badge variant={source.is_connected ? "default" : "secondary"} className="text-xs">
                      {source.is_connected ? "Connected" : "Disconnected"}
                    </Badge>
                    {isWebpage && !hasUrl && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">No URL set</Badge>
                    )}
                  </div>
                  {hasUrl && (
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {config?.url as string}
                    </p>
                  )}
                  {source.last_synced_at && (
                    <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Last synced {format(new Date(source.last_synced_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60">
                    Created {format(new Date(source.created_at), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cloud storage coming soon */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Cloud Storage Integrations</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Google Drive", icon: HardDrive, desc: "Browse and import files from Google Drive" },
            { label: "OneDrive", icon: FolderSync, desc: "Browse and import files from OneDrive" },
            { label: "SharePoint", icon: Cloud, desc: "Browse and import files from SharePoint" },
          ].map((item) => (
            <Card key={item.label} className="border-dashed border-border/50 opacity-60">
              <CardContent className="py-6 px-4 text-center space-y-2">
                <item.icon className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
                <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <SourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit Source" : "Add Connected Source"}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={isInserting || isUpdating}
      />

      <BulkUrlImportDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }}
        title="this source"
        isPending={isDeleting}
      />
    </div>
  );
}
