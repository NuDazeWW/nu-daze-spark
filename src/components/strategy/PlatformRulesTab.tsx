import { useState } from "react";
import { PlatformOption } from "@/components/layout/PlatformIcon";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type PlatformRule = Tables<"platform_rules">;

export function PlatformRulesTab() {
  const { data, isLoading, error, isAdmin, insert, update, remove, isInserting, isUpdating, isDeleting } =
    useStrategyTable<PlatformRule>("platform_rules");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ rule_name: "", rule_content: "", platform: "linkedin" as "linkedin" | "instagram" | "facebook" | "youtube" | "x", char_limit: "", is_active: true });

  const openCreate = () => {
    setEditing(null);
    setForm({ rule_name: "", rule_content: "", platform: "linkedin", char_limit: "", is_active: true });
    setFormOpen(true);
  };

  const openEdit = (r: PlatformRule) => {
    setEditing(r);
    setForm({ rule_name: r.rule_name, rule_content: r.rule_content, platform: r.platform, char_limit: r.char_limit?.toString() ?? "", is_active: r.is_active });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { rule_name: form.rule_name, rule_content: form.rule_content, platform: form.platform, char_limit: form.char_limit ? parseInt(form.char_limit) : null, is_active: form.is_active };
    if (editing) await update({ id: editing.id, ...payload });
    else await insert(payload as Partial<PlatformRule>);
    setFormOpen(false);
  };

  return (
    <div>
      <StrategyTabShell isLoading={isLoading} error={error} isEmpty={data.length === 0} emptyIcon={FileText} emptyTitle="No platform rules" emptyDescription="Set character limits and formatting rules per platform."
        emptyAction={isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Rule</Button> : undefined}>
        <div className="flex justify-end mb-4">
          {isAdmin && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Rule</Button>}
        </div>
        <div className="grid gap-3">
          {data.map((r) => (
            <Card key={r.id}>
              <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{r.rule_name}</CardTitle>
                  <Badge variant="outline" className="text-xs capitalize">{r.platform}</Badge>
                  {r.char_limit && <Badge variant="secondary" className="text-xs">{r.char_limit} chars</Badge>}
                  <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">{r.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.rule_content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit Platform Rule" : "Add Platform Rule"}>
        <div className="space-y-4">
          <div><Label>Rule Name</Label><Input value={form.rule_name} onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))} /></div>
          <div><Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v as "linkedin" | "instagram" | "facebook" | "youtube" | "x" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><PlatformOption value="linkedin" /><PlatformOption value="facebook" /><PlatformOption value="instagram" /></SelectContent>
            </Select>
          </div>
          <div><Label>Character Limit</Label><Input type="number" value={form.char_limit} onChange={(e) => setForm((f) => ({ ...f, char_limit: e.target.value }))} placeholder="Optional" /></div>
          <div><Label>Rule Content</Label><Textarea value={form.rule_content} onChange={(e) => setForm((f) => ({ ...f, rule_content: e.target.value }))} rows={4} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} /><Label>Active</Label></div>
          <Button onClick={handleSubmit} disabled={!form.rule_name || !form.rule_content || isInserting || isUpdating} className="w-full">
            {isInserting || isUpdating ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </div>
      </StrategyFormDialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} title="this rule" isPending={isDeleting} />
    </div>
  );
}
