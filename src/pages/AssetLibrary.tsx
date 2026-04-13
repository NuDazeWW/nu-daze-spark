import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { FolderOpen } from "lucide-react";

export default function AssetLibrary() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Asset Library"
        description="Manage uploaded source assets, permissions, and summaries."
      />
      <EmptyState
        icon={FolderOpen}
        title="No assets yet"
        description="Upload images, PDFs, videos, links, and text snippets to build your content library."
      />
    </div>
  );
}
