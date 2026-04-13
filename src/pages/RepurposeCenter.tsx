import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Repeat2 } from "lucide-react";

export default function RepurposeCenter() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Repurpose Center"
        description="Cross-platform reuse suggestions for NuDaze-origin content."
      />
      <EmptyState
        icon={Repeat2}
        title="No repurpose suggestions"
        description="AI-generated reuse opportunities from ingested NuDaze content will surface here automatically."
      />
    </div>
  );
}
