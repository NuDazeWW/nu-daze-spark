export interface DriveItem {
  id: string;
  name: string;
  size?: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl?: string;
  lastModifiedDateTime?: string;
  "@microsoft.graph.downloadUrl"?: string;
  thumbnailUrl?: string;
  remoteItem?: {
    id: string;
    folder?: { childCount: number };
    file?: { mimeType: string };
    parentReference?: {
      driveId: string;
      driveType?: string;
    };
    size?: number;
  };
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
  siteId?: string;
  driveId?: string;
  action?: string;
  searchQuery?: string;
}

export type CloudProvider = "onedrive" | "sharepoint" | "google_drive";

export type BrowseMode = "onedrive" | "sharepoint_sites" | "sharepoint_drive" | "remote_drive";

export interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
}
