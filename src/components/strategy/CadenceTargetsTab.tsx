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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CadenceTarget = Tables<"cadence_targets">;

const CONTENT_TYPES = ["post", "story", "reel", "article", "carousel", "comment"] as const;
const PLATFORMS = ["linkedin", "instagram", "facebook"] as const;

export function CadenceTargetsTab() {
  const { data, isLoading, error, isAdmin, insert, update, remove, isInserting, isUpdating, isDeleting } =
    useStrategyTable<CadenceTarget>("cadence_targets");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CadenceTarget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "linkedin" as "linkedin" | "instagram" | "facebook" | "youtube" | "x", content_type: "post" as "post" | "story" | "reel" | "article" | "carousel" | "comment", daily_target: "1", weekly_target: "5", is_active: true });

  const openCreate = () => { setEditing(null); setForm({ platform: "linkedin", content_type: "post", daily_target: "1", weekly_target: "5", is_active: true }); setFormOpen(true); };
  const openEdit = (r: CadenceTarget) => {
    setEditing(r);
    setForm({ platform: r.platform, content_type: r.content_type, daily_target: r.daily_target.toString(), weekly_target: r.weekly_target.toString(), is_active: r.is_active });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { platform: form.platform, content_type: form.content_type, daily_target: parseInt(form.daily_target) || 0, weekly_target: parseInt(form.weekly_target) || 0, is_active: form.is_active };
    if (editing) await update({ id: editing.id, ...payload });
    else await insert(payload as Partial<CadenceTarget>);
    setFormOpen(false);
  };

  // Group by platform
  const grouped = PLATFORMS.map((p) => ({ platform: p, targets: data.filter((d) => d.platform === p) }));

  return (
    <div>
      <StrategyTabShell isLoading={isLoading} error={error} isEmpty={data.length === 0} emptyIcon={CalendarClock} emptyTitle="No cadence targets" emptyDescription="Set daily and weekly content targets per platform."
        emptyAction={isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Target</Button> : undefined}>
        <div className="flex justify-end mb-4">{isAdmin && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Target</Button>}</div>
        <div className="space-y-6">
          {grouped.filter((g) => g.targets.length > 0).map((g) => (
            <div key={g.platform}>
              <h3 className="text-sm font-semibold capitalize mb-3 text-foreground">{g.platform}</h3>
              <div className="grid gap-2">
                {g.targets.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs capitalize">{r.content_type}</Badge>
                        <span className="text-sm text-foreground font-medium">{r.daily_target}/day · {r.weekly_target}/week</span>
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
            </div>
          ))}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit Cadence Target" : "Add Cadence Target"}>
        <div className="space-y-4">
          <div><Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v as "linkedin" | "instagram" | "facebook" | "youtube" | "x" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Content Type</Label>
            <Select value={form.content_type} onValueChange={(v) => setForm((f) => ({ ...f, content_type: v as typeof form.content_type }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTENT_TYPES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Daily Target</Label><Input type="number" min="0" value={form.daily_target} onChange={(e) => setForm((f) => ({ ...f, daily_target: e.target.value }))} /></div>
            <div><Label>Weekly Target</Label><Input type="number" min="0" value={form.weekly_target} onChange={(e) => setForm((f) => ({ ...f, weekly_target: e.target.value }))} /></div>
          </div>
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
