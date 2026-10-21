import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Link2,
  Settings2,
  Sparkles,
  CalendarDays,
  MessageSquare,
  CheckCircle2,
  Repeat2,
  LogOut,
  AtSign,
  Building2,
  ExternalLink,
  Lock,
  FileText,
  Briefcase,
  Users,
  BarChart3,
  ListChecks,
  LifeBuoy,
  Megaphone,
  CalendarRange,
  Bell,
  Mail,
  ImagePlus, Palette, Send, PieChart,
  CreditCard,
} from "lucide-react";
import { NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { useWorkspace } from "@/hooks/useWorkspace";
import { APP_VERSION } from "@/lib/appVersion";
import {
  NavHoverProvider,
  NavHoverWrapper,
  NAV_HOVER_LISTS,
} from "./SidebarHoverList";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import socialMotiveLogo from "@/assets/socialmotive-logo.jpg";
import { SidebarPostTo } from "./SidebarPostTo";
import { CollapsibleNavGroup } from "./CollapsibleNavGroup";

export function AppSidebar() {
  const location = useLocation();
  useAuth();
  const ws = useWorkspace();
  const renderItems = (items: NavItem[]) => items.map((item) => (
    <SidebarMenuItem key={item.href}>
      <NavHoverWrapper href={item.href} title={item.title} icon={item.icon}>
        <SidebarMenuButton asChild isActive={location.pathname + location.hash === item.href || (location.pathname === item.href && !location.hash)} tooltip={NAV_HOVER_LISTS[item.href] ? undefined : item.title}>
          <Link to={item.href}>
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </NavHoverWrapper>
    </SidebarMenuItem>
  ));

  return (
    <NavHoverProvider>
    <Sidebar collapsible="icon" className="sm-dark sm-sidebar-bg">
      <SidebarHeader className="px-4 py-5">
        <Link to="/" className="block w-full">
          <img
            src={socialMotiveLogo}
            alt="SocialMotive — AI-powered social intelligence"
            className="w-full h-auto rounded-md object-contain"
          />
        </Link>
        {ws.settings?.company_logo_url ? (
          <div className="mt-3 flex justify-center group-data-[collapsible=icon]:hidden">
            <img src={ws.settings.company_logo_url} alt={ws.settings.company_name ?? "Organization logo"} className="max-h-9 max-w-[70%] object-contain rounded-sm" />
          </div>
        ) : ws.settings?.company_name ? (
          <div className="mt-3 flex justify-center group-data-[collapsible=icon]:hidden">
            <span className="rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-1 text-xs font-semibold tracking-wide text-sidebar-foreground">{ws.settings.company_name}</span>
          </div>
        ) : null}
      </SidebarHeader>


      <SidebarContent>
        {NAV_GROUPS.map((g, i) => (
          <div key={g.id}>
            {i > 0 && <SidebarSeparator />}
            <CollapsibleNavGroup id={g.id} label={g.label} containsActive={g.items.some((it) => it.href.split(/[?#]/)[0] === location.pathname)}>
              <SidebarMenu>{renderItems(g.items)}</SidebarMenu>
            </CollapsibleNavGroup>
          </div>
        ))}
        <SidebarSeparator />
        <SidebarMenu className="px-2">{renderItems([
          { title: "Help", icon: LifeBuoy, href: "/help" },
          { title: "What's new", icon: BarChart3, href: "/whats-new" },
        ])}</SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-3 py-3">
        <Link to="/whats-new" className="px-2 pt-1 text-[10px] font-mono text-sidebar-foreground/50 hover:underline group-data-[collapsible=icon]:hidden">SocialMotive v{APP_VERSION}</Link>
      </SidebarFooter>
    </Sidebar>
    </NavHoverProvider>
  );
}
