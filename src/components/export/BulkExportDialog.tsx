import { useMemo, useState } from "react";
import { PlatformOption } from "@/components/layout/PlatformIcon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ApprovalStatus, PostCard } from "@/hooks/usePostCards";
import { runBulkExport, type CsvPreset, type ExportFormat } from "@/lib/bulkExport";
import { Loader2, PackageOpen } from "lucide-react";

type Range = "all" | "week" | "next7" | "month" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function rangeBounds(r: Range, from: string, to: string): [Date, Date] | null {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (r === "all") return null;
  if (r === "week") { const s = new Date(now); s.setDate(now.getDate() - ((now.getDay() + 6) % 7)); const e = new Date(s); e.setDate(s.getDate() + 7); return [s, e]; }
  if (r === "next7") { const e = new Date(now); e.setDate(now.getDate() + 7); return [now, e]; }
  if (r === "month") return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)];
  if (!from || !to) return null;
  const e = new Date(to); e.setDate(e.getDate() + 1);
  return [new Date(from), e];
}

export function BulkExportDialog({ open, onOpenChange, cards, preselected, canMarkExported, onMarkExported }: {
  open: boolean; onOpenChange: (v: boolean) => void; cards: PostCard[]; preselected?: string[];
  canMarkExported: boolean; onMarkExported: (ids: string[]) => Promise<void>;
}) {
  const { toast } = useToast();
  const usePicked = !!preselected?.length;
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState(iso(new Date()));
  const [to, setTo] = useState(iso(new Date(Date.now() + 30 * 864e5)));
  const [platform, setPlatform] = useState("all");
  const [statuses, setStatuses] = useState<ApprovalStatus[]>(["approved"]);
  const [format, setFormat] = useState<ExportFormat>("zip");
  const [preset, setPreset] = useState<CsvPreset>("socialmotive");
  const [includeMedia, setIncludeMedia] = useState(true);
  const [markExported, setMarkExported] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const eligible = useMemo(() => {
    if (usePicked) return cards.filter((c) => preselected!.includes(c.id));
    const b = rangeBounds(range, from, to);
    return cards
      .filter((c) => statuses.includes(c.approval_status))
      .filter((c) => platform === "all" || c.platform === platform)
      .filter((c) => !b || (c.scheduled_for && new Date(c.scheduled_for) >= b[0] && new Date(c.scheduled_for) < b[1]))
      .sort((a, b) => (a.scheduled_for ?? "9").localeCompare(b.scheduled_for ?? "9"));
  }, [cards, usePicked, preselected, range, from, to, platform, statuses]);

  const toggleStatus = (s: ApprovalStatus) =>
    setStatuses((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const go = async () => {
    setBusy("Preparing…");
    try {
      const res = await runBulkExport({ cards: eligible, format, preset, includeMedia, onProgress: setBusy });
      const toMark = eligible.filter((c) => c.approval_status === "approved").map((c) => c.id);
      if (markExported && canMarkExported && toMark.length) { setBusy("Updating status…"); await onMarkExported(toMark); }
      toast({
        title: `Exported ${eligible.length} post${eligible.length === 1 ? "" : "s"}`,
        description: [format === "zip" && `${res.mediaCount} media files`, res.skippedMedia && `${res.skippedMedia} media files couldn't be downloaded`].filter(Boolean).join(" · ") || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setBusy(null); }
  };

  const approvedCount = eligible.filter((c) => c.approval_status === "approved").length;

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackageOpen className="h-5 w-5 text-primary" /> Bulk export</DialogTitle>
          <DialogDescription>Download approved posts as a ready-to-post package or a scheduler spreadsheet.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {usePicked ? (
            <p className="text-sm text-muted-foreground">Exporting the {preselected!.length} posts you selected.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Scheduled date</Label>
                  <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any date</SelectItem>
                      <SelectItem value="week">This week</SelectItem>
                      <SelectItem value="next7">Next 7 days</SelectItem>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All platforms</SelectItem>
                      <PlatformOption value="linkedin" />
                      <PlatformOption value="instagram" />
                      <PlatformOption value="facebook" />
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {range === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
                </div>
              )}
              <div className="flex gap-4">
                {(["approved", "exported", "posted"] as ApprovalStatus[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm capitalize">
                    <Checkbox checked={statuses.includes(s)} onCheckedChange={() => toggleStatus(s)} /> {s}
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zip">ZIP package (copy + media)</SelectItem>
                  <SelectItem value="csv">Spreadsheet (CSV)</SelectItem>
                  <SelectItem value="json">Data file (JSON)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {format === "csv" && (
              <div className="space-y-1.5">
                <Label>Columns for</Label>
                <Select value={preset} onValueChange={(v) => setPreset(v as CsvPreset)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="socialmotive">SocialMotive (all fields)</SelectItem>
                    <SelectItem value="buffer">Buffer</SelectItem>
                    <SelectItem value="hootsuite">Hootsuite</SelectItem>
                    <SelectItem value="meta">Meta Business Suite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {format === "zip" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeMedia} onCheckedChange={(v) => setIncludeMedia(!!v)} /> Include approved images and videos
            </label>
          )}
          {canMarkExported && approvedCount > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={markExported} onCheckedChange={(v) => setMarkExported(!!v)} /> Mark {approvedCount} approved post{approvedCount === 1 ? "" : "s"} as Exported
            </label>
          )}

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <span className="font-medium">{eligible.length}</span> post{eligible.length === 1 ? "" : "s"} will be exported
            {busy && <div className="mt-2 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}</div>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={!!busy}>Cancel</Button>
          <Button onClick={go} disabled={!!busy || eligible.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PackageOpen className="h-4 w-4 mr-1" />} Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
