import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConnectedSources, type ConnectedSource } from "@/hooks/useConnectedSources";
import { SourceFormDialog, defaultSourceForm, type SourceFormData } from "@/components/sources/SourceFormDialog";
import { BulkUrlImportDialog } from "@/components/sources/BulkUrlImportDialog";
import { OneDriveBrowserDialog } from "@/components/sources/OneDriveBrowserDialog";
import { ReportingConnectors } from "@/components/sources/ReportingConnectors";
import { DeleteConfirmDialog } from "@/components/strategy/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Link2, Plus, Pencil, Trash2, AlertCircle,
  HardDrive, Globe, Cloud, FolderSync, BookOpen, Database,
  Download, Loader2, Link, MoreVertical, RefreshCw, FolderOpen, CalendarDays, Clock, FileText,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import oneDriveLogo from "@/assets/logos/onedrive.svg";
import sharePointLogo from "@/assets/logos/sharepoint.svg";
import googleDriveLogo from "@/assets/logos/google-drive.svg";
import cardFolds from "@/assets/sources-card-folds.png";
import headerWaves from "@/assets/sources-header-waves.jpg";

const SOURCE_LOGO: Record<string, string> = { onedrive: oneDriveLogo, sharepoint: sharePointLogo, google_drive: googleDriveLogo };
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
  const [oneDriveOpen, setOneDriveOpen] = useState(false);

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

  const cloudTypes = ["onedrive", "sharepoint"];
  const findCloud = (t: string) => data.find((s) => s.source_type === t);
  const CLOUD = [
    { type: "onedrive", name: "OneDrive", logo: oneDriveLogo, tone: "blue", ready: true },
    { type: "sharepoint", name: "SharePoint", logo: sharePointLogo, tone: "teal", ready: true },
    { type: "google_drive", name: "Google Drive", logo: googleDriveLogo, tone: "gold", ready: false },
  ] as const;

  return (
    <div className="sm-src animate-fade-in">
      <img src={headerWaves} alt="" aria-hidden="true" className="sm-src-waves" width={1920} height={1088} />
      <PageHeader title="Connected Sources" description="Link external document libraries and web sources to power your content, insights, and reporting." />

      {/* Quick Import Bar */}
      <div className="sm-src-import">
        <div className="sm-src-url sm-search-frame">
          <Link className="sm-src-url-icon" aria-hidden="true" />
          <input
            type="url"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            placeholder="Paste a URL to scrape & import into Asset Library…"
            aria-label="URL to import"
            onKeyDown={(e) => e.key === "Enter" && handleQuickImport()}
            disabled={quickScraping}
          />
        </div>
        <Button accent="cyan" onClick={handleQuickImport} disabled={!quickUrl.trim() || quickScraping} className="sm-src-btn">
          {quickScraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Import
        </Button>
        <Button accent="gold" variant="outline" onClick={() => setBulkOpen(true)} className="sm-src-btn-soft sm-lit-btn">
          <FileText className="h-4 w-4" />Bulk Import
        </Button>
      </div>
      <p className="sm-src-hint font-semibold">Supported: webpages, PDFs, Google Drive, SharePoint, OneDrive and more.</p>

      {/* Source Actions */}
      <div className="flex flex-wrap justify-end gap-3 mb-2">
        <Button accent="violet" variant="outline" asChild className="sm-src-btn-soft sm-lit-btn">
          <a href="/settings/connections">
            <Link2 className="h-4 w-4" />Manage Connectors
          </a>
        </Button>
        <Button onClick={openCreate} className="sm-src-btn"><Plus className="h-4 w-4" />Add Source</Button>
      </div>

      <h2 className="sm-src-h2">Your Sources</h2>
      <p className="sm-src-sub">Manage your connected accounts and data sources.</p>
      {data.length === 0 ? (
        <div className="sm-src-empty">
          <EmptyState
            icon={Link2}
            title="No sources connected"
            description="Connect Google Drive, SharePoint, or add webpage links for content sourcing."
            action={<Button onClick={openCreate} className="sm-src-btn"><Plus className="h-4 w-4" />Add Source</Button>}
          />
        </div>
      ) : (
        <div className="sm-src-grid">
          {data.map((source) => {
            const meta = SOURCE_TYPE_META[source.source_type] ?? { icon: Globe, label: source.source_type };
            const Icon = meta.icon;
            const logo = SOURCE_LOGO[source.source_type];
            const isWebpage = source.source_type === "webpage";
            const isCloud = cloudTypes.includes(source.source_type);
            const isScraping = scrapingId === source.id;
            const config = source.connection_config as Record<string, unknown> | null;
            const hasUrl = !!(config?.url);
            return (
              <article key={source.id} className="sm-src-card">
                <img src={cardFolds} alt="" aria-hidden="true" className="sm-src-art" width={992} height={672} loading="lazy" />
                <div className="sm-src-card-top">
                  <span className="sm-src-logo">{logo ? <img src={logo} alt={`${meta.label} logo`} /> : <span className="sm-src-globe"><Icon /></span>}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="sm-src-name">{source.source_name}</h3>
                    <div className="sm-src-meta-line">
                      <span>{meta.label}</span><span aria-hidden="true">•</span>
                      <span className={source.is_connected ? "sm-src-pill sm-src-pill-on" : "sm-src-pill"}><span className="sm-src-dot" />{source.is_connected ? "Connected" : "Disconnected"}</span>
                    </div>
                    {source.last_synced_at && <p className="sm-src-meta">Last synced {format(new Date(source.last_synced_at), "MMM d, yyyy 'at' h:mm a")}</p>}
                    <p className="sm-src-meta">Created {format(new Date(source.created_at), "MMM d, yyyy")}</p>
                    {isWebpage && (hasUrl ? <p className="sm-src-meta truncate">{config?.url as string}</p> : <p className="sm-src-meta">No URL set</p>)}
                  </div>
                  <div className="sm-src-card-actions">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="sm-src-more" aria-label={`More actions for ${source.source_name}`}><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(source)}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(source.id)}><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {isWebpage && hasUrl && (
                      <Button variant="outline" className="sm-src-btn-soft" onClick={() => handleScrapeSource(source)} disabled={isScraping}>
                        {isScraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Import now
                      </Button>
                    )}
                    {isWebpage && !hasUrl && <Button className="sm-src-btn" onClick={() => openEdit(source)}>Add URL</Button>}
                    {isCloud && <Button variant="outline" className="sm-src-btn-soft" onClick={() => setOneDriveOpen(true)}><FolderOpen className="h-4 w-4" />Browse</Button>}
                  </div>
                </div>
                <div className="sm-src-stats">
                  <div><Icon aria-hidden="true" /><span><b>{meta.label}</b><small>Type</small></span></div>
                  <div><CalendarDays aria-hidden="true" /><span><b>{format(new Date(source.created_at), "MMM d, yyyy")}</b><small>Created</small></span></div>
                  <div><Clock aria-hidden="true" /><span><b>{source.last_synced_at ? format(new Date(source.last_synced_at), "MMM d, yyyy") : "Not synced"}</b><small>Last sync</small></span></div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Cloud Storage Integrations */}
      <h2 className="sm-src-h2 mt-8">Cloud Storage Integrations</h2>
      <p className="sm-src-sub">Connect your cloud storage to browse and import files.</p>
      <div className="sm-src-cloud-grid">
        {CLOUD.map((c) => {
          const src = findCloud(c.type);
          return (
            <article key={c.type} className={`sm-src-cloud sm-src-tone-${c.tone}`}>
              <img src={cardFolds} alt="" aria-hidden="true" className="sm-src-ribbon" width={992} height={672} loading="lazy" />
              <img src={c.logo} alt={`${c.name} logo`} className="sm-src-cloud-logo" />
              <div className="min-w-0">
                <h3 className="sm-src-name">{c.name}</h3>
                <p className="sm-src-meta">Browse and import files from {c.name}</p>
                {c.ready ? (
                  <Button className="sm-src-btn mt-3" onClick={() => setOneDriveOpen(true)}>{src?.is_connected ? "Browse files" : "Connect"}</Button>
                ) : (
                  <Button className="sm-src-btn mt-3" disabled>Coming soon</Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div id="reporting-connectors" className="scroll-mt-24"><ReportingConnectors isAdmin={isAdmin} /></div>

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

      <OneDriveBrowserDialog open={oneDriveOpen} onOpenChange={setOneDriveOpen} />

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
