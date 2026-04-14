import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
  const isPdf = assetType === "pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-2 overflow-hidden">
        <div className="pt-6">
          <p className="text-sm font-medium px-2 mb-2 truncate">{title}</p>
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
              {isPdf && (
                <iframe
                  src={url}
                  title={title}
                  className="w-full h-[75vh] rounded-md border-0"
                />
              )}
              {!isImage && !isVideo && !isPdf && (
                <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                  Preview not available for this file type.{" "}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1">
                    Open file
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
