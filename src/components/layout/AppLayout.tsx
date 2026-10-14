import { Outlet, useLocation } from "react-router-dom";
import { useLayoutEffect } from "react";
import { pageSurface } from "@/lib/contentPresentation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "./UserMenu";
import { ClientSwitcher } from "./ClientSwitcher";
import { ClientProvider } from "@/contexts/ClientContext";

export function AppLayout() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    document.body.dataset.smSurface = pageSurface(pathname);
    return () => { delete document.body.dataset.smSurface; };
  }, [pathname]);
  return (
    <ClientProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 max-w-full overflow-x-hidden">
          <header className="sm-dark sm-command-bar flex h-14 min-w-0 shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-background text-foreground px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="min-w-0 flex-1" />
            <ClientSwitcher />
            <UserMenu />
          </header>
          <main className={`sm-page min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto text-foreground ${pageSurface(pathname) === "dark" ? "sm-app-bg" : "sm-light-page"} ${pathname === "/" ? "sm-route-dashboard" : "sm-route-themed"} p-4 md:p-6 lg:p-8`}>
             <div className="mx-auto min-w-0 w-full max-w-[1440px]"><Outlet /></div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ClientProvider>
  );
}
