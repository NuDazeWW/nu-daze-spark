import { Folder, File, Download, Loader2, CheckCircle2, Link2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFileIcon, formatSize, isShortcut } from "./utils";
import type { DriveItem } from "./types";

interface OneDriveFileListProps {
  items: DriveItem[];
  importing: string | null;
  imported: Set<string>;
  previewLoading: boolean;
  previewItemId: string | null;
  onFolderClick: (item: DriveItem) => void;
  onImport: (item: DriveItem) => void;
  onPreview: (item: DriveItem) => void;
}

export function OneDriveFileList({
  items,
  importing,
  imported,
  previewLoading,
  previewItemId,
  onFolderClick,
  onImport,
  onPreview,
}: OneDriveFileListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No files or folders found.</p>;
  }

  return (
    <>
      {items.map((item) => {
        const shortcut = isShortcut(item);
        const isFolder = !!item.folder || !!item.remoteItem?.folder;
        const mime = item.file?.mimeType ?? item.remoteItem?.file?.mimeType;
        const IconComp = isFolder ? Folder : getFileIcon(mime);
        const isImported = imported.has(item.id);
        const isImporting = importing === item.id;

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group"
          >
            <button
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
              onClick={() => isFolder && onFolderClick(item)}
              disabled={!isFolder}
            >
              <div className="relative shrink-0">
                <IconComp className={`h-4 w-4 ${isFolder ? "text-primary" : "text-muted-foreground"}`} />
                {shortcut && (
                  <Link2 className="h-2.5 w-2.5 text-primary absolute -bottom-1 -right-1" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{item.name}</p>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  {(item.size != null || item.remoteItem?.size != null) && !isFolder && (
                    <span>{formatSize(item.size ?? item.remoteItem?.size)}</span>
                  )}
                  {isFolder && (item.folder || item.remoteItem?.folder) && (
                    <span>{(item.folder?.childCount ?? item.remoteItem?.folder?.childCount)} items</span>
                  )}
                  {shortcut && <span className="text-primary/70">Shortcut</span>}
                </div>
              </div>
            </button>

            {!isFolder && (
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {(mime?.startsWith("image/") || mime?.startsWith("video/")) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreview(item)}
                    disabled={previewLoading && previewItemId === item.id}
                  >
                    {previewLoading && previewItemId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onImport(item)}
                  disabled={isImporting || isImported}
                >
                  {isImported ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                      <span className="text-xs">Imported</span>
                    </>
                  ) : isImporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Import</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
