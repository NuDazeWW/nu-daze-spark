/** Presentation only: type and lifecycle state are separate visual signals. */
export const commentLabel = (source?: { author_name?: string | null; topic?: string | null } | null) =>
  ["Comment", source?.author_name?.trim(), source?.topic?.trim()].filter(Boolean).join(" — ");

export const pageSurface = (pathname: string): "dark" | "reading" =>
  ["/", "/auth", "/reset-password"].includes(pathname) ? "dark" : "reading";