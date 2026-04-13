import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LayoutDashboard } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Your content operations at a glance."
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard coming soon"
        description="Cadence tracking, quota progress, and content pipeline overview will appear here."
      />
    </div>
  );
}
