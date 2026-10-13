import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminOnly } from "@/components/settings/AdminOnly";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UsageMetersPanel } from "@/components/billing/UsageMetersPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTION_LABEL: Record<string, string> = {
  invite_insert: "Invite created", invite_update: "Invite updated", invite_accepted: "Invite accepted",
  settings_update: "Workspace settings changed", client_insert: "Client/department added", client_delete: "Client/department removed",
  approval_insert: "Approval action", social_account_insert: "Social account added", social_account_delete: "Social account removed",
  role_changed: "Role changed", ownership_transferred: "Ownership transferred", user_removed: "User removed", workspace_reset: "Workspace content reset",
};

function UsageInner() {
  const ws = useWorkspace();
  const usage = useQuery({
    queryKey: ["workspace_usage"],
    queryFn: async () => { const { data, error } = await supabase.rpc("workspace_usage"); if (error) throw error; return data as Record<string, number>; },
  });
  const activity = useQuery({
    queryKey: ["activity_log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const users = useQuery({
    queryKey: ["workspace_users"],
    queryFn: async () => { const { data } = await supabase.rpc("list_workspace_users"); return data ?? []; },
  });
  const who = (id: string | null) => users.data?.find((u) => u.user_id === id)?.email ?? (id ? "Unknown user" : "System");
  const u = usage.data ?? {};
  const s = ws.settings;

  const limitRow = (label: string, used: number, limit: number | null | undefined) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm"><span>{label}</span><span className="font-mono">{used} / {limit ?? "∞"}</span></div>
      {limit ? <Progress value={Math.min(100, (used / limit) * 100)} /> : <Progress value={0} />}
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Usage & activity" description="This month's activity and a log of important workspace changes.">
        <Badge variant="outline">{s?.plan_name ?? "Unlimited"} plan</Badge>
      </PageHeader>
      <UsageMetersPanel />
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Plan limits</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {limitRow("Seats (incl. pending invites)", (u.seats_used ?? 0) + (u.pending_invites ?? 0), s?.seat_limit)}
            {limitRow(ws.entityPlural, u.clients ?? 0, s?.client_limit)}
            <div className="flex justify-between text-sm"><span>Social accounts</span><span className="font-mono">{u.social_accounts ?? 0}</span></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">This month</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["Drafts created", u.drafts_generated], ["AI generation runs", u.generation_runs], ["Comments drafted", u.comments_drafted], ["Preflight reviews", u.preflight_runs], ["Posts approved", u.posts_approved]].map(([l, v]) => (
              <div key={l as string}><div className="text-2xl font-semibold">{(v as number) ?? 0}</div><div className="text-xs text-muted-foreground">{l}</div></div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Activity log</CardTitle></CardHeader>
        <CardContent>
          {(activity.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No activity recorded yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>What</TableHead></TableRow></TableHeader>
              <TableBody>
                {activity.data!.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{who(a.actor_id)}</TableCell>
                    <TableCell className="text-sm">{ACTION_LABEL[a.action] ?? a.action}{(a.details as Record<string, unknown>)?.email ? ` — ${(a.details as Record<string, string>).email}` : ""}{(a.details as Record<string, unknown>)?.role ? ` (${(a.details as Record<string, string>).role})` : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsagePage() {
  return <AdminOnly><UsageInner /></AdminOnly>;
}
