import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";

/** Sidebar section whose title toggles its contents; open state persists per section.
 *  The section holding the current page is always opened on load and navigation. */
export function CollapsibleNavGroup({ id, label, defaultOpen = true, containsActive = false, children }: {
  id: string; label: string; defaultOpen?: boolean; containsActive?: boolean; children: React.ReactNode;
}) {
  const key = `sm-nav-group:${id}`;
  const [open, setOpen] = React.useState(() => {
    if (containsActive) return true;
    const v = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return v === null ? defaultOpen : v === "1";
  });
  const change = (v: boolean) => { setOpen(v); localStorage.setItem(key, v ? "1" : "0"); };
  React.useEffect(() => {
    if (containsActive && !open) change(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containsActive]);
  return (
    <Collapsible open={open} onOpenChange={change}>
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger
            aria-expanded={open}
            title={open ? `Collapse ${label}` : `Expand ${label}`}
            className="sm-nav-group-label group/navlabel w-full cursor-pointer justify-between rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {label}
            <ChevronDown aria-hidden="true" className={`size-4 shrink-0 opacity-90 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>{children}</CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
