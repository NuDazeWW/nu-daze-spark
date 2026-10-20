import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** Where "Back" goes when a page was opened directly. */
export const PARENT_ROUTE: Record<string, { to: string; label: string }> = {
  "/settings/email-provider": { to: "/setup", label: "Workspace Settings" },
  "/settings/connections": { to: "/setup", label: "Workspace Settings" },
  "/settings/team": { to: "/setup", label: "Workspace Settings" },
  "/settings/notifications": { to: "/setup", label: "Workspace Settings" },
  "/settings/usage": { to: "/setup", label: "Workspace Settings" },
  "/settings/billing": { to: "/setup", label: "Workspace Settings" },
  "/settings/tags": { to: "/setup", label: "Workspace Settings" },
  "/settings/clients": { to: "/setup", label: "Workspace Settings" },
  "/settings/brand-kit": { to: "/setup", label: "Workspace Settings" },
  "/help/guide": { to: "/help", label: "Help" },
};

export const ROUTE_LABEL: Record<string, string> = {
  "/": "Dashboard", "/insights": "Portfolio Insights", "/assets": "Asset Library", "/sources": "Connected Sources",
  "/strategy": "Brand & Strategy Studio", "/briefs": "Campaign Briefs", "/generator": "Social Post Generator", "/queue": "Daily Queue",
  "/review": "Executive Review", "/planner": "Content Planner", "/comments": "Comment Generator", "/approved": "Approved Content",
  "/publishing": "Publishing Status", "/repurpose": "Repurpose Center", "/media-studio": "Motive Media Studio", "/setup": "Workspace Settings",
  "/settings/team": "Team", "/settings/connections": "Social Connections", "/settings/email-provider": "Email Provider",
  "/settings/notifications": "Notifications", "/settings/usage": "Usage", "/settings/billing": "Billing", "/settings/tags": "Account Tags",
  "/settings/clients": "Clients", "/help": "Help", "/help/guide": "User Guide", "/whats-new": "What's new", "/pricing": "Pricing", "/auth": "Sign in",
};

const KEY = "sm_nav_history";
/** Track the previous in-app page so Back returns to wherever the user came from. */
export function recordNav(path: string) {
  try {
    const h: string[] = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    if (h[h.length - 1] !== path) h.push(path);
    sessionStorage.setItem(KEY, JSON.stringify(h.slice(-20)));
  } catch { /* storage unavailable */ }
}
export function previousPath(current: string): string | null {
  try {
    const h: string[] = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    for (let i = h.length - 1; i >= 0; i--) if (h[i].split("?")[0] !== current) return h[i];
  } catch { /* ignore */ }
  return null;
}

/** Stable parent link for sub-pages only; top-level pages get none (no history-based false parents). */
export function BackLink({ fallback, fallbackLabel }: { fallback?: string; fallbackLabel?: string }) {
  const { pathname } = useLocation();
  const parent = PARENT_ROUTE[pathname] ?? (fallback ? { to: fallback, label: fallbackLabel ?? ROUTE_LABEL[fallback] ?? "Dashboard" } : null);
  if (!parent) return null;
  return (
    <Link to={parent.to} className="sm-back-link inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
      <ArrowLeft className="h-4 w-4" aria-hidden />Back to {parent.label}
    </Link>
  );
}

export function Breadcrumb() {
  const { pathname } = useLocation();
  const parent = PARENT_ROUTE[pathname];
  if (!parent) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      <Link to={parent.to} className="hover:underline">{parent.label}</Link> / <span aria-current="page">{ROUTE_LABEL[pathname] ?? ""}</span>
    </nav>
  );
}
