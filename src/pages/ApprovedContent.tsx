import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CheckCircle2 } from "lucide-react";

export default function ApprovedContent() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Approved Content"
        description="Finalized post cards ready for export and manual posting."
      />
      <EmptyState
        icon={CheckCircle2}
        title="No approved content"
        description="Post cards that pass review and approval will appear here for copy and export."
      />
    </div>
  );
}
