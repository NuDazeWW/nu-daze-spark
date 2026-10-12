import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminOnly } from "@/components/settings/AdminOnly";
import { useWorkspace, ROLE_META, type WorkspaceRole, markSetupStep } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Crown, UserMinus, X } from "lucide-react";

const ASSIGNABLE: WorkspaceRole[] = ["admin", "editor", "reviewer", "viewer"];

function TeamInner() {
  const ws = useWorkspace();
  const { user } = useAuth();
  const { clients } = useActiveClient();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("editor");
  const [clientIds, setClientIds] = useState<string[]>([]);

  const users = useQuery({
    queryKey: ["workspace_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_workspace_users");
      if (error) throw error;
      return data ?? [];
    },
  });
  const invites = useQuery({
    queryKey: ["workspace_invites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_invites").select("*").eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["workspace_users"] }); qc.invalidateQueries({ queryKey: ["workspace_invites"] }); };
  const onErr = (e: Error) => toast.error(e.message);

  const invite = useMutation({
    mutationFn: async () => {
      const clean = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(clean)) throw new Error("Enter a valid email address");
      const { error } = await supabase.from("workspace_invites").insert({ email: clean, role, client_ids: clientIds, invited_by: user!.id } as never);
      if (error) throw error;
      if (!ws.progress.team) await markSetupStep(ws.progress, "team");
    },
    onSuccess: () => { toast.success("Invite created — share the sign-up link with them"); setEmail(""); setClientIds([]); refresh(); ws.refresh(); },
    onError: onErr,
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("workspace_invites").update({ status: "revoked" } as never).eq("id", id); if (error) throw error; },
    onSuccess: refresh, onError: onErr,
  });
  const setUserRole = useMutation({
    mutationFn: async (v: { id: string; role: WorkspaceRole }) => { const { error } = await supabase.rpc("set_workspace_role", { _user_id: v.id, _role: v.role }); if (error) throw error; },
    onSuccess: () => { toast.success("Role updated"); refresh(); }, onError: onErr,
  });
  const removeUser = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("remove_workspace_user", { _user_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success("User removed"); refresh(); }, onError: onErr,
  });
  const transfer = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("transfer_ownership", { _new_owner: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Ownership transferred"); refresh(); ws.refresh(); }, onError: onErr,
  });

  const seatsUsed = (users.data?.length ?? 0) + (invites.data?.length ?? 0);
  const limit = ws.settings?.seat_limit;
  const signupLink = `${window.location.origin}/auth`;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Team" description="Invite teammates, set their role and choose which {label} they can work in.".replace("{label}", ws.entityPlural.toLowerCase())}>
        <Badge variant="outline" className="font-mono">{seatsUsed} / {limit ?? "∞"} seats</Badge>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle className="text-base">Invite someone</CardTitle>
          <CardDescription>They get access the moment they sign up with this email at <button className="underline" onClick={() => { navigator.clipboard.writeText(signupLink); toast.success("Link copied"); }}>{signupLink} <Copy className="inline h-3 w-3" /></button></CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] items-end">
            <div className="space-y-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></div>
            <div className="space-y-1.5"><Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as WorkspaceRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSIGNABLE.map((r) => <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => invite.mutate()} disabled={invite.isPending || (limit != null && seatsUsed >= limit)}>Create invite</Button>
          </div>
          <p className="text-xs text-muted-foreground">{ROLE_META[role].description}</p>
          {role !== "admin" && (
            <div className="space-y-1.5"><Label>{ws.entityPlural} they can access</Label>
              <div className="flex flex-wrap gap-4">
                {clients.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={clientIds.includes(c.id)} onCheckedChange={(v) => setClientIds((p) => v ? [...p, c.id] : p.filter((x) => x !== c.id))} />{c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {limit != null && seatsUsed >= limit && <p className="text-sm text-destructive">Seat limit reached. Remove someone or ask the Owner to raise the limit.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Person</TableHead><TableHead>Role</TableHead><TableHead>Last sign-in</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(users.data ?? []).map((u) => {
                const isOwnerRow = u.role === "owner";
                const self = u.user_id === user?.id;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell><div className="font-medium">{u.display_name ?? u.email}</div><div className="text-xs text-muted-foreground">{u.email}</div></TableCell>
                    <TableCell>
                      {isOwnerRow ? <Badge><Crown className="mr-1 h-3 w-3" />Owner</Badge> : (
                        <Select value={u.role ?? "viewer"} disabled={self} onValueChange={(v) => setUserRole.mutate({ id: u.user_id, role: v as WorkspaceRole })}>
                          <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{ASSIGNABLE.map((r) => <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {ws.isOwner && !isOwnerRow && (
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Make ${u.email} the Owner? You'll become an Admin.`)) transfer.mutate(u.user_id); }}><Crown className="mr-1 h-3.5 w-3.5" />Make owner</Button>
                      )}
                      {!isOwnerRow && !self && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Remove ${u.email} from the workspace?`)) removeUser.mutate(u.user_id); }}><UserMinus className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending invites</CardTitle></CardHeader>
        <CardContent>
          {(invites.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No pending invites.</p> : (
            <ul className="divide-y divide-border">
              {invites.data!.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{i.email} <Badge variant="outline" className="ml-2">{ROLE_META[i.role as WorkspaceRole]?.label ?? i.role}</Badge></span>
                  <Button size="sm" variant="ghost" onClick={() => revoke.mutate(i.id)}><X className="mr-1 h-3.5 w-3.5" />Revoke</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeamPage() {
  return <AdminOnly><TeamInner /></AdminOnly>;
}
