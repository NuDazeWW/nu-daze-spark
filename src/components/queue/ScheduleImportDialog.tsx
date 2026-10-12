import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Upload, FileDown, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Platform = Database["public"]["Enums"]["platform_type"];
type ContentType = Database["public"]["Enums"]["content_type"];

const PLATFORMS: Platform[] = ["linkedin", "instagram", "facebook"];
const CONTENT_TYPES: ContentType[] = ["post", "story", "reel", "article", "carousel", "comment"];

const TEMPLATE = `date,platform,content_type,draft_copy,hashtags,people_tags,org_tags,objective,audience,campaign_pillar,source_url
2026-08-01,instagram,reel,"Behind the scenes of our latest build. Full send.","#nudaze,#motorsport","",,"awareness","enthusiasts","brand",https://nudaze.com/blog/build
2026-08-02,linkedin,post,"Partnership readiness matters. Here's why.","#partnerships,#standards","shirley-johnson-the-storyteller","Partnership Readiness Standards Council","thought leadership","operators","psrc-launch",`;

interface ParsedRow {
  row: number;
  date: string;
  platform: Platform;
  content_type: ContentType;
  draft_copy: string;
  hashtags: string[];
  people_tags: string[];
  org_tags: string[];
  objective: string | null;
  audience: string | null;
  campaign_pillar: string | null;
  source_url: string | null;
  errors: string[];
}

// Minimal CSV parser handling quoted fields with commas
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.some((v) => v.length > 0)) rows.push(cur);
        cur = [];
      } else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); if (cur.some((v) => v.length > 0)) rows.push(cur); }
  return rows;
}

function splitList(v: string): string[] {
  return v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ScheduleImportDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { activeClientId } = useActiveClient();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  const parsed = useMemo<ParsedRow[]>(() => {
    if (!csv.trim()) return [];
    const rows = parseCsv(csv);
    if (rows.length === 0) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const iDate = idx("date");
    const iPlatform = idx("platform");
    const iType = idx("content_type");
    const iCopy = idx("draft_copy");
    const iHash = idx("hashtags");
    const iPeople = idx("people_tags");
    const iOrg = idx("org_tags");
    const iObj = idx("objective");
    const iAud = idx("audience");
    const iPillar = idx("campaign_pillar");
    const iUrl = idx("source_url");

    return rows.slice(1).map((r, i) => {
      const errors: string[] = [];
      const date = (r[iDate] || "").trim();
      const platform = (r[iPlatform] || "").trim().toLowerCase() as Platform;
      const content_type = (r[iType] || "").trim().toLowerCase() as ContentType;
      const draft_copy = (r[iCopy] || "").trim();

      if (!date || isNaN(new Date(date).getTime())) errors.push("invalid date");
      if (!PLATFORMS.includes(platform)) errors.push(`platform must be ${PLATFORMS.join("/")}`);
      if (!CONTENT_TYPES.includes(content_type)) errors.push(`content_type must be one of ${CONTENT_TYPES.join(", ")}`);
      if (!draft_copy) errors.push("draft_copy required");

      return {
        row: i + 2,
        date,
        platform,
        content_type,
        draft_copy,
        hashtags: iHash >= 0 ? splitList(r[iHash] || "") : [],
        people_tags: iPeople >= 0 ? splitList(r[iPeople] || "") : [],
        org_tags: iOrg >= 0 ? splitList(r[iOrg] || "") : [],
        objective: iObj >= 0 ? (r[iObj] || "").trim() || null : null,
        audience: iAud >= 0 ? (r[iAud] || "").trim() || null : null,
        campaign_pillar: iPillar >= 0 ? (r[iPillar] || "").trim() || null : null,
        source_url: iUrl >= 0 ? (r[iUrl] || "").trim() || null : null,
        errors,
      };
    });
  }, [csv]);

  const validRows = parsed.filter((r) => r.errors.length === 0);
  const invalidCount = parsed.length - validRows.length;

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SocialMotive-schedule-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (f: File) => {
    setCsv(await f.text());
  };

  const handleImport = async () => {
    if (!user || !activeClientId || validRows.length === 0) return;
    setImporting(true);
    try {
      const payload = validRows.map((r) => ({
        client_id: activeClientId,
        created_by: user.id,
        platform: r.platform,
        content_type: r.content_type,
        draft_copy: r.draft_copy,
        hashtags: r.hashtags,
        people_tags: r.people_tags,
        org_tags: r.org_tags,
        objective: r.objective,
        audience: r.audience,
        campaign_pillar: r.campaign_pillar,
        source_references: r.source_url ? [r.source_url] : [],
        scheduled_for: new Date(r.date).toISOString(),
        import_source: "csv_schedule",
        approval_status: "draft" as const,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("post_cards").insert(payload as any);
      if (error) throw error;
      toast({ title: `Imported ${validRows.length} scheduled post${validRows.length !== 1 ? "s" : ""}`, description: "Drafts are queued for review." });
      qc.invalidateQueries({ queryKey: ["post_cards"] });
      setCsv("");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Import scheduled posts</DialogTitle>
          <DialogDescription>
            Upload a CSV to bulk-create draft post cards for specific dates. Columns: <code className="text-xs">date, platform, content_type, draft_copy, hashtags, people_tags, org_tags, objective, audience, campaign_pillar, source_url</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <FileDown className="h-4 w-4 mr-1.5" />Download template
            </Button>
            <Label htmlFor="csv-file" className="cursor-pointer">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-input hover:bg-accent">
                <Upload className="h-4 w-4" />Upload CSV
              </div>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </Label>
          </div>

          <div>
            <Label htmlFor="csv-text" className="text-xs text-muted-foreground">Or paste CSV</Label>
            <Textarea
              id="csv-text"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder="date,platform,content_type,draft_copy,..."
              rows={8}
              className="font-mono text-xs mt-1"
            />
          </div>

          {parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3 text-brand-success" />{validRows.length} valid</Badge>
                {invalidCount > 0 && <Badge variant="destructive">{invalidCount} invalid</Badge>}
              </div>
              {invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs max-h-32 overflow-auto">
                    {parsed.filter((r) => r.errors.length).slice(0, 10).map((r) => (
                      <div key={r.row}>Row {r.row}: {r.errors.join(", ")}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
              <div className="border rounded-md max-h-48 overflow-auto text-xs">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0"><tr className="text-left"><th className="p-2">Date</th><th className="p-2">Platform</th><th className="p-2">Type</th><th className="p-2">Copy</th></tr></thead>
                  <tbody>
                    {validRows.slice(0, 20).map((r) => (
                      <tr key={r.row} className="border-t"><td className="p-2 whitespace-nowrap">{r.date}</td><td className="p-2">{r.platform}</td><td className="p-2">{r.content_type}</td><td className="p-2 truncate max-w-xs">{r.draft_copy}</td></tr>
                    ))}
                  </tbody>
                </table>
                {validRows.length > 20 && <div className="p-2 text-muted-foreground text-center">…and {validRows.length - 20} more</div>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || validRows.length === 0 || !activeClientId}>
            {importing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Importing…</> : `Import ${validRows.length} draft${validRows.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
