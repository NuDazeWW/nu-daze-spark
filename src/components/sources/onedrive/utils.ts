import { Image, Film, FileText, File } from "lucide-react";
import type { DriveItem } from "./types";

const FILE_ICON_MAP: Record<string, React.ElementType> = {
  image: Image,
  video: Film,
  text: FileText,
  application: File,
};

export function getFileIcon(mimeType?: string) {
  if (!mimeType) return File;
  const prefix = mimeType.split("/")[0];
  return FILE_ICON_MAP[prefix] ?? File;
}

export function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isShortcut(item: DriveItem): boolean {
  return !!item.remoteItem?.parentReference?.driveId;
}
