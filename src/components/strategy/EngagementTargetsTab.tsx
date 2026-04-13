import { useState } from "react";
import { useStrategyTable } from "@/hooks/useStrategyTable";
import { StrategyTabShell } from "./StrategyTabShell";
import { StrategyFormDialog } from "./StrategyFormDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type EngagementTarget = Tables<"engagement_targets">;

const PLATFORMS = ["linkedin", "instagram"] as const;

export function EngagementTargetsTab() {
  const { data, isLoading, error, isAdmin, insert, update, remove, isInserting, isUpdating, isDeleting } =
    useStrategyTable<EngagementTarget>("engagement_targets");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EngagementTarget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "linkedin" as "linkedin" | "instagram", daily_target: "5", min_relevance_threshold: "0.7", risk_tolerance: "safe_only", topic_category: "", is_active: true });

  const openCreate = () => { setEditing(null); setForm({ platform: "linkedin", daily_target: "5", min_relevance_threshold: "0.7", risk_tolerance: "safe_only", topic_category: "", is_active: true }); setFormOpen(true); };
  const openEdit = (r: EngagementTarget) => {
    setEditing(r);
    setForm({ platform: r.platform, daily_target: r.daily_target.toString(), min_relevance_threshold: r.min_relevance_threshold.toString(), risk_tolerance: r.risk_tolerance, topic_category: r.topic_category ?? "", is_active: r.is_active });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      platform: form.platform,
      daily_target: parseInt(form.daily_target) || 0,
      min_relevance_threshold: parseFloat(form.min_relevance_threshold) || 0.7,
      risk_tolerance: form.risk_tolerance,
      topic_category: form.topic_category || null,
      is_active: form.is_active,
    };
    if (editing) await update({ id: editing.id, ...payload });
    else await insert(payload as Partial<EngagementTarget>);
    setFormOpen(false);
  };

  return (
    <div>
      <StrategyTabShell isLoading={isLoading} error={error} isEmpty={data.length === 0} emptyIcon={Target} emptyTitle="No engagement targets" emptyDescription="Set daily comment targets and relevance thresholds."
        emptyAction={isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Target</Button> : undefined}>
        <div className="flex justify-end mb-4">{isAdmin && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Target</Button>}</div>
        <div className="grid gap-3">
          {data.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs capitalize">{r.platform}</Badge>
                  <span className="text-sm font-medium text-foreground">{r.daily_target} comments/day</span>
                  <span className="text-xs text-muted-foreground">Min relevance: {r.min_relevance_threshold}</span>
                  <Badge variant="secondary" className="text-xs">{r.risk_tolerance}</Badge>
                  {r.topic_category && <Badge variant="outline" className="text-xs">{r.topic_category}</Badge>}
                  <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">{r.is_active ? "Active" : "Off"}</Badge>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit Engagement Target" : "Add Engagement Target"}>
        <div className="space-y-4">
          <div><Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Daily Comment Target</Label><Input type="number" min="0" value={form.daily_target} onChange={(e) => setForm((f) => ({ ...f, daily_target: e.target.value }))} /></div>
          <div><Label>Min Relevance Threshold (0–1)</Label><Input type="number" step="0.05" min="0" max="1" value={form.min_relevance_threshold} onChange={(e) => setForm((f) => ({ ...f, min_relevance_threshold: e.target.value }))} /></div>
          <div><Label>Risk Tolerance</Label>
            <Select value={form.risk_tolerance} onValueChange={(v) => setForm((f) => ({ ...f, risk_tolerance: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="safe_only">Safe Only</SelectItem>
                <SelectItem value="low_risk">Low Risk</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Topic Category (optional)</Label><Input value={form.topic_category} onChange={(e) => setForm((f) => ({ ...f, topic_category: e.target.value }))} placeholder="e.g. marketing, tech, growth" /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} /><Label>Active</Label></div>
          <Button onClick={handleSubmit} disabled={isInserting || isUpdating} className="w-full">
            {isInserting || isUpdating ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </div>
      </StrategyFormDialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} title="this target" isPending={isDeleting} />
    </div>
  );
}
