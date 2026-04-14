import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle, Link2 } from "lucide-react";

interface BulkUrlImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  url: string;
  success: boolean;
  error?: string;
}

export function BulkUrlImportDialog({ open, onOpenChange }: BulkUrlImportDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [urlText, setUrlText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const urls = urlText
    .split("\n")
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));

  const handleImport = useCallback(async () => {
    if (urls.length === 0) return;
    setIsPending(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("import-webpage", {
        body: { urls },
      });

      if (error) {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.error) {
        toast({ title: "Import failed", description: data.error, variant: "destructive" });
        return;
      }

      setResults(data.results ?? []);
      qc.invalidateQueries({ queryKey: ["source_assets"] });
      qc.invalidateQueries({ queryKey: ["asset_summaries"] });

      toast({
        title: `${data.imported}/${data.total} URL${data.total !== 1 ? "s" : ""} imported`,
        description: "Scraped content saved to Asset Library.",
      });
    } catch (e) {
      toast({
        title: "Import error",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }, [urls, toast, qc]);

  const handleClose = (open: boolean) => {
    if (!isPending) {
      onOpenChange(open);
      if (!open) {
        setUrlText("");
        setResults(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Bulk URL Import
          </DialogTitle>
          <DialogDescription>
            Paste URLs (one per line). Each will be scraped and saved as a source asset with auto-generated summary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder={"https://example.com/blog/post-1\nhttps://example.com/case-study\nhttps://example.com/article"}
            rows={6}
            disabled={isPending}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{urls.length} valid URL{urls.length !== 1 ? "s" : ""} detected</span>
            {urls.length > 20 && (
              <Badge variant="destructive" className="text-xs">Max 20 per batch</Badge>
            )}
          </div>

          {isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scraping {urls.length} URL{urls.length !== 1 ? "s" : ""}…
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}

          {results && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate">{r.url}</p>
                    {r.error && <p className="text-xs text-destructive">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={urls.length === 0 || urls.length > 20 || isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…
              </>
            ) : results ? (
              "Import More"
            ) : (
              `Import ${urls.length} URL${urls.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
