import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useActiveClient } from "@/contexts/ClientContext";
import { invokeNotifications } from "./EmailProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, AlertTriangle, Mail, UserPlus, ArrowRight } from "lucide-react";
import notificationsBackground from "@/assets/notifications-workspace-background.jpg";
import type { Tables } from "@/integrations/supabase/types";

type Pref = Tables<"notification_preferences">;
const TZS = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Singapore", "Australia/Sydney", "UTC"];

function PrefCard({ pref, canDelete, onChange }: { pref: Pref; canDelete: boolean; onChange: () => void }) {
  const { clients } = useActiveClient();
  const ws = useWorkspace();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  async function patch(p: Partial<Pref>) {
    const { error } = await supabase.from("notification_preferences").update(p as never).eq("id", pref.id);
    if (error) toast.error(error.message); else onChange();
  }
  async function remove() {
    const { error } = await supabase.from("notification_preferences").delete().eq("id", pref.id);
    if (error) toast.error(error.message); else onChange();
  }
  async function test() {
    setBusy(true);
    try { await invokeNotifications({ action: "test", to: pref.recipient_email }); toast.success(`Test sent to ${pref.recipient_email}`); }
    catch (e) { toast.error((e as Error).message, { duration: 12000 }); } finally { setBusy(false); }
  }
  const ids = pref.client_ids ?? [];
  const canTest = ws.canManage || pref.recipient_email.toLowerCase() === (user?.email ?? "").toLowerCase();
  return (
    <Card className="sm-notifications-preference">
      <CardContent className="py-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold flex-1 min-w-[200px]">{pref.recipient_email} {pref.user_id === user?.id && <Badge variant="outline" className="ml-1">You</Badge>}</p>
          <div className="flex items-center gap-2"><Switch checked={pref.is_active} onCheckedChange={(v) => patch({ is_active: v })} /><span className="text-xs text-muted-foreground">{pref.is_active ? "On" : "Paused"}</span></div>
          {canTest && <Button size="sm" variant="outline" disabled={busy} onClick={test}>{busy && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Send test email</Button>}
          {canDelete && <Button size="icon" variant="ghost" onClick={remove} aria-label="Remove recipient"><Trash2 className="h-4 w-4" /></Button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <Switch checked={pref.daily_digest} onCheckedChange={(v) => patch({ daily_digest: v })} />
            <span><span className="block text-sm font-medium">Posts scheduled today</span><span className="text-xs text-muted-foreground">A morning list of the day's scheduled posts, plus any from yesterday not yet marked posted.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <Switch checked={pref.post_went_out} onCheckedChange={(v) => patch({ post_went_out: v })} />
            <span><span className="block text-sm font-medium">Post went out</span><span className="text-xs text-muted-foreground">Sent as soon as a post is marked Posted, with the live link if saved.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <Switch checked={!!(pref as { weekly_summary?: boolean }).weekly_summary} onCheckedChange={(v) => patch({ weekly_summary: v } as never)} />
            <span><span className="block text-sm font-medium">Weekly summary</span><span className="text-xs text-muted-foreground">Every Monday at the morning hour: last week's posts, approvals, revisions, logged results, and what's coming up.</span></span>
          </label>
          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <Switch checked={!!(pref as { publishing_report?: boolean }).publishing_report} onCheckedChange={(v) => patch({ publishing_report: v } as never)} aria-label="Publishing report" />
            <span className="flex-1">
              <span className="block text-sm font-medium">Publishing report</span>
              <span className="text-xs text-muted-foreground">Published and failed posts by channel with logged results, at the morning hour.</span>
              <select className="mt-2 block h-8 rounded-md border border-input bg-background px-2 text-xs" aria-label="Report frequency"
                value={(pref as { report_frequency?: string }).report_frequency ?? "weekly"}
                onChange={(e) => patch({ report_frequency: e.target.value } as never)}>
                <option value="weekly">Weekly (Mondays)</option>
                <option value="monthly">Monthly (1st of the month)</option>
              </select>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5"><Label className="text-xs">Morning email hour</Label><Input type="time" className="w-32" defaultValue={String(pref.send_time).slice(0, 5)} onBlur={(e) => e.target.value && patch({ send_time: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Time zone</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={pref.time_zone} onChange={(e) => patch({ time_zone: e.target.value })}>
              {Array.from(new Set([pref.time_zone, ...TZS])).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">{ws.entityPlural}</Label>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-1.5"><Checkbox checked={!ids.length} onCheckedChange={() => patch({ client_ids: [] })} />All</label>
              {clients.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5">
                  <Checkbox checked={ids.includes(c.id)} onCheckedChange={(v) => patch({ client_ids: v ? [...ids, c.id] : ids.filter((x) => x !== c.id) })} />{c.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const ws = useWorkspace();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const prefsQ = useQuery({
    queryKey: ["notification_preferences"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_preferences").select("*").order("created_at");
      if (error) throw error;
      return data as Pref[];
    },
  });
  const providerQ = useQuery({
    queryKey: ["email_provider_settings"],
    enabled: ws.canManage,
    queryFn: async () => (await supabase.from("email_provider_settings").select("provider").maybeSingle()).data,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["notification_preferences"] });
  const prefs = prefsQ.data ?? [];
  const mine = prefs.find((p) => p.user_id === user?.id);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

  async function add(recipient: string, forSelf: boolean) {
    if (!user) return;
    const { error } = await supabase.from("notification_preferences").insert({
      recipient_email: recipient.trim().toLowerCase(), user_id: forSelf ? user.id : null, created_by: user.id, time_zone: tz,
    });
    if (error) toast.error(error.message.includes("duplicate") ? "That address is already a recipient" : error.message);
    else { setEmail(""); refresh(); }
  }

  return (
    <div className="sm-reference sm-notifications animate-fade-in space-y-6">
      <img src={notificationsBackground} alt="" aria-hidden="true" className="sm-notifications-background" width={1536} height={1024} />
      <PageHeader title="Notifications" description="Email reminders for the day's scheduled posts and when a post goes out." />

      {ws.canManage && providerQ.data?.provider === "none" && (
        <Card className="border-brand-warning/50"><CardContent className="py-3 flex items-center gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-brand-warning" /><span className="flex-1">No email provider is connected yet, so no emails will send.</span>
          <Button asChild size="sm"><Link to="/settings/email-provider">Connect email provider</Link></Button>
        </CardContent></Card>
      )}

      {prefsQ.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (<>
        {!mine && user?.email && (
          <Card className="sm-notifications-self"><CardContent className="py-4 flex flex-wrap items-center gap-3">
            <span className="sm-notifications-icon" aria-hidden="true"><Mail /></span>
            <p className="text-sm flex-1">Get notifications at <strong>{user.email}</strong>.</p>
            <Button className="sm-notifications-enable" onClick={() => user.email && add(user.email, true)}>Turn on for me<ArrowRight className="h-4 w-4" /></Button>
          </CardContent></Card>
        )}
        {ws.canManage && prefs.length > 1 && (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={async () => { const { error } = await supabase.from("notification_preferences").update({ is_active: false }).in("id", prefs.map((p) => p.id)); if (error) toast.error(error.message); else { refresh(); toast.success("All recipients paused"); } }}>Pause all</Button>
            <Button size="sm" variant="outline" onClick={async () => { const { error } = await supabase.from("notification_preferences").update({ is_active: true }).in("id", prefs.map((p) => p.id)); if (error) toast.error(error.message); else { refresh(); toast.success("All recipients resumed"); } }}>Resume all</Button>
          </div>
        )}
        {prefs.map((p) => <PrefCard key={p.id} pref={p} canDelete={ws.canManage || p.user_id === user?.id} onChange={refresh} />)}
      </>)}

      {ws.canManage && (
        <Card className="sm-notifications-add">
          <span className="sm-notifications-icon sm-notifications-icon-recipient" aria-hidden="true"><UserPlus /></span>
          <CardHeader><CardTitle className="text-base">Add another recipient</CardTitle><CardDescription>For example another admin or a shared team inbox. Only add people who expect these emails.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <div className="sm-notifications-email"><Mail className="h-4 w-4" aria-hidden="true" /><Input className="max-w-sm" type="email" placeholder="name@company.com" aria-label="Recipient email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button variant="outline" disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={() => add(email, false)}><Plus className="mr-2 h-4 w-4" />Add recipient</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
