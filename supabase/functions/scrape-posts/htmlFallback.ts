// Keyless fallback for Find Posts when Firecrawl isn't configured or fails.
// Fetches public pages directly and extracts OpenGraph / meta / JSON-LD text.
// Output matches the Firecrawl search result shape: { url, title, description, markdown }.

export type SearchResult = { url: string; title: string; description: string; markdown: string };

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const ALLOWED_HOSTS = /(^|\.)(linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|threads\.net)$/i;

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();

function meta(html: string, key: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  const m = html.match(re);
  return m ? decode(m[1] ?? m[2] ?? "") : "";
}

function jsonLdText(html: string): string {
  const out: string[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: any) => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) return n.forEach(walk);
        const author = typeof n.author === "object" ? (n.author?.name ?? n.author?.[0]?.name) : n.author;
        if (author) out.push(`Author: ${author}`);
        for (const k of ["headline", "articleBody", "text", "description"]) if (typeof n[k] === "string") out.push(n[k]);
        if (n.interactionStatistic) {
          for (const s of [].concat(n.interactionStatistic)) {
            const t = (s as any)?.interactionType; const c = (s as any)?.userInteractionCount;
            if (c != null) out.push(`${String(t?.["@type"] ?? t ?? "interaction").replace(/.*\//, "")}: ${c}`);
          }
        }
        if (n["@graph"]) walk(n["@graph"]);
      };
      walk(JSON.parse(m[1]));
    } catch { /* ignore malformed blocks */ }
  }
  return decode(out.join("\n")).slice(0, 3000);
}

export async function fetchPage(url: string): Promise<SearchResult | null> {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    const res = await fetch(u.toString(), { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 600_000);
    const title = meta(html, "og:title") || meta(html, "twitter:title") || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const description = meta(html, "og:description") || meta(html, "description") || meta(html, "twitter:description");
    const author = meta(html, "author") || meta(html, "article:author");
    const ld = jsonLdText(html);
    const markdown = [author && `Author: ${author}`, title, description, ld].filter(Boolean).join("\n\n");
    if (!title && !description && !ld) return null;
    return { url: res.url || url, title, description, markdown };
  } catch {
    return null;
  }
}

/** Keyless web search via DuckDuckGo's HTML endpoint, limited to social platforms. */
async function searchUrls(query: string, limit: number): Promise<string[]> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const urls = new Set<string>();
    for (const m of html.matchAll(/class="result__a"[^>]+href="([^"]+)"/g)) {
      let href = decode(m[1]);
      const uddg = href.match(/[?&]uddg=([^&]+)/);
      if (uddg) href = decodeURIComponent(uddg[1]);
      try { if (ALLOWED_HOSTS.test(new URL(href).hostname)) urls.add(href); } catch { /* skip */ }
      if (urls.size >= limit) break;
    }
    return [...urls];
  } catch {
    return [];
  }
}

/** Direct URLs in the query are fetched as-is; otherwise a keyless search finds candidates. */
export async function fallbackSearch(query: string, limit = 8): Promise<SearchResult[]> {
  const direct = query.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  const urls = direct.length ? direct.slice(0, limit) : await searchUrls(query, limit);
  const pages = await Promise.all(urls.map(fetchPage));
  return pages.filter((p): p is SearchResult => !!p);
}
