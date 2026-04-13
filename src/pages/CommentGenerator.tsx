import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessageSquare } from "lucide-react";

export default function CommentGenerator() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Comment Generator"
        description="Generate engagement comments for relevant external posts."
      />
      <EmptyState
        icon={MessageSquare}
        title="No external posts loaded"
        description="Curate relevant industry posts and generate contextual, on-brand comments for engagement."
      />
    </div>
  );
}
