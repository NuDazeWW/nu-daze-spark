import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConnectedSources, type ConnectedSource } from "@/hooks/useConnectedSources";
import { SourceFormDialog, defaultSourceForm, type SourceFormData } from "@/components/sources/SourceFormDialog";
import { DeleteConfirmDialog } from "@/components/strategy/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Link2, Plus, Pencil, Trash2, AlertCircle,
  HardDrive, Globe, Cloud, FolderSync, BookOpen, Database,
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
  const {
    data, isLoading, error,
    insert, update, remove,
    isInserting, isUpdating, isDeleting,
  } = useConnectedSources();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectedSource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<SourceFormData>(defaultSourceForm);

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

      <div className="flex justify-end mb-4">
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
            return (
              <Card key={source.id}>
                <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold">{source.source_name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(source)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(source.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-2">
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                    <Badge variant={source.is_connected ? "default" : "secondary"} className="text-xs">
                      {source.is_connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  {source.last_synced_at && (
                    <p className="text-[10px] text-muted-foreground/60">
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

      <SourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit Source" : "Add Connected Source"}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={isInserting || isUpdating}
      />

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
