import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PostCard } from "@/hooks/usePostCards";
import { postLabel } from "@/components/tracking/PostTracking";

type Res = { post_card_id: string; impressions: number; reactions: number; comments: number; shares: number; clicks: number; saves: number; recorded_at: string };
const PLATFORMS = ["linkedin", "instagram", "facebook", "x", "youtube"] as const;
const METRICS = ["impressions", "reactions", "comments", "shares", "clicks", "saves"] as const;

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const cell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function PublishingReportDialog({ open, onOpenChange, cards, companyName }: { open: boolean; onOpenChange: (o: boolean) => void; cards: PostCard[]; companyName?: string }) {
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [plats, setPlats] = useState<string[]>([...PLATFORMS]);
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);

  const build = async () => {
    const since = Date.now() - days * 86400000;
    const pub = (c: PostCard) => (c as PostCard & { publishing_status?: string }).publishing_status ?? "idle";
    const rows = cards.filter((c) => plats.includes(c.platform) && pub(c) !== "idle" &&
      new Date(c.posted_at ?? c.scheduled_for ?? c.updated_at).getTime() >= since);
    const ids = rows.map((r) => r.id);
    const latest = new Map<string, Res>();
    if (ids.length) {
      const { data, error } = await supabase.from("post_results").select("post_card_id,impressions,reactions,comments,shares,clicks,saves,recorded_at").in("post_card_id", ids).order("recorded_at", { ascending: false });
      if (error) throw error;
      for (const r of (data ?? []) as Res[]) if (!latest.has(r.post_card_id)) latest.set(r.post_card_id, r);
    }
    return rows.map((c) => ({ c, s: pub(c), r: latest.get(c.id) }));
  };

  const csv = async () => {
    setBusy("csv");
    try {
      const data = await build();
      const head = ["post_id", "platform", "content_type", "publishing_status", "approval_status", "scheduled_for", "posted_at", "posted_url", ...METRICS];
      const lines = data.map(({ c, s, r }) => [postLabel(c), c.platform, c.content_type, s, c.approval_status, c.scheduled_for, c.posted_at, c.posted_url, ...METRICS.map((m) => r?.[m] ?? "")].map(cell).join(","));
      downloadBlob(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" }), `publishing-report-${days}d.csv`);
    } catch (e) { toast({ title: "Couldn't build report", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const pdf = async () => {
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Allow pop-ups to open the PDF report", variant: "destructive" }); return; }
    setBusy("pdf");
    try {
      const data = await build();
      const count = (s: string) => data.filter((d) => d.s === s).length;
      const sum = (m: (typeof METRICS)[number]) => data.reduce((t, d) => t + (d.r?.[m] ?? 0), 0);
      const byPlat = PLATFORMS.map((p) => [p, data.filter((d) => d.c.platform === p && d.s === "published").length] as const).filter(([, n]) => n);
      const top = data.filter((d) => d.r).sort((a, b) => (b.r!.reactions + b.r!.comments * 2 + b.r!.shares * 3) - (a.r!.reactions + a.r!.comments * 2 + a.r!.shares * 3)).slice(0, 5);
      const stat = (l: string, v: number) => `<div class="stat"><b>${v.toLocaleString()}</b><span>${l}</span></div>`;
      w.document.write(`<!doctype html><html><head><title>${esc(companyName ?? "SocialMotive")} Publishing Report</title><style>
        @page{size:A4;margin:14mm}body{font-family:Inter,Arial,sans-serif;color:#1d1830;margin:0}h1{font-family:'Space Grotesk',Arial;font-size:24px;margin:0}
        .sub{color:#6b6480;font-size:12px;margin:4px 0 18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
        .stat{border:1px solid #e3e0ea;border-radius:10px;padding:10px;break-inside:avoid}.stat b{display:block;font-size:20px}.stat span{font-size:11px;color:#6b6480}
        h2{font-size:14px;margin:18px 0 8px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #eee}
        th{background:#f5f3fa}tr{break-inside:avoid}.mono{font-family:'IBM Plex Mono',monospace}</style></head><body>
        <h1>${esc(companyName ?? "SocialMotive")} Publishing Report</h1>
        <p class="sub">Last ${days} days · ${plats.length === PLATFORMS.length ? "All channels" : plats.join(", ")} · Generated ${new Date().toLocaleString()}</p>
        <div class="grid">${stat("Published", count("published"))}${stat("Scheduled", count("scheduled") + count("publishing"))}${stat("Failed", count("failed"))}${stat("Impressions", sum("impressions"))}
        ${stat("Reactions", sum("reactions"))}${stat("Comments", sum("comments"))}${stat("Shares", sum("shares"))}${stat("Clicks", sum("clicks"))}</div>
        ${byPlat.length ? `<h2>Published by channel</h2><table><tr><th>Channel</th><th>Published</th></tr>${byPlat.map(([p, n]) => `<tr><td>${esc(p)}</td><td>${n}</td></tr>`).join("")}</table>` : ""}
        ${top.length ? `<h2>Top performing posts</h2><table><tr><th>Post</th><th>Channel</th><th>Impr.</th><th>React.</th><th>Comm.</th><th>Shares</th></tr>${top.map(({ c, r }) => `<tr><td class="mono">${esc(postLabel(c))}</td><td>${esc(c.platform)}</td><td>${r!.impressions}</td><td>${r!.reactions}</td><td>${r!.comments}</td><td>${r!.shares}</td></tr>`).join("")}</table>` : ""}
        <h2>All posts (${data.length})</h2><table><tr><th>Post</th><th>Channel</th><th>Status</th><th>Date</th><th>Impr.</th><th>React.</th><th>Clicks</th></tr>
        ${data.map(({ c, s, r }) => `<tr><td class="mono">${esc(postLabel(c))}</td><td>${esc(c.platform)} ${esc(c.content_type)}</td><td>${esc(s)}</td><td>${esc(new Date(c.posted_at ?? c.scheduled_for ?? c.updated_at).toLocaleDateString())}</td><td>${r?.impressions ?? "—"}</td><td>${r?.reactions ?? "—"}</td><td>${r?.clicks ?? "—"}</td></tr>`).join("") || `<tr><td colspan="7">No posts in this period.</td></tr>`}</table>
        <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
      w.document.close();
    } catch (e) { w.close(); toast({ title: "Couldn't build report", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publishing report</DialogTitle>
          <DialogDescription>Download scheduled, published and failed posts with their logged results.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label className="text-xs">Period</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last quarter (90 days)</option><option value={365}>Last 12 months</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Channels</Label>
            <div className="flex flex-wrap gap-3 text-sm">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 capitalize">
                  <Checkbox checked={plats.includes(p)} onCheckedChange={(v) => setPlats(v ? [...plats, p] : plats.filter((x) => x !== p))} />{p === "x" ? "X" : p}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!!busy || !plats.length} onClick={pdf}>{busy === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}PDF report</Button>
            <Button className="flex-1" variant="outline" disabled={!!busy || !plats.length} onClick={csv}>{busy === "csv" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}CSV data</Button>
          </div>
          <p className="text-xs text-muted-foreground">The PDF opens in a new tab with the print dialog — choose "Save as PDF".</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
