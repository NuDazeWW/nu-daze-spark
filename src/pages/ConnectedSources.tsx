import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Link2 } from "lucide-react";

export default function ConnectedSources() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Connected Sources"
        description="Link external document libraries and web sources."
      />
      <EmptyState
        icon={Link2}
        title="No sources connected"
        description="Connect Google Drive, SharePoint, or add webpage links for content sourcing."
      />
    </div>
  );
}
