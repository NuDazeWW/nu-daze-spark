import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";

/** Sidebar section whose title toggles its contents; open state persists per section. */
export function CollapsibleNavGroup({ id, label, defaultOpen = true, children }: {
  id: string; label: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const key = `sm-nav-group:${id}`;
  const [open, setOpen] = React.useState(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return v === null ? defaultOpen : v === "1";
  });
  const change = (v: boolean) => { setOpen(v); localStorage.setItem(key, v ? "1" : "0"); };
  return (
    <Collapsible open={open} onOpenChange={change}>
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="sm-nav-group-label justify-between">
            {label}
            <ChevronDown className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>{children}</CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
