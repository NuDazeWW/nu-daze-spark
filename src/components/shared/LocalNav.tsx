import { Link, useLocation } from "react-router-dom";
import { groupForPath, isNavItemActive } from "@/lib/navigation";

/** Page-top navigation for the current menu group, built from the same list the sidebar uses. */
export function LocalNav() {
  const { pathname, search, hash } = useLocation();
  const group = groupForPath(pathname);
  if (!group) return null;
  return (
    <nav aria-label={group.label} className="sm-localnav mt-4">
      {group.items.map((item) => {
        const active = isNavItemActive(item, pathname, search, hash);
        return (
          <Link key={item.href} to={item.href} aria-current={active ? "page" : undefined}>
            <item.icon className="size-4" aria-hidden="true" />{item.title}
          </Link>
        );
      })}
    </nav>
  );
}
