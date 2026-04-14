import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, FileText } from "lucide-react";

interface AssetLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string | null;
  title: string;
  assetType: string;
}

export function AssetLightbox({ open, onOpenChange, filePath, title, assetType }: AssetLightboxProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && filePath) {
      setLoading(true);
      setError(null);
      setUrl(null);
      supabase.storage
        .from("source-assets")
        .createSignedUrl(filePath, 300)
        .then(({ data, error: err }) => {
          if (err) setError(err.message);
          else setUrl(data.signedUrl);
          setLoading(false);
        });
    }
    if (!open) {
      setUrl(null);
      setError(null);
    }
  }, [open, filePath]);

  const isImage = assetType === "image";
  const isVideo = assetType === "video";
  const isDocument = ["pdf", "deck", "testimonial", "case_study", "text_snippet"].includes(assetType);

  // Detect actual file extension for rendering hints
  const ext = filePath?.split(".").pop()?.toLowerCase() ?? "";
  const isPdfFile = ext === "pdf";
  const isDocFile = ["docx", "doc", "pptx", "ppt", "key", "odp", "odt", "rtf", "txt"].includes(ext);

  const openInNewTab = () => {
    if (!url) return;
    // Use Google Docs Viewer for office documents to render them inline instead of downloading
    const officeExts = ["docx", "doc", "pptx", "ppt", "xlsx", "xls", "odt", "odp", "rtf"];
    if (officeExts.includes(ext)) {
      window.open(`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`, "_blank");
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-2 overflow-hidden">
        <DialogHeader className="px-2 pt-4">
          <DialogTitle className="text-sm font-medium truncate">{title}</DialogTitle>
        </DialogHeader>
        <div>
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-64 text-sm text-destructive">
              Failed to load preview: {error}
            </div>
          )}
          {url && !loading && (
            <>
              {isImage && (
                <img
                  src={url}
                  alt={title}
                  className="w-full max-h-[75vh] object-contain rounded-md"
                />
              )}
              {isVideo && (
                <video
                  src={url}
                  controls
                  autoPlay
                  className="w-full max-h-[75vh] rounded-md"
                />
              )}
              {isDocument && isPdfFile && (
                <iframe
                  src={url}
                  title={title}
                  className="w-full h-[75vh] rounded-md border-0"
                />
              )}
              {isDocument && !isPdfFile && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-10 w-10" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground uppercase">{ext} document</p>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={openInNewTab}>
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                </div>
              )}
              {!isImage && !isVideo && !isDocument && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-10 w-10" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground uppercase">{ext} file</p>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={openInNewTab}>
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
