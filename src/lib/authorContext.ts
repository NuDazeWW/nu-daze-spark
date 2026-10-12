export interface AuthorContext {
  title?: string;
  employer?: string;
  handle?: string;
  bio?: string;
  category?: string;
  profile_url?: string;
  provenance?: "manual" | "source";
  evidence?: string;
}

export function readAuthorContext(value: unknown): AuthorContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const result: AuthorContext = {};
  for (const key of ["title", "employer", "handle", "bio", "category", "profile_url", "evidence"] as const) {
    if (typeof input[key] === "string" && input[key].trim()) result[key] = input[key].trim();
  }
  if (input.provenance === "manual" || input.provenance === "source") result.provenance = input.provenance;
  return result;
}

export function safeAuthorProfile(value: string | undefined, platform: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname;
    if (platform === "linkedin" && host === "linkedin.com" && /^\/(in|company)\/[^/]+\/?$/.test(path)) return url.href;
    if (platform === "instagram" && host === "instagram.com" && /^\/[a-zA-Z0-9._]+\/?$/.test(path) && !/^\/(p|reel|stories|explore|accounts)\/?$/.test(path)) return url.href;
  } catch { /* Invalid URLs are not rendered as links. */ }
  return undefined;
}

export function authorContextLines(context: AuthorContext, platform: string): string[] {
  const workplace = context.title && context.employer ? `${context.title} at ${context.employer}` : context.title || context.employer;
  const handle = context.handle ? `@${context.handle.replace(/^@+/, "")}` : undefined;
  return (platform === "linkedin" ? [workplace, handle, context.bio, context.category] : [handle, context.category, context.bio, workplace]).filter((v): v is string => Boolean(v));
}

export const authorContextSearch = (value: unknown) => Object.values(readAuthorContext(value)).join(" ");