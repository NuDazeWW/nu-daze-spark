import {
  LayoutDashboard, FolderOpen, Link2, Settings2, Sparkles, CalendarDays, MessageSquare, CheckCircle2, Repeat2,
  AtSign, Building2, FileText, Users, ListChecks, Megaphone, CalendarRange, Bell, Mail, ImagePlus, Palette, Send,
  PieChart, CreditCard, Plug, type LucideIcon,
} from "lucide-react";

/** How a menu entry resolves: a page, a section on the same page, a tab, or a page plus a target section. */
export type NavKind = "route" | "anchor" | "tab" | "route-section";
export type NavItem = { title: string; icon: LucideIcon; href: string; kind?: NavKind };
export type NavGroup = { id: string; label: string; items: NavItem[]; localNav?: boolean };

/** Single source of truth for the sidebar and the page-top local navigation. */
export const NAV_GROUPS: NavGroup[] = [
  { id: "core", label: "Core & Insights", items: [
    { title: "Dashboard", icon: LayoutDashboard, href: "/" },
    { title: "Portfolio Insights", icon: PieChart, href: "/insights" },
  ] },
  { id: "strategy", label: "Strategy & Sources", items: [
    { title: "Brand & Strategy Studio", icon: Settings2, href: "/strategy" },
    { title: "Asset Library", icon: FolderOpen, href: "/assets" },
    { title: "Connected Sources", icon: Link2, href: "/sources" },
  ] },
  { id: "create", label: "Create & Repurpose", items: [
    { title: "Campaign Briefs", icon: FileText, href: "/briefs" },
    { title: "Post Office", icon: Sparkles, href: "/generator" },
    { title: "Post Connector", icon: Plug, href: "/generator#post-connector", kind: "route-section" },
    { title: "Comment Generator", icon: MessageSquare, href: "/comments" },
    { title: "Repurpose Center", icon: Repeat2, href: "/repurpose" },
    { title: "Motive Media Studio", icon: ImagePlus, href: "/media-studio" },
  ] },
  { id: "plan", label: "Plan & Review", items: [
    { title: "Content Planner", icon: CalendarRange, href: "/planner" },
    { title: "Executive Review", icon: Megaphone, href: "/review" },
  ] },
  // Pipeline pages already carry their own switcher (PipelineNav), so no second bar.
  { id: "pipeline", label: "Pipeline & Publishing", localNav: false, items: [
    { title: "Daily Queue", icon: CalendarDays, href: "/queue" },
    { title: "Approved Content", icon: CheckCircle2, href: "/approved" },
    { title: "Publishing Status", icon: Send, href: "/publishing" },
  ] },
  { id: "settings", label: "Workspace Settings", items: [
    { title: "Setup & Onboarding", icon: ListChecks, href: "/setup" },
    { title: "Team", icon: Users, href: "/settings/team" },
    { title: "Social Connections", icon: AtSign, href: "/settings/connections" },
    { title: "Email Provider", icon: Mail, href: "/settings/email-provider" },
    { title: "Brand Profiles", icon: Palette, href: "/settings/brand-kit" },
    { title: "Account Tags", icon: Building2, href: "/settings/tags" },
    { title: "Notifications", icon: Bell, href: "/settings/notifications" },
    { title: "Usage & Billing", icon: CreditCard, href: "/settings/usage" },
  ] },
];

/** Routes that render their own top destinations already (Strategy tabs). */
const OWN_TOP_NAV = new Set(["/strategy"]);

export function splitHref(href: string) {
  const [pathAndQuery, hash = ""] = href.split("#");
  const [path, query = ""] = pathAndQuery.split("?");
  return { path, query, hash };
}

export function isNavItemActive(item: NavItem, pathname: string, search: string, hash: string) {
  const t = splitHref(item.href);
  if (t.path !== pathname) return false;
  if (t.hash) return hash === `#${t.hash}`;
  if (t.query) return new URLSearchParams(search).toString().includes(t.query);
  // A plain page entry is active unless a sibling section entry on the same page is.
  return !hash;
}

export function groupForPath(pathname: string): NavGroup | undefined {
  if (OWN_TOP_NAV.has(pathname)) return undefined;
  const g = NAV_GROUPS.find((x) => x.items.some((i) => splitHref(i.href).path === pathname));
  return g && g.localNav !== false && g.items.length > 1 ? g : undefined;
}
