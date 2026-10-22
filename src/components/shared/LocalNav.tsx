import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { groupForPath, isNavItemActive, splitHref } from "@/lib/navigation";
import type { Accent } from "@/lib/cardAccents";

const DESTINATION_ACCENTS: Record<string, Accent> = {
  "/": "cyan", "/insights": "violet", "/strategy": "violet", "/assets": "gold", "/sources": "gold",
  "/briefs": "gold", "/generator": "cyan", "/comments": "magenta", "/repurpose": "cyan", "/media-studio": "cyan",
  "/planner": "violet", "/review": "gold", "/queue": "violet", "/approved": "gold", "/publishing": "violet",
  "/setup": "gold", "/settings/team": "magenta", "/settings/connections": "cyan", "/settings/email-provider": "gold",
  "/settings/brand-kit": "violet", "/settings/tags": "magenta", "/settings/notifications": "magenta", "/settings/usage": "violet",
};

/** Page-top navigation for the current menu group, built from the same list the sidebar uses. */
export function LocalNav() {
  const { pathname, search, hash } = useLocation();
  const group = groupForPath(pathname);
  if (!group) return null;
  return (
    <nav aria-label={group.label} className="sm-localnav mt-4">
      {group.items.map((navItem) =>
        // Page-top bar only: the sidebar keeps Asset Library.
        group.id === "strategy" && navItem.href === "/assets"
          ? { title: "Approved Content", icon: CheckCircle2, href: "/approved" }
          : navItem,
      ).map((item, index) => {
        const active = isNavItemActive(item, pathname, search, hash) ||
          (pathname === "/generator" && !hash && index === 0);
        return (
          <Link
            key={item.href}
            to={item.href}
            className="sm-localnav-link sm-lit-btn"
            data-accent={DESTINATION_ACCENTS[splitHref(item.href).path] ?? "neutral"}
            data-selected={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <item.icon className="size-4" aria-hidden="true" />{item.title}
          </Link>
        );
      })}
    </nav>
  );
}
