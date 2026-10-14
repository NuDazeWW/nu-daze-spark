import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Circle, MessageSquare, Send, Undo2 } from "lucide-react";

type WsUser = { user_id: string; email: string; display_name: string | null; role: string };

export function useWorkspaceUsers() {
  return useQuery({
    queryKey: ["workspace_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_workspace_users");
      if (error) throw error;
      return (data ?? []) as WsUser[];
    },
  });
}

export function useBriefComments(briefId?: string) {
  return useQuery({
    queryKey: ["brief_comments", briefId],
    enabled: !!briefId,
    queryFn: async () => {
      const { data, error } = await supabase.from("brief_comments").select("*").eq("brief_id", briefId!).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBriefLog(briefId?: string) {
  return useQuery({
    queryKey: ["brief_log", briefId],
    enabled: !!briefId,
    queryFn: async () => {
      const { data, error } = await supabase.from("brief_approval_log").select("*").eq("brief_id", briefId!).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

const nameOf = (users: WsUser[] | undefined, id?: string | null) => {
  const u = users?.find((x) => x.user_id === id);
  return u?.display_name || u?.email || "Team member";
};
const notify = (brief_id: string, event: string) =>
  supabase.functions.invoke("notifications", { body: { action: "brief_event", brief_id, event } }).catch(() => {});

/** Approval actions: send for approval, approve, request revisions. */
export function BriefApprovalActions({ brief, canApprove, blocked }: { brief: any; canApprove: boolean; blocked: boolean }) {
  const qc = useQueryClient();
  const { role } = useWorkspace();
  const users = useWorkspaceUsers();
  const [sendOpen, setSendOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  const [approver, setApprover] = useState<string>("pool");
  const [note, setNote] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["briefs"] }); qc.invalidateQueries({ queryKey: ["brief_log", brief.id] }); };
  const approvers = (users.data ?? []).filter((u) => ["reviewer", "admin", "owner"].includes(u.role));
  const canSubmit = role !== "viewer" && role !== null;

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("submit_brief", { _brief_id: brief.id, _approver: approver === "pool" ? null : approver, _note: note } as never);
      if (error) throw error;
      await notify(brief.id, "submitted");
    },
    onSuccess: () => { toast.success("Sent for approval"); setSendOpen(false); setNote(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const decide = useMutation({
    mutationFn: async (v: { decision: "approved" | "needs_revision"; notes?: string }) => {
      const { error } = await supabase.rpc("decide_brief", { _brief_id: brief.id, _decision: v.decision, _notes: v.notes ?? "" } as never);
      if (error) throw error;
      await notify(brief.id, v.decision);
    },
    onSuccess: (_d, v) => { toast.success(v.decision === "approved" ? "Brief approved" : "Revisions requested"); setRevOpen(false); setNote(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {(brief.status === "draft" || brief.status === "needs_revision") && canSubmit && (
        <Button size="sm" disabled={blocked} onClick={() => setSendOpen(true)}><Send className="h-4 w-4 mr-1" />Send for approval</Button>
      )}
      {brief.status === "in_review" && canApprove && (
        <>
          <Button variant="outline" size="sm" onClick={() => setRevOpen(true)}><Undo2 className="h-4 w-4 mr-1" />Request revisions</Button>
          <Button size="sm" disabled={blocked || decide.isPending} onClick={() => decide.mutate({ decision: "approved" })}><CheckCircle2 className="h-4 w-4 mr-1" />Approve brief</Button>
        </>
      )}

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send for approval</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Approver</Label>
              <Select value={approver} onValueChange={setApprover}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pool">Any Approver or Admin</SelectItem>
                  {approvers.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">A named Approver signs off; Admins can always step in.</p>
            </div>
            <div className="space-y-1.5"><Label>Note for the approver (optional)</Label><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button disabled={submit.isPending} onClick={() => submit.mutate()}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revOpen} onOpenChange={setRevOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request revisions</DialogTitle></DialogHeader>
          <div className="space-y-1.5"><Label>What needs to change? *</Label><Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
            <p className="text-xs text-muted-foreground">These notes are shared with the author and help the AI avoid the same issues next time.</p></div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevOpen(false)}>Cancel</Button>
            <Button disabled={!note.trim() || decide.isPending} onClick={() => decide.mutate({ decision: "needs_revision", notes: note })}>Request revisions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Single chronological discussion stream with check-offs, plus approval history. */
export function BriefDiscussion({ brief }: { brief: any }) {
  const { user } = useAuth();
  const { role } = useWorkspace();
  const qc = useQueryClient();
  const users = useWorkspaceUsers();
  const comments = useBriefComments(brief.id);
  const log = useBriefLog(brief.id);
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(true);
  const canResolve = role !== null && role !== "viewer";

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brief_comments").insert({ brief_id: brief.id, author_id: user!.id, body: text.trim() } as never);
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["brief_comments", brief.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (v: { id: string; resolved: boolean }) => {
      const { error } = await supabase.from("brief_comments").update({ is_resolved: v.resolved } as never).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brief_comments", brief.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const all = comments.data ?? [];
  const open = all.filter((c: any) => !c.is_resolved).length;
  // Merge comments and approval events into one chronological stream.
  const stream = [
    ...all.filter((c: any) => showAll || !c.is_resolved).map((c: any) => ({ kind: "comment" as const, at: c.created_at, c })),
    ...(showAll ? (log.data ?? []).map((l: any) => ({ kind: "event" as const, at: l.created_at, l })) : []),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const EVENT: Record<string, string> = { submitted: "sent for approval", needs_revision: "requested revisions", approved: "approved the brief" };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" />Feedback & discussion</h3>
        <div className="flex gap-1">
          <Button size="sm" variant={showAll ? "secondary" : "ghost"} onClick={() => setShowAll(true)}>All</Button>
          <Button size="sm" variant={!showAll ? "secondary" : "ghost"} onClick={() => setShowAll(false)}>Open items ({open})</Button>
        </div>
      </div>

      <div className="space-y-3">
        {stream.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {stream.map((s) => s.kind === "event" ? (
          <div key={`e${s.l.id}`} className="text-xs text-muted-foreground font-mono">
            {new Date(s.at).toLocaleString()} · {nameOf(users.data, s.l.actor_id)} {EVENT[s.l.action]} (v{s.l.brief_version}){s.l.notes ? ` — “${s.l.notes}”` : ""}
          </div>
        ) : (
          <div key={s.c.id} className={`flex gap-3 rounded-lg border border-border p-3 ${s.c.is_resolved ? "opacity-60" : ""}`}>
            <div className="pt-0.5">
              {canResolve ? (
                <Checkbox checked={s.c.is_resolved} aria-label="Mark as resolved" onCheckedChange={(v) => toggle.mutate({ id: s.c.id, resolved: !!v })} />
              ) : s.c.is_resolved ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-medium">{nameOf(users.data, s.c.author_id)}</span>
                <span className="text-muted-foreground font-mono">{new Date(s.c.created_at).toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px] font-mono">v{s.c.brief_version}</Badge>
                {s.c.brief_version < brief.version && <Badge variant="secondary" className="text-[10px]">Addressed in v{s.c.brief_version}</Badge>}
              </div>
              <p className="text-sm mt-1 whitespace-pre-line">{s.c.body}</p>
              {s.c.is_resolved && <p className="text-xs text-muted-foreground mt-1">Checked off by {nameOf(users.data, s.c.resolved_by)} · {new Date(s.c.resolved_at).toLocaleString()}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <Textarea rows={2} placeholder="Add a comment…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex justify-end"><Button size="sm" disabled={!text.trim() || add.isPending} onClick={() => add.mutate()}>Post comment</Button></div>
      </div>
    </Card>
  );
}
