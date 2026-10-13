import { useState } from "react";
import { useVoiceProfiles, type VoiceProfile } from "@/hooks/useVoiceProfiles";
import { useAuth } from "@/hooks/useAuth";
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
import { Mic, Plus, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";

const empty = {
  name: "", role_title: "", linkedin_url: "", sample_posts: "",
  voice_traits: "", topics: "", banned_phrases: "", pov_statement: "", is_active: true,
};
type Form = typeof empty;

const toList = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const fromList = (a: string[] | null) => (a ?? []).join("\n");

export function VoicesTab() {
  const { isAdmin } = useAuth();
  const { profiles, isLoading, save, remove, analyze } = useVoiceProfiles();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VoiceProfile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const openCreate = () => { setEditing(null); setForm(empty); setFormOpen(true); };
  const openEdit = (p: VoiceProfile) => {
    setEditing(p);
    setForm({
      name: p.name, role_title: p.role_title ?? "", linkedin_url: p.linkedin_url ?? "",
      sample_posts: fromList(p.sample_posts), voice_traits: fromList(p.voice_traits),
      topics: fromList(p.topics), banned_phrases: fromList(p.banned_phrases),
      pov_statement: p.pov_statement ?? "", is_active: p.is_active,
    });
    setFormOpen(true);
  };

  const runAnalyze = async () => {
    const samples = form.sample_posts.split(/\n\s*---+\s*\n|\n\n\n+/).map((s) => s.trim()).filter(Boolean);
    const res = await analyze.mutateAsync({ name: form.name, role_title: form.role_title || undefined, sample_posts: samples });
    setForm((f) => ({
      ...f,
      voice_traits: res.voice_traits.join("\n"),
      topics: res.topics.join("\n"),
      banned_phrases: res.banned_phrases.join("\n"),
      pov_statement: res.pov_statement,
    }));
  };

  const handleSubmit = async () => {
    await save.mutateAsync({
      ...(editing ? { id: editing.id } : {}),
      name: form.name,
      role_title: form.role_title || null,
      linkedin_url: form.linkedin_url || null,
      sample_posts: form.sample_posts.split(/\n\s*---+\s*\n|\n\n\n+/).map((s) => s.trim()).filter(Boolean),
      voice_traits: toList(form.voice_traits),
      topics: toList(form.topics),
      banned_phrases: toList(form.banned_phrases),
      pov_statement: form.pov_statement || null,
      is_active: form.is_active,
    });
    setFormOpen(false);
  };

  const canAnalyze = form.name.trim().length > 0 &&
    form.sample_posts.split(/\n\s*---+\s*\n|\n\n\n+/).filter((s) => s.trim()).length >= 2;

  return (
    <div>
      <StrategyTabShell
        isLoading={isLoading}
        error={null}
        isEmpty={profiles.length === 0}
        emptyIcon={Mic}
        emptyTitle="No executive voices"
        emptyDescription="Capture how a leader actually writes, so drafts can be written in their voice — not just the brand's."
        emptyAction={isAdmin ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Voice</Button> : undefined}
      >
        <div className="flex justify-end mb-4">
          {isAdmin && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Voice</Button>}
        </div>
        <div className="grid gap-3">
          {profiles.map((p) => (
            <Card key={p.id}>
              <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm font-semibold">{p.name}</CardTitle>
                  {p.role_title && <span className="text-xs text-muted-foreground">{p.role_title}</span>}
                  <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0 space-y-1.5">
                {p.pov_statement && <p className="text-sm">{p.pov_statement}</p>}
                {(p.voice_traits ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.voice_traits.map((t) => <Badge key={t} variant="outline" className="text-[11px]">{t}</Badge>)}
                  </div>
                )}
                {(p.topics ?? []).length > 0 && (
                  <p className="text-xs text-muted-foreground">Topics: {p.topics.join(" · ")}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </StrategyTabShell>

      <StrategyFormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? `Edit ${editing.name}` : "Add Executive Voice"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sarah Chen" /></div>
            <div><Label>Role</Label><Input value={form.role_title} onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))} placeholder="e.g. CEO" /></div>
          </div>
          <div><Label>LinkedIn URL (optional)</Label><Input value={form.linkedin_url} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://www.linkedin.com/in/…" /></div>
          <div>
            <Label>Sample posts (paste 2–10, separated by a blank line or ---)</Label>
            <Textarea value={form.sample_posts} onChange={(e) => setForm((f) => ({ ...f, sample_posts: e.target.value }))} rows={6} placeholder="Paste real posts written by this person…" />
          </div>
          <Button variant="outline" onClick={runAnalyze} disabled={!canAnalyze || analyze.isPending} className="w-full">
            {analyze.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyze samples with AI
          </Button>
          <div><Label>Voice traits (one per line)</Label><Textarea value={form.voice_traits} onChange={(e) => setForm((f) => ({ ...f, voice_traits: e.target.value }))} rows={3} /></div>
          <div><Label>Signature topics (one per line)</Label><Textarea value={form.topics} onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))} rows={2} /></div>
          <div><Label>Phrases/styles to avoid (one per line)</Label><Textarea value={form.banned_phrases} onChange={(e) => setForm((f) => ({ ...f, banned_phrases: e.target.value }))} rows={2} /></div>
          <div><Label>Point of view</Label><Textarea value={form.pov_statement} onChange={(e) => setForm((f) => ({ ...f, pov_statement: e.target.value }))} rows={2} placeholder="What this person stands for, in one sentence" /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} /><Label>Active</Label></div>
          <Button onClick={handleSubmit} disabled={!form.name || save.isPending} className="w-full">
            {save.isPending ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </div>
      </StrategyFormDialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await remove.mutateAsync(deleteId); setDeleteId(null); } }} title="this voice profile" isPending={remove.isPending} />
    </div>
  );
}
