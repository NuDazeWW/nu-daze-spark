import { useState } from "react";
import { useStrategyTable } from "@/hooks/useStrategyTable";
import { StrategyTabShell } from "./StrategyTabShell";
import { StrategyFormDialog } from "./StrategyFormDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Campaign = Tables<"campaign_rules">;

export function CampaignsTab() {
  const { data, isLoading, error, isAdmin, insert, update, remove, isInserting, isUpdating, isDeleting } =
    useStrategyTable<Campaign>("campaign_rules");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ campaign_name: "", description: "", content_pillars: "", start_date: "", end_date: "", is_active: true });

  const openCreate = () => { setEditing(null); setForm({ campaign_name: "", description: "", content_pillars: "", start_date: "", end_date: "", is_active: true }); setFormOpen(true); };
  const openEdit = (r: Campaign) => {
    setEditing(r);
    setForm({
      campaign_name: r.campaign_name,
      description: r.description ?? "",
      content_pillars: r.content_pillars?.join(", ") ?? "",
      start_date: r.start_date ?? "",
      end_date: r.end_date ?? "",
      is_active: r.is_active,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      campaign_name: form.campaign_name,
      description: form.description || null,
      content_pillars: form.content_pillars ? form.content_pillars.split(",").map((s) => s.trim()).filter(Boolean) : [],
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active,
    };
    if (editing) await update({ id: editing.id, ...payload });
    else await insert(payload as Partial<Campaign>);
    setFormOpen(false);
  };

  return (
    <div>
      <StrategyTabShell isLoading={isLoading} error={error} isEmpty={data.length === 0} emptyIcon={Flag} emptyTitle="No campaigns" emptyDescription="Define your campaigns and content pillars."
        emptyAction={isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Campaign</Button> : undefined}>
        <div className="flex justify-end mb-4">{isAdmin && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Campaign</Button>}</div>
        <div className="grid gap-3">
          {data.map((r) => (
            <Card key={r.id}>
              <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{r.campaign_name}</CardTitle>
                  <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">{r.is_active ? "Active" : "Inactive"}</Badge>
                  {r.start_date && <span className="text-xs text-muted-foreground">{format(new Date(r.start_date), "MMM d")} – {r.end_date ? format(new Date(r.end_date), "MMM d, yyyy") : "Ongoing"}</span>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                {r.description && <p className="text-sm text-muted-foreground mb-2">{r.description}</p>}
                {r.content_pillars && r.content_pillars.length > 0 && (
                  <div className="flex flex-wrap gap-1">{r.content_pillars.map((p) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit Campaign" : "Add Campaign"}>
        <div className="space-y-4">
          <div><Label>Campaign Name</Label><Input value={form.campaign_name} onChange={(e) => setForm((f) => ({ ...f, campaign_name: e.target.value }))} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <div><Label>Content Pillars (comma-separated)</Label><Input value={form.content_pillars} onChange={(e) => setForm((f) => ({ ...f, content_pillars: e.target.value }))} placeholder="e.g. Thought Leadership, Case Studies" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} /><Label>Active</Label></div>
          <Button onClick={handleSubmit} disabled={!form.campaign_name || isInserting || isUpdating} className="w-full">
            {isInserting || isUpdating ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </div>
      </StrategyFormDialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} title="this campaign" isPending={isDeleting} />
    </div>
  );
}
