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

const mainNav = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "Portfolio Insights", icon: PieChart, href: "/insights" },
  { title: "Asset Library", icon: FolderOpen, href: "/assets" },
  { title: "Connected Sources", icon: Link2, href: "/sources" },
  { title: "Brand & Strategy Studio", icon: Settings2, href: "/strategy" },
];

const contentNav = [
  { title: "Campaign Briefs", icon: FileText, href: "/briefs" },
  { title: "Social Post Generator", icon: Sparkles, href: "/generator" },
  { title: "Daily Queue", icon: CalendarDays, href: "/queue" },
  { title: "Executive Review", icon: CalendarDays, href: "/review" },
  { title: "Content Planner", icon: CalendarRange, href: "/planner" },
  { title: "Comment Generator", icon: MessageSquare, href: "/comments" },
  { title: "Approved Content", icon: CheckCircle2, href: "/approved" },
  { title: "Publishing Status", icon: Send, href: "/publishing" },
  { title: "Repurpose Center", icon: Repeat2, href: "/repurpose" },
  { title: "Motive Media Studio", icon: ImagePlus, href: "/media-studio" },
];

const adminWorkspaceTop = [
  { title: "Setup", icon: ListChecks, href: "/setup" },
  { title: "Team", icon: Users, href: "/settings/team" },
];
const adminWorkspaceBottom = [
  { title: "Social Connections", icon: Link2, href: "/settings/connections" },
  { title: "Email Provider", icon: Mail, href: "/settings/email-provider" },
  { title: "Workspace", icon: Briefcase, href: "/settings/workspace" },
];

export function AppSidebar() {
  const location = useLocation();
  useAuth();
  const ws = useWorkspace();
  void adminWorkspaceTop; void adminWorkspaceBottom;
  const workspaceTop = [{ title: "Setup", icon: ListChecks, href: "/setup" }];
  const workspaceBottom: typeof workspaceTop = [];
  const workspaceLabel = `${ws.settings?.company_name?.trim() || "Your"} Workspace`;
  const renderItems = (items: { title: string; icon: typeof Bell; href: string }[]) => items.map((item) => (
    <SidebarMenuItem key={item.href}>
      <NavHoverWrapper href={item.href} title={item.title} icon={item.icon}>
        <SidebarMenuButton asChild isActive={location.pathname === item.href} tooltip={NAV_HOVER_LISTS[item.href] ? undefined : item.title}>
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
        <CollapsibleNavGroup id="overview" label="Overview">
          <SidebarMenu>
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <NavHoverWrapper href={item.href} title={item.title} icon={item.icon}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    tooltip={NAV_HOVER_LISTS[item.href] ? undefined : item.title}
                  >
                    <Link to={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </NavHoverWrapper>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </CollapsibleNavGroup>

        <SidebarSeparator />

        <CollapsibleNavGroup id="settings" label={workspaceLabel}>
          <SidebarMenu>{renderItems(workspaceTop)}</SidebarMenu>
          {workspaceBottom.length > 0 && <SidebarMenu>{renderItems(workspaceBottom)}</SidebarMenu>}
        </CollapsibleNavGroup>

        <SidebarSeparator />

        <CollapsibleNavGroup id="content" label="Content">
          <SidebarMenu>
            {contentNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <NavHoverWrapper href={item.href} title={item.title} icon={item.icon}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    tooltip={NAV_HOVER_LISTS[item.href] ? undefined : item.title}
                  >
                    <Link to={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </NavHoverWrapper>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </CollapsibleNavGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-3">
        <Link to="/whats-new" className="px-2 pt-1 text-[10px] font-mono text-sidebar-foreground/50 hover:underline group-data-[collapsible=icon]:hidden">SocialMotive v{APP_VERSION}</Link>
      </SidebarFooter>
    </Sidebar>
    </NavHoverProvider>
  );
}
