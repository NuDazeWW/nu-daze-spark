import { X, Download, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DriveItem } from "./types";

interface OneDrivePreviewProps {
  item: DriveItem;
  url: string | null;
  loading: boolean;
  importing: string | null;
  imported: Set<string>;
  onImport: (item: DriveItem) => void;
  onClose: () => void;
}

export function OneDrivePreview({
  item,
  url,
  loading,
  importing,
  imported,
  onImport,
  onClose,
}: OneDrivePreviewProps) {
  const mime = item.file?.mimeType ?? item.remoteItem?.file?.mimeType ?? "";
  const isVideo = mime.startsWith("video/");
  const isImported = imported.has(item.id);
  const isImporting = importing === item.id;

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <p className="text-sm font-medium truncate flex-1">{item.name}</p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onImport(item)}
            disabled={isImporting || isImported}
          >
            {isImported ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                Imported
              </>
            ) : isImporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Download className="h-3.5 w-3.5 mr-1" />
                Import
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : url ? (
          isVideo ? (
            <video src={url} controls autoPlay className="max-w-full max-h-[60vh] rounded-md" />
          ) : (
            <img src={url} alt={item.name} className="max-w-full max-h-[60vh] object-contain rounded-md" />
          )
        ) : (
          <p className="text-sm text-muted-foreground">Preview unavailable</p>
        )}
      </div>
    </div>
  );
}
