import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExpirationAlerts } from "@/components/assets/ExpirationAlerts";
import { LayoutDashboard } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Your content operations at a glance."
      />
      <div className="space-y-6">
        <ExpirationAlerts />
        <EmptyState
          icon={LayoutDashboard}
          title="Dashboard coming soon"
          description="Cadence tracking, quota progress, and content pipeline overview will appear here."
        />
      </div>
    </div>
  );
}
