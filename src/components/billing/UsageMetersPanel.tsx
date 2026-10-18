import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { fmtUsd, meterTone, useBilling } from "@/hooks/useBilling";
import { AddonGrantPanel } from "@/components/billing/AddonGrantPanel";
import { cn } from "@/lib/utils";

const BUCKET_LABEL: Record<string, string> = { credits: "Media credits", text_drafts: "AI text drafts", x_spend: "X spend", video_draft: "Draft clips", video_premium: "Premium clips" };

export function UsageMetersPanel() {
  const { meters, snapshot, daysLeft, refresh } = useBilling();
  const [resume, setResume] = useState<null | { id: string; bucket: string; projected: number; label: string; requires_owner: boolean }>(null);
  const alerts = useQuery({
    queryKey: ["guardrail_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guardrail_alerts").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
  const byCap = useQuery({
    queryKey: ["usage_by_capability", snapshot?.billing.cycle_start],
    enabled: Boolean(snapshot),
    queryFn: async () => {
      const { data } = await supabase.from("usage_events").select("bucket,capability,credits,cost_cents,client_id").gte("created_at", snapshot!.billing.cycle_start).limit(5000);
      const m = new Map<string, { units: number; cost: number; n: number }>();
      (data ?? []).forEach((e) => { const k = `${e.bucket}:${e.capability}`; const r = m.get(k) ?? { units: 0, cost: 0, n: 0 }; r.units += e.credits; r.cost += Number(e.cost_cents); r.n++; m.set(k, r); });
      return [...m.entries()];
    },
  });
  if (!meters || !snapshot) return null;
  const a = snapshot.tier.allowances;
  const rows = [
    { key: "credits", label: "Media credits", used: meters.credits.used, total: meters.credits.total, fmt: (n: number) => n.toLocaleString() },
    { key: "text_drafts", label: "AI text drafts", used: meters.text_drafts.used, total: meters.text_drafts.total, fmt: (n: number) => n.toLocaleString() },
    { key: "x_spend", label: "X spend", used: meters.x_spend.used, total: meters.x_spend.total, fmt: (n: number) => fmtUsd(n, 2) },
    { key: "video_draft", label: "Draft video clips", used: meters.video_draft.used, total: meters.video_draft.total, fmt: (n: number) => n.toLocaleString() },
    { key: "video_premium", label: "Premium video clips", used: meters.video_premium.used, total: meters.video_premium.total, fmt: (n: number) => n.toLocaleString() },
    { key: "storage", label: "Storage", used: meters.storage.used, total: meters.storage.total, fmt: (n: number) => `${(n / 1024 ** 3).toFixed(2)} GB` },
  ];
  const open = (alerts.data ?? []).filter((x) => x.status === "open");
  const notices = (alerts.data ?? []).filter((x) => x.status === "notice" && Date.now() - new Date(x.created_at).getTime() < 7 * 86400000);

  const doResume = async () => {
    if (!resume) return;
    const { error } = await supabase.rpc("resume_guardrail_bucket", { _alert_id: resume.id });
    if (error) return toast.error(error.message);
    toast.success(`${BUCKET_LABEL[resume.bucket]} resumed`);
    setResume(null); refresh(); alerts.refetch();
  };

  return (
    <div className="space-y-4">
      {notices.map((al) => (
        <div key={al.id} className="rounded-lg border p-3 text-sm">
          <p className="font-medium">{al.threshold_type === "velocity" ? "Velocity alert" : "Progress alert"} · {BUCKET_LABEL[al.bucket] ?? al.bucket} — {al.threshold_label}</p>
          <p className="text-xs text-muted-foreground">Notification only; nothing is paused. Usage stops only at 100% of the allowance. {new Date(al.created_at).toLocaleString()}</p>
        </div>
      ))}
      {open.map((al) => (
        <div key={al.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <div className="flex-1">
            <p className="font-medium">{BUCKET_LABEL[al.bucket]} paused — {al.threshold_label}</p>
            <p className="text-xs text-muted-foreground">Spent this cycle {fmtUsd(Number(al.spend_cents), 2)} · projected month-end {fmtUsd(Number(al.projected_month_end_cents), 2)} at this pace · trip {al.trip_number} this cycle{al.requires_owner && " · owner approval required"}</p>
          </div>
          {snapshot.can_control_spend && (
            <Button size="sm" variant="outline" onClick={() => setResume({ id: al.id, bucket: al.bucket, projected: Number(al.projected_month_end_cents), label: al.threshold_label, requires_owner: al.requires_owner })}>Review & resume</Button>
          )}
        </div>
      ))}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>This cycle</CardTitle>
            <CardDescription>{snapshot.tier.name} plan (v{snapshot.billing.tier_definition_version}) · {daysLeft} days left · resets {new Date(snapshot.billing.cycle_end).toLocaleDateString()}</CardDescription>
          </div>
        </CardHeader>
        <CardContent><AddonGrantPanel /></CardContent>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => {
            const paused = snapshot.billing.paused_buckets.includes(r.key);
            const tone = paused ? "red" : meterTone(r.used, r.total);
            return (
              <div key={r.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.label}</span>
                  {paused ? <Badge variant="destructive">Paused</Badge> : tone !== "neutral" && <Badge variant={tone === "red" ? "destructive" : "secondary"}>{tone === "red" ? "At limit" : "80%+"}</Badge>}
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{r.fmt(r.used)} of {r.total > 0 ? r.fmt(r.total) : "not included"}</p>
                <Progress value={r.total > 0 ? Math.min(100, (r.used / r.total) * 100) : 0} className={cn("mt-2 h-1.5", tone === "red" && "[&>div]:bg-destructive", tone === "amber" && "[&>div]:bg-warning")} />
              </div>
            );
          })}
        </CardContent>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          Alerts: over 20% of an allowance in 24 hours, more than 3× the 7-day average, or more than {fmtUsd(a.absolute_daily_alert_cents)} measured cost in a day. When a bucket pauses, scheduled posting to free channels continues.
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Breakdown this cycle</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>What</TableHead><TableHead>Actions</TableHead><TableHead>Units</TableHead><TableHead>Measured cost</TableHead></TableRow></TableHeader>
            <TableBody>
              {(byCap.data ?? []).map(([k, v]) => (
                <TableRow key={k}><TableCell>{k.replace(":", " · ").replace(/_/g, " ")}</TableCell><TableCell>{v.n}</TableCell><TableCell>{v.units}</TableCell><TableCell>{fmtUsd(v.cost, 2)}</TableCell></TableRow>
              ))}
              {!byCap.data?.length && <TableRow><TableCell colSpan={4} className="text-muted-foreground">No metered activity yet this cycle.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alert history</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Bucket</TableHead><TableHead>Trigger</TableHead><TableHead>Projected</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(alerts.data ?? []).map((al) => (
                <TableRow key={al.id}><TableCell>{new Date(al.created_at).toLocaleString()}</TableCell><TableCell>{BUCKET_LABEL[al.bucket]}</TableCell><TableCell>{al.threshold_label}</TableCell><TableCell>{fmtUsd(Number(al.projected_month_end_cents), 2)}</TableCell><TableCell>{al.status.replace(/_/g, " ")}</TableCell></TableRow>
              ))}
              {!alerts.data?.length && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No alerts.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(resume)} onOpenChange={(o) => !o && setResume(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume {resume && BUCKET_LABEL[resume.bucket]}?</DialogTitle>
            <DialogDescription>{resume?.label}. At the current pace this bucket is projected to reach <b>{resume && fmtUsd(resume.projected, 2)}</b> by month-end. This is logged with your name.</DialogDescription>
          </DialogHeader>
          {resume?.requires_owner && <p className="text-sm text-destructive">This is the third alert for this bucket this cycle — only the owner can resume it.</p>}
          <DialogFooter><Button variant="outline" onClick={() => setResume(null)}>Keep paused</Button><Button onClick={doResume}>Resume {resume && BUCKET_LABEL[resume.bucket]}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
