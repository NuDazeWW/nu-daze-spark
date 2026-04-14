import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAccountTags } from "@/hooks/useAccountTags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Shield, Power, PowerOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function AccountTags() {
  const { tags, isLoading, isAdmin, insertTag, updateTag, deleteTag } = useAccountTags();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; handle: string; display_name: string; is_default: boolean; is_system: boolean } | null>(null);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const openCreate = () => { setEditing(null); setHandle(""); setDisplayName(""); setIsDefault(false); setDialogOpen(true); };
  const openEdit = (t: typeof tags[0]) => {
    setEditing({ id: t.id, handle: t.handle, display_name: t.display_name ?? "", is_default: t.is_default, is_system: t.is_system });
    setHandle(t.handle); setDisplayName(t.display_name ?? ""); setIsDefault(t.is_default); setDialogOpen(true);
  };

  const handleSubmit = () => {
    const h = handle.trim().startsWith("@") ? handle.trim().toLowerCase() : `@${handle.trim().toLowerCase()}`;
    if (!h || h === "@") return;
    if (editing) {
      updateTag.mutate({ id: editing.id, handle: h, display_name: displayName.trim() || undefined, is_default: isDefault });
    } else {
      insertTag.mutate({ handle: h, display_name: displayName.trim() || undefined, is_default: isDefault });
    }
    setDialogOpen(false);
  };

  const toggleActive = (t: typeof tags[0]) => {
    updateTag.mutate({ id: t.id, is_active: !t.is_active });
  };

  if (!isAdmin) return <div className="p-8 text-muted-foreground">Admin access required.</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Account Tags" description="Manage social account tags used across all post workflows. Tags marked as default auto-populate on new assets.">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Tag</Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No account tags yet. Add your first one above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((t) => (
            <Card key={t.id} className={!t.is_active ? "opacity-50" : ""}>
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm">{t.handle}</p>
                    {t.is_system && (
                      <Tooltip>
                        <TooltipTrigger><Shield className="h-3.5 w-3.5 text-primary" /></TooltipTrigger>
                        <TooltipContent>System-protected tag — cannot be deleted</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  {t.display_name && <p className="text-xs text-muted-foreground">{t.display_name}</p>}
                  <div className="flex gap-1 mt-1">
                    {t.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                    {!t.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(t)}>
                        {t.is_active ? <PowerOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Power className="h-3.5 w-3.5 text-primary" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t.is_active ? "Deactivate" : "Reactivate"}</TooltipContent>
                  </Tooltip>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  {!t.is_system && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTag.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Tag" : "Add Tag"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Handle <span className="text-destructive">*</span></Label>
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@nudazeworldwide" />
              <p className="text-[10px] text-muted-foreground mt-1">Handles are auto-lowercased and prefixed with @</p>
            </div>
            <div>
              <Label>Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="NuDaze Worldwide" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label>Auto-select on new assets</Label>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={!handle.trim() || insertTag.isPending || updateTag.isPending}>
              {editing ? "Update" : "Add"} Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
