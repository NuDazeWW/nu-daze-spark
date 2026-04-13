import { useState } from "react";
import { useStrategyTable } from "@/hooks/useStrategyTable";
import { StrategyTabShell } from "./StrategyTabShell";
import { StrategyFormDialog } from "./StrategyFormDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hash, Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type HashtagBank = Tables<"hashtag_banks">;

export function HashtagBanksTab() {
  const { data, isLoading, error, isAdmin, insert, update, remove, isInserting, isUpdating, isDeleting } =
    useStrategyTable<HashtagBank>("hashtag_banks");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HashtagBank | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ bank_name: "", category: "general", hashtags: "", is_active: true });

  const openCreate = () => { setEditing(null); setForm({ bank_name: "", category: "general", hashtags: "", is_active: true }); setFormOpen(true); };
  const openEdit = (r: HashtagBank) => { setEditing(r); setForm({ bank_name: r.bank_name, category: r.category, hashtags: r.hashtags.join(", "), is_active: r.is_active }); setFormOpen(true); };

  const handleSubmit = async () => {
    const payload = { bank_name: form.bank_name, category: form.category, hashtags: form.hashtags.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean).map((h) => `#${h}`), is_active: form.is_active };
    if (editing) await update({ id: editing.id, ...payload });
    else await insert(payload as Partial<HashtagBank>);
    setFormOpen(false);
  };

  return (
    <div>
      <StrategyTabShell isLoading={isLoading} error={error} isEmpty={data.length === 0} emptyIcon={Hash} emptyTitle="No hashtag banks" emptyDescription="Organize your hashtags by category."
        emptyAction={isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Bank</Button> : undefined}>
        <div className="flex justify-end mb-4">{isAdmin && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Bank</Button>}</div>
        <div className="grid gap-3">
          {data.map((r) => (
            <Card key={r.id}>
              <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{r.bank_name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{r.category}</Badge>
                  <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">{r.is_active ? "Active" : "Inactive"}</Badge>
                  <span className="text-xs text-muted-foreground">{r.hashtags.length} tags</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="flex flex-wrap gap-1.5">{r.hashtags.map((h) => <Badge key={h} variant="secondary" className="text-xs font-mono">{h}</Badge>)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit Hashtag Bank" : "Add Hashtag Bank"}>
        <div className="space-y-4">
          <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. Brand Hashtags" /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. brand, industry, campaign" /></div>
          <div><Label>Hashtags (comma-separated)</Label><Input value={form.hashtags} onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))} placeholder="#NuDaze, #SocialStrategy, #ContentOps" /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} /><Label>Active</Label></div>
          <Button onClick={handleSubmit} disabled={!form.bank_name || !form.hashtags || isInserting || isUpdating} className="w-full">
            {isInserting || isUpdating ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </div>
      </StrategyFormDialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} title="this bank" isPending={isDeleting} />
    </div>
  );
}
