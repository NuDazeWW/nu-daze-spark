import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Settings2 } from "lucide-react";

export default function Strategy() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Strategy & Rules"
        description="Brand voice, platform rules, audiences, campaigns, hashtags, and CTAs."
      />
      <EmptyState
        icon={Settings2}
        title="Strategy hub"
        description="Configure your brand voice rules, platform-specific constraints, audience segments, and campaign pillars."
      />
    </div>
  );
}
