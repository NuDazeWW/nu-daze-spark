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
  HelpCircle,
  Megaphone,
  CalendarRange,
  Bell,
  Mail,
  ImagePlus, Palette,
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
  { title: "Asset Library", icon: FolderOpen, href: "/assets" },
  { title: "Connected Sources", icon: Link2, href: "/sources" },
  { title: "Strategy & Rules", icon: Settings2, href: "/strategy" },
];

const contentNav = [
  { title: "Campaign Briefs", icon: FileText, href: "/briefs" },
  { title: "Social Post Generator", icon: Sparkles, href: "/generator" },
  { title: "Daily Queue", icon: CalendarDays, href: "/queue" },
  { title: "Content Planner", icon: CalendarRange, href: "/planner" },
  { title: "Comment Generator", icon: MessageSquare, href: "/comments" },
  { title: "Approved Content", icon: CheckCircle2, href: "/approved" },
  { title: "Repurpose Center", icon: Repeat2, href: "/repurpose" },
  { title: "Motive Media Studio", icon: ImagePlus, href: "/media-studio" },
  { title: "Brand Kit Studio", icon: Palette, href: "/settings/brand-kit" },
];

const adminSettingsNav = [
  { title: "Workspace", icon: Briefcase, href: "/settings/workspace" },
  { title: "Setup", icon: ListChecks, href: "/setup" },
  { title: "Team", icon: Users, href: "/settings/team" },
  { title: "Usage & Activity", icon: BarChart3, href: "/settings/usage" },
  { title: "Social Connections", icon: Link2, href: "/settings/connections" },
  { title: "Email Provider", icon: Mail, href: "/settings/email-provider" },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, isAdmin } = useAuth();
  const ws = useWorkspace();
  const settingsNav = [
    { title: "Your Brand Profiles", icon: Building2, href: "/settings/clients" },
    { title: "Account Tags", icon: AtSign, href: "/settings/tags" },
    { title: "Notifications", icon: Bell, href: "/settings/notifications" },
    ...(ws.canManage ? adminSettingsNav : []),
    { title: "Help", icon: HelpCircle, href: "/help" },
    { title: "What's new", icon: Megaphone, href: "/whats-new" },
  ];

  return (
    <NavHoverProvider>
    <Sidebar collapsible="icon" className="sm-dark">
      <SidebarHeader className="px-4 py-5">
        <Link to="/" className="block w-full">
          <img
            src={socialMotiveLogo}
            alt="SocialMotive — AI-powered social intelligence"
            className="w-full h-auto rounded-md object-contain"
          />
        </Link>
        {ws.settings?.company_name && (
          <div className="mt-2 flex items-center gap-2 text-xs text-sidebar-foreground/70">
            <span>for</span>
            {ws.settings.company_logo_url && <img src={ws.settings.company_logo_url} alt="" className="h-5 max-w-[80px] object-contain" />}
            <span className="font-semibold text-sidebar-foreground">{ws.settings.company_name}</span>
          </div>
        )}
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
        <SidebarSeparator />

        <SidebarPostTo />
        <SidebarSeparator />

        <CollapsibleNavGroup id="settings" label="Settings">
          <SidebarMenu>
            {settingsNav.map((item) => (
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <LogOut className="size-4" />
              <span className="truncate text-sm">
                {user?.email ?? "Sign out"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Link to="/whats-new" className="px-2 pt-1 text-[10px] font-mono text-sidebar-foreground/50 hover:underline">SocialMotive v{APP_VERSION}</Link>
      </SidebarFooter>
    </Sidebar>
    </NavHoverProvider>
  );
}
