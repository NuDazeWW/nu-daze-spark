import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { AlertCircle, LucideIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StrategyTabShellProps {
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}

export function StrategyTabShell({
  isLoading,
  error,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}: StrategyTabShellProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load data: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return <>{children}</>;
}
