import { Outlet, useLocation } from "react-router-dom";
import { useLayoutEffect } from "react";
import { pageSurface } from "@/lib/contentPresentation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "./UserMenu";
import { AdminLinksBar } from "./AdminLinksBar";
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
        <SidebarInset>
          <AdminLinksBar />
          <header className="sm-dark flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background text-foreground px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
            <ClientSwitcher />
            <UserMenu />
          </header>
          <main className={`sm-page flex-1 overflow-auto text-foreground ${pageSurface(pathname) === "dark" ? "sm-app-bg" : "sm-light-page"} p-4 md:p-6 lg:p-8`}>
            <div className="mx-auto w-full max-w-[1440px]"><Outlet /></div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ClientProvider>
  );
}
