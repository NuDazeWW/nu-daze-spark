// Unified folder browser for OneDrive, SharePoint and Google Drive.
// Every provider returns Microsoft Graph-shaped items ({ value: DriveItem[] }) so the
// Asset Library browser renders one list format regardless of source.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Id = z.string().trim().min(1).max(400).regex(/^[\w!.,:\-]+$/, "Invalid id");
const Body = z.object({
  provider: z.enum(["onedrive", "sharepoint", "google_drive"]),
  action: z.enum([
    "list_root", "list_folder", "list_remote_folder", "get_item", "search",
    "list_sharepoint_sites", "list_site_drive", "list_site_drives",
  ]),
  itemId: Id.optional(),
  siteId: Id.optional(),
  driveId: Id.optional(),
  searchQuery: z.string().trim().max(200).optional(),
});

const MS = {
  onedrive: { url: "https://connector-gateway.lovable.dev/microsoft_onedrive", key: "MICROSOFT_ONEDRIVE_API_KEY" },
  sharepoint: { url: "https://connector-gateway.lovable.dev/microsoft_sharepoint", key: "MICROSOFT_SHAREPOINT_API_KEY" },
};
const GDRIVE = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const GFOLDER = "application/vnd.google-apps.folder";

class ProviderError extends Error {
  constructor(public status: number, public details: string, label: string) { super(`${label} error: ${status}`); }
}

async function msCall(provider: "onedrive" | "sharepoint", path: string, lovableKey: string, list: boolean) {
  const cfg = MS[provider];
  const connKey = Deno.env.get(cfg.key);
  if (!connKey) throw new ProviderError(412, `${provider === "sharepoint" ? "SharePoint" : "OneDrive"} is not connected yet.`, "Not connected");
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey };
  const res = await fetch(`${cfg.url}${path}`, { headers });
  if (!res.ok) throw new ProviderError(res.status, await res.text(), "Microsoft Graph API");
  let data = await res.json();
  if (list && data["@odata.nextLink"]) {
    const all = [...(data.value ?? [])];
    let next: string | undefined = data["@odata.nextLink"];
    for (let i = 0; next && i < 10; i++) {
      const r = await fetch(`${cfg.url}${next.replace(/^https:\/\/graph\.microsoft\.com\/v1\.0/, "")}`, { headers });
      if (!r.ok) break;
      const d = await r.json();
      all.push(...(d.value ?? []));
      next = d["@odata.nextLink"];
    }
    data = { value: all };
  }
  return data;
}

function microsoftPath(b: z.infer<typeof Body>): { path: string; list: boolean } {
  const q = (p: string) => `${p}${p.includes("?") ? "&" : "?"}includeHiddenFolders=true`;
  const need = (v: string | undefined, n: string) => { if (!v) throw new ProviderError(400, `${n} required`, "Bad request"); return v; };
  switch (b.action) {
    case "list_root": return { path: q("/me/drive/root/children"), list: true };
    case "list_folder": return { path: q(`/me/drive/items/${need(b.itemId, "itemId")}/children`), list: true };
    case "list_remote_folder": {
      const d = need(b.driveId, "driveId");
      return { path: q(b.itemId ? `/drives/${d}/items/${b.itemId}/children` : `/drives/${d}/root/children`), list: true };
    }
    case "get_item": {
      const i = need(b.itemId, "itemId");
      if (b.siteId) return { path: `/sites/${b.siteId}/drive/items/${i}`, list: false };
      return { path: b.driveId ? `/drives/${b.driveId}/items/${i}` : `/me/drive/items/${i}`, list: false };
    }
    case "search": {
      const s = need(b.searchQuery, "searchQuery").replace(/'/g, "''");
      if (b.siteId) return { path: `/sites/${b.siteId}/drive/root/search(q='${encodeURIComponent(s)}')`, list: true };
      return { path: `/me/drive/root/search(q='${encodeURIComponent(s)}')`, list: true };
    }
    case "list_sharepoint_sites":
      return { path: `/sites?search=${encodeURIComponent(b.searchQuery || "*")}`, list: true };
    case "list_site_drive": {
      const s = need(b.siteId, "siteId");
      return { path: q(b.itemId ? `/sites/${s}/drive/items/${b.itemId}/children` : `/sites/${s}/drive/root/children`), list: true };
    }
    case "list_site_drives": return { path: `/sites/${need(b.siteId, "siteId")}/drives`, list: true };
  }
}

// deno-lint-ignore no-explicit-any
const fromGoogle = (f: any) => ({
  id: f.id,
  name: f.name,
  size: f.size ? Number(f.size) : undefined,
  ...(f.mimeType === GFOLDER ? { folder: { childCount: 0 } } : { file: { mimeType: f.mimeType } }),
  webUrl: f.webViewLink,
  lastModifiedDateTime: f.modifiedTime,
  thumbnailUrl: f.thumbnailLink,
  "@microsoft.graph.downloadUrl": f.webContentLink ?? f.webViewLink,
});

async function googleCall(b: z.infer<typeof Body>, lovableKey: string) {
  const connKey = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!connKey) throw new ProviderError(412, "Google Drive is not connected yet.", "Not connected");
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey };
  const fields = "id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink";

  if (b.action === "get_item") {
    if (!b.itemId) throw new ProviderError(400, "itemId required", "Bad request");
    const r = await fetch(`${GDRIVE}/files/${b.itemId}?fields=${fields}&supportsAllDrives=true`, { headers });
    if (!r.ok) throw new ProviderError(r.status, await r.text(), "Google Drive API");
    return fromGoogle(await r.json());
  }

  let q: string;
  if (b.action === "list_root") q = "'root' in parents and trashed=false";
  else if (b.action === "list_folder") {
    if (!b.itemId) throw new ProviderError(400, "itemId required", "Bad request");
    q = `'${b.itemId}' in parents and trashed=false`;
  } else if (b.action === "search") {
    if (!b.searchQuery) throw new ProviderError(400, "searchQuery required", "Bad request");
    q = `name contains '${b.searchQuery.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and trashed=false`;
  } else throw new ProviderError(400, `${b.action} is not available for Google Drive`, "Bad request");

  const all: unknown[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 10; i++) {
    const params = new URLSearchParams({
      q, pageSize: "200", orderBy: "folder,name", fields: `nextPageToken,files(${fields})`,
      supportsAllDrives: "true", includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const r = await fetch(`${GDRIVE}/files?${params}`, { headers });
    if (!r.ok) throw new ProviderError(r.status, await r.text(), "Google Drive API");
    const d = await r.json();
    all.push(...(d.files ?? []).map(fromGoogle));
    pageToken = d.nextPageToken;
    if (!pageToken) break;
  }
  return { value: all };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY is not configured" }, 500);

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    if (b.provider === "google_drive") return json(await googleCall(b, lovableKey));
    const { path, list } = microsoftPath(b);
    return json(await msCall(b.provider, path, lovableKey, list));
  } catch (e) {
    if (e instanceof ProviderError) {
      console.error(e.message, e.details);
      return json({ error: e.message, details: e.details }, e.status);
    }
    console.error("browse-cloud-storage error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
