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
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Audience = Tables<"audience_definitions">;

export function AudiencesTab() {
  const { data, isLoading, error, isAdmin, insert, update, remove, isInserting, isUpdating, isDeleting } =
    useStrategyTable<Audience>("audience_definitions");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Audience | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ segment_name: "", description: "", is_active: true });

  const openCreate = () => { setEditing(null); setForm({ segment_name: "", description: "", is_active: true }); setFormOpen(true); };
  const openEdit = (r: Audience) => { setEditing(r); setForm({ segment_name: r.segment_name, description: r.description, is_active: r.is_active }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (editing) await update({ id: editing.id, ...form });
    else await insert(form as Partial<Audience>);
    setFormOpen(false);
  };

  return (
    <div>
      <StrategyTabShell isLoading={isLoading} error={error} isEmpty={data.length === 0} emptyIcon={Users} emptyTitle="No audience segments" emptyDescription="Define your target audience segments."
        emptyAction={isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Segment</Button> : undefined}>
        <div className="flex justify-end mb-4">{isAdmin && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Segment</Button>}</div>
        <div className="grid gap-3">
          {data.map((r) => (
            <Card key={r.id}>
              <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{r.segment_name}</CardTitle>
                  <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">{r.is_active ? "Active" : "Inactive"}</Badge>
                  {r.platforms?.map((p) => <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>)}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit Segment" : "Add Audience Segment"}>
        <div className="space-y-4">
          <div><Label>Segment Name</Label><Input value={form.segment_name} onChange={(e) => setForm((f) => ({ ...f, segment_name: e.target.value }))} placeholder="e.g. CMOs & VPs of Marketing" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} /><Label>Active</Label></div>
          <Button onClick={handleSubmit} disabled={!form.segment_name || !form.description || isInserting || isUpdating} className="w-full">
            {isInserting || isUpdating ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </div>
      </StrategyFormDialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} title="this segment" isPending={isDeleting} />
    </div>
  );
}
