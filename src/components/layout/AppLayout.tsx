import { Link, Outlet, useLocation } from "react-router-dom";
import { LifeBuoy, Megaphone } from "lucide-react";
import { useLayoutEffect } from "react";
import { pageSurface } from "@/lib/contentPresentation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "./UserMenu";
import { ClientSwitcher } from "./ClientSwitcher";
import ribbons from "@/assets/strategy-studio-ribbons.jpg";
import { ClientProvider } from "@/contexts/ClientContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Badge } from "@/components/ui/badge";

export function AppLayout() {
  const { pathname } = useLocation();
  const env = (useWorkspace().settings as { environment?: string } | null | undefined)?.environment;
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
            {env && <Badge variant="outline" title="Which environment this instance is" className="shrink-0 font-mono text-[10px] uppercase tracking-wider">{env === "demo" ? "Demo environment" : env}</Badge>}
            <div className="min-w-0 flex-1" />
            <nav aria-label="Help and updates" className="flex shrink-0 items-center gap-1">
              {[{ href: "/help", label: "Help", icon: LifeBuoy }, { href: "/whats-new", label: "What's new", icon: Megaphone }].map((l) => (
                <Link key={l.href} to={l.href} aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${pathname.startsWith(l.href) ? "text-foreground" : "text-muted-foreground"}`}>
                  <l.icon className="size-4" /><span className="hidden sm:inline">{l.label}</span>
                </Link>
              ))}
            </nav>
            <ClientSwitcher />
            <UserMenu />
          </header>
          <main className={`sm-page relative isolate min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto text-foreground ${pageSurface(pathname) === "dark" ? "sm-app-bg" : "sm-light-page"} ${pathname === "/" ? "sm-route-dashboard" : "sm-route-themed"} p-4 md:p-6 lg:p-8`}>
             {pageSurface(pathname) === "dark" && <img src={ribbons} alt="" aria-hidden="true" className="sm-header-ribbons" />}
             <div className="relative z-[1] mx-auto min-w-0 w-full max-w-[1440px]"><Outlet /></div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ClientProvider>
  );
}
