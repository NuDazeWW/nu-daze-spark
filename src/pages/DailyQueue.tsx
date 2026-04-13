import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarDays } from "lucide-react";

export default function DailyQueue() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Daily Content Queue"
        description="Today's post cards organized by platform and status."
      />
      <EmptyState
        icon={CalendarDays}
        title="Queue is empty"
        description="Generated and approved post cards will appear here organized for daily review and export."
      />
    </div>
  );
}
