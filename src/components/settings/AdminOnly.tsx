import { Lock } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";

export function AdminOnly({ children, ownerOnly = false }: { children: React.ReactNode; ownerOnly?: boolean }) {
  const { canManage, isOwner, loading } = useWorkspace();
  if (loading) return null;
  const ok = ownerOnly ? isOwner : canManage;
  if (!ok) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Lock className="h-4 w-4" /> {ownerOnly ? "Owner access required." : "Admin access required."}
      </div>
    );
  }
  return <>{children}</>;
}
