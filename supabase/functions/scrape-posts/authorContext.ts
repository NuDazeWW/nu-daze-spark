// Accept only verbatim author fields backed by a verbatim source excerpt.
export function groundedAuthorContext(value: unknown, source: string, platform: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
  const evidence = typeof input.evidence === "string" ? input.evidence.trim().slice(0, 1500) : "";
  if (!evidence || !normalize(source).includes(normalize(evidence))) return null;
  const context: Record<string, string> = {};
  for (const field of ["title", "employer", "handle", "bio", "category"] as const) {
    const text = typeof input[field] === "string" ? input[field].trim().slice(0, field === "bio" ? 1000 : 200) : "";
    if (text && normalize(evidence).includes(normalize(text))) context[field] = text;
  }
  const profile = typeof input.profile_url === "string" ? input.profile_url.trim() : "";
  if (profile && source.includes(profile)) {
    try {
      const url = new URL(profile);
      const host = url.hostname.replace(/^www\./, "");
      const validPath = platform === "linkedin" ? /^\/(in|company)\/[^/]+\/?$/.test(url.pathname) : /^\/[a-zA-Z0-9._]+\/?$/.test(url.pathname) && !/^\/(p|reel|stories|explore|accounts)\/?$/.test(url.pathname);
      if (url.protocol === "https:" && !url.username && !url.password && !url.port && host === `${platform}.com` && validPath) context.profile_url = profile;
    } catch { /* Reject unsafe/unparseable profile links. */ }
  }
  return Object.keys(context).length ? { ...context, provenance: "source", evidence } : null;
}