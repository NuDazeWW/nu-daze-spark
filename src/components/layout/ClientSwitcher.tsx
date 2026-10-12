import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { useActiveClient } from "@/contexts/ClientContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ClientSwitcher() {
  const { clients, activeClient, setActiveClientId } = useActiveClient();
  const { entitySingular } = useWorkspace();

  if (clients.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 min-w-[180px] justify-between">
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="truncate text-xs font-medium">
              {activeClient?.name ?? `Select ${entitySingular.toLowerCase()}`}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel className="text-xs">Active client</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {clients.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => setActiveClientId(c.id)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="truncate text-sm">{c.name}</span>
            {activeClient?.id === c.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
