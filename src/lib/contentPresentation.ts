/** Presentation only: type and lifecycle state are separate visual signals. */
export const commentLabel = (source?: { author_name?: string | null; topic?: string | null } | null) =>
  ["Comment", source?.author_name?.trim(), source?.topic?.trim()].filter(Boolean).join(" — ");

const READING_SURFACES = [
  "/planner",
  "/sources",
  "/strategy",
  "/setup",
  "/settings/workspace",
  "/settings/team",
  "/settings/notifications",
  "/settings/connections",
  "/settings/email-provider",
];

export const pageSurface = (pathname: string): "dark" | "reading" =>
  READING_SURFACES.includes(pathname) ? "reading" : "dark";