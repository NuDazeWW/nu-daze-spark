import { NAV_GROUPS, type NavItem } from "./navigation";

export type NavSearchEntry = NavItem & { group: string };

/** Every sidebar destination, flattened with its group name. */
export const NAV_SEARCH_INDEX: NavSearchEntry[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.label })),
).concat([
  { title: "Help", icon: NAV_GROUPS[0].items[0].icon, href: "/help", group: "Help" },
  { title: "What's new", icon: NAV_GROUPS[0].items[0].icon, href: "/whats-new", group: "Help" },
]);

/** Loose match: every typed character appears in order in the title or group name. */
export function navMatches(entry: Pick<NavSearchEntry, "title" | "group">, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!q) return true;
  const hay = [entry.title, entry.group, `${entry.title} ${entry.group}`].map((s) => s.toLowerCase());
  return hay.some((h) => {
    if (h.replace(/\s+/g, "").includes(q)) return true;
    let i = 0;
    for (const c of h) if (c === q[i]) i++;
    return i === q.length;
  });
}
