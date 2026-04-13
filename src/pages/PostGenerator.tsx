import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Sparkles } from "lucide-react";

export default function PostGenerator() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Post Generator"
        description="Generate structured post cards from approved sources and strategy rules."
      />
      <EmptyState
        icon={Sparkles}
        title="Ready to generate"
        description="Select sources, configure generation parameters, and create structured post cards for LinkedIn and Instagram."
      />
    </div>
  );
}
