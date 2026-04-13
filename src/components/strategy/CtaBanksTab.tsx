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
import { Megaphone, Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CtaBank = Tables<"cta_banks">;

export function CtaBanksTab() {
  const { data, isLoading, error, isAdmin, insert, update, remove, isInserting, isUpdating, isDeleting } =
    useStrategyTable<CtaBank>("cta_banks");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CtaBank | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ bank_name: "", category: "engagement", ctas: "", is_active: true });

  const openCreate = () => { setEditing(null); setForm({ bank_name: "", category: "engagement", ctas: "", is_active: true }); setFormOpen(true); };
  const openEdit = (r: CtaBank) => { setEditing(r); setForm({ bank_name: r.bank_name, category: r.category, ctas: r.ctas.join("\n"), is_active: r.is_active }); setFormOpen(true); };

  const handleSubmit = async () => {
    const payload = { bank_name: form.bank_name, category: form.category, ctas: form.ctas.split("\n").map((s) => s.trim()).filter(Boolean), is_active: form.is_active };
    if (editing) await update({ id: editing.id, ...payload });
    else await insert(payload as Partial<CtaBank>);
    setFormOpen(false);
  };

  return (
    <div>
      <StrategyTabShell isLoading={isLoading} error={error} isEmpty={data.length === 0} emptyIcon={Megaphone} emptyTitle="No CTA banks" emptyDescription="Organize your calls-to-action by category."
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
                  <span className="text-xs text-muted-foreground">{r.ctas.length} CTAs</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <ul className="list-disc list-inside space-y-0.5">{r.ctas.map((c) => <li key={c} className="text-sm text-muted-foreground">{c}</li>)}</ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit CTA Bank" : "Add CTA Bank"}>
        <div className="space-y-4">
          <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. Engagement CTAs" /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. engagement, traffic, conversion" /></div>
          <div><Label>CTAs (one per line)</Label>
            <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.ctas} onChange={(e) => setForm((f) => ({ ...f, ctas: e.target.value }))} placeholder={"Drop a 🔥 if this resonates\nTag someone who needs this\nSave this for later"} />
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} /><Label>Active</Label></div>
          <Button onClick={handleSubmit} disabled={!form.bank_name || !form.ctas || isInserting || isUpdating} className="w-full">
            {isInserting || isUpdating ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </div>
      </StrategyFormDialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} title="this bank" isPending={isDeleting} />
    </div>
  );
}
