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
import { MessageSquare, Plus, Pencil, Trash2, AudioLines, Ban, Network, FileText, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type BrandVoiceRule = Tables<"brand_voice_rules">;

const ruleAppearance: Record<string, { icon: typeof MessageSquare; tone: string }> = {
  personality: { icon: AudioLines, tone: "cyan" },
  tone: { icon: MessageSquare, tone: "violet" },
  banned_phrases: { icon: Ban, tone: "coral" },
  structure: { icon: Network, tone: "cyan" },
  restrictions: { icon: FileText, tone: "gold" },
  language: { icon: FileText, tone: "coral" },
};

export function BrandVoiceTab() {
  const { data, isLoading, error, isAdmin, insert, update, remove, isInserting, isUpdating, isDeleting } =
    useStrategyTable<BrandVoiceRule>("brand_voice_rules");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BrandVoiceRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ rule_name: "", rule_content: "", category: "general", is_active: true });

  const openCreate = () => {
    setEditing(null);
    setForm({ rule_name: "", rule_content: "", category: "general", is_active: true });
    setFormOpen(true);
  };

  const openEdit = (r: BrandVoiceRule) => {
    setEditing(r);
    setForm({ rule_name: r.rule_name, rule_content: r.rule_content, category: r.category, is_active: r.is_active });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (editing) {
      await update({ id: editing.id, ...form });
    } else {
      await insert(form as Partial<BrandVoiceRule>);
    }
    setFormOpen(false);
  };

  return (
    <div>
      <StrategyTabShell
        isLoading={isLoading}
        error={error}
        isEmpty={data.length === 0}
        emptyIcon={MessageSquare}
        emptyTitle="No brand voice rules"
        emptyDescription="Define your brand's tone, personality, and language rules."
        emptyAction={isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Rule</Button> : undefined}
      >
        <div className="flex justify-end mb-4">
          {isAdmin && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Rule</Button>}
        </div>
        <div className="sm-strategy-rules grid gap-3">
          {data.map((r) => {
            const appearance = ruleAppearance[r.category] ?? { icon: Star, tone: "cyan" };
            const Icon = appearance.icon;
            return (
            <Card key={r.id} className="sm-strategy-rule" data-tone={appearance.tone}>
              <div className="sm-strategy-rule-icon" aria-hidden="true"><Icon /></div>
              <div className="sm-strategy-rule-body">
              <CardHeader className="sm-strategy-rule-heading">
                <div className="sm-strategy-rule-labels">
                  <CardTitle className="text-sm font-semibold">{r.rule_name}</CardTitle>
                  <Badge variant={r.is_active ? "default" : "secondary"} className="sm-strategy-rule-status text-xs">
                    {r.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{r.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="sm-strategy-rule-copy">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.rule_content}</p>
              </CardContent>
              </div>
              {isAdmin && (
                <div className="sm-strategy-rule-actions">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${r.rule_name}`} title={`Edit ${r.rule_name}`} onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${r.rule_name}`} title={`Delete ${r.rule_name}`} onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              )}
            </Card>
          );})}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit Rule" : "Add Brand Voice Rule"}>
        <div className="space-y-4">
          <div><Label>Rule Name</Label><Input value={form.rule_name} onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))} placeholder="e.g. Tone of Voice" /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. tone, language, personality" /></div>
          <div><Label>Rule Content</Label><Textarea value={form.rule_content} onChange={(e) => setForm((f) => ({ ...f, rule_content: e.target.value }))} rows={4} placeholder="Describe the rule…" /></div>
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
