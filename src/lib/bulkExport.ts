import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import type { PostCard } from "@/hooks/usePostCards";
import { postLabel } from "@/components/tracking/PostTracking";

export type ExportFormat = "zip" | "csv" | "json";
export type CsvPreset = "socialmotive" | "buffer" | "hootsuite" | "meta";

export const EXPORT_SCHEMA_VERSION = "1.0";

type Asset = { id: string; title: string; file_path: string | null; external_url: string | null; asset_type: string; permission_state: string };

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: (string | number | null | undefined)[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

const fullCaption = (c: PostCard) => [c.draft_copy, (c.hashtags ?? []).join(" ")].filter(Boolean).join("\n\n");
const safe = (s: string) => s.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").slice(0, 60);

async function sha256(input: ArrayBuffer | string) {
  const buf = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loadAssets(cards: PostCard[]): Promise<Record<string, Asset>> {
  const ids = Array.from(new Set(cards.flatMap((c) => c.source_references ?? [])));
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("source_assets").select("id,title,file_path,external_url,asset_type,permission_state").in("id", ids);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((a) => [a.id, a as Asset]));
}

/** Only cleared, file-backed assets are packaged as media. */
const isPackageable = (a?: Asset) => !!a?.file_path && a.permission_state !== "blocked" && a.permission_state !== "archived";

export function mediaFor(card: PostCard, assets: Record<string, Asset>) {
  return (card.source_references ?? []).map((id) => assets[id]).filter(isPackageable) as Asset[];
}

function rowsFor(preset: CsvPreset, cards: PostCard[], assets: Record<string, Asset>, mediaNames: Record<string, string[]>) {
  const date = (c: PostCard) => c.scheduled_for ?? "";
  const media = (c: PostCard) => (mediaNames[c.id] ?? mediaFor(c, assets).map((a) => a.title)).join(" | ");
  switch (preset) {
    case "buffer":
      return [["Text", "Image URL", "Tags", "Posting Time"], ...cards.map((c) => [fullCaption(c), media(c), c.platform, date(c)])];
    case "hootsuite":
      return [["Date", "Post", "Link", "Media"], ...cards.map((c) => [date(c) ? new Date(date(c)).toLocaleString("en-GB", { hour12: false }).replace(",", "") : "", fullCaption(c), "", media(c)])];
    case "meta":
      return [["Platform", "Scheduled time", "Caption", "First comment", "Media files"], ...cards.map((c) => [c.platform, date(c), fullCaption(c), c.first_comment ?? "", media(c)])];
    default:
      return [
        ["post_id", "post_number", "platform", "content_type", "status", "scheduled_for", "objective", "audience", "campaign_pillar", "copy", "hashtags", "people_tags", "org_tags", "first_comment", "posting_notes", "media_files", "brief_id", "posted_url"],
        ...cards.map((c) => [c.id, postLabel(c), c.platform, c.content_type, c.approval_status, date(c), c.objective, c.audience, c.campaign_pillar, c.draft_copy,
          (c.hashtags ?? []).join(" "), (c.people_tags ?? []).join(", "), (c.org_tags ?? []).join(", "), c.first_comment, c.posting_notes, media(c), c.brief_id, c.posted_url]),
      ];
  }
}

function manifestEntry(c: PostCard, files: { path: string; sha256: string }[], copyPath?: string) {
  return {
    post_id: c.id, post_number: postLabel(c), platform: c.platform, content_type: c.content_type, status: c.approval_status,
    scheduled_for: c.scheduled_for, objective: c.objective, audience: c.audience, campaign_pillar: c.campaign_pillar,
    copy: c.draft_copy, hashtags: c.hashtags ?? [], people_tags: c.people_tags ?? [], org_tags: c.org_tags ?? [],
    first_comment: c.first_comment, posting_notes: c.posting_notes, brief_id: c.brief_id, master_content_id: c.master_content_id,
    source_references: c.source_references ?? [], copy_file: copyPath, media: files,
  };
}

function copyFile(c: PostCard, media: string[]) {
  return [
    `${postLabel(c)} · ${c.platform} · ${c.content_type}`,
    c.scheduled_for ? `Scheduled: ${new Date(c.scheduled_for).toLocaleString()}` : "Scheduled: not set",
    "", "CAPTION", c.draft_copy, "",
    `HASHTAGS: ${(c.hashtags ?? []).join(" ")}`,
    `PEOPLE TAGS: ${(c.people_tags ?? []).join(", ")}`,
    `ORGANIZATION TAGS: ${(c.org_tags ?? []).join(", ")}`,
    c.first_comment ? `\nFIRST COMMENT\n${c.first_comment}` : "",
    c.posting_notes ? `\nPOSTING NOTES\n${c.posting_notes}` : "",
    `\nMEDIA: ${media.length ? media.join(", ") : c.suggested_asset_description ? `none attached — suggested: ${c.suggested_asset_description}` : "none"}`,
  ].join("\n");
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function runBulkExport(opts: {
  cards: PostCard[]; format: ExportFormat; preset: CsvPreset; includeMedia: boolean;
  onProgress?: (msg: string) => void;
}): Promise<{ skippedMedia: number; mediaCount: number }> {
  const { cards, format, preset, includeMedia, onProgress } = opts;
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `SocialMotive-export-${stamp}`;
  const assets = await loadAssets(cards);

  if (format === "csv") {
    download(new Blob(["\ufeff" + toCsv(rowsFor(preset, cards, assets, {}))], { type: "text/csv" }), `${base}-${preset}.csv`);
    return { skippedMedia: 0, mediaCount: 0 };
  }
  if (format === "json") {
    const body = { schema_version: EXPORT_SCHEMA_VERSION, generated_at: new Date().toISOString(), post_count: cards.length, posts: cards.map((c) => manifestEntry(c, [])) };
    download(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }), `${base}.json`);
    return { skippedMedia: 0, mediaCount: 0 };
  }

  const zip = new JSZip();
  const entries: ReturnType<typeof manifestEntry>[] = [];
  const mediaNames: Record<string, string[]> = {};
  let skipped = 0, mediaCount = 0;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    onProgress?.(`Packaging ${i + 1} of ${cards.length} (${postLabel(c)})`);
    const folder = `${postLabel(c)}_${c.platform}_${c.scheduled_for ? c.scheduled_for.slice(0, 10) : "unscheduled"}`;
    const files: { path: string; sha256: string }[] = [];
    if (includeMedia) {
      for (const [n, a] of mediaFor(c, assets).entries()) {
        try {
          const { data, error } = await supabase.storage.from("source-assets").download(a.file_path!);
          if (error || !data) throw error;
          const ext = a.file_path!.split(".").pop() ?? "bin";
          const path = `${folder}/media-${n + 1}-${safe(a.title)}.${ext}`;
          const buf = await data.arrayBuffer();
          zip.file(path, buf);
          files.push({ path, sha256: await sha256(buf) });
          mediaCount++;
        } catch { skipped++; }
      }
    }
    mediaNames[c.id] = files.map((f) => f.path);
    const copyPath = `${folder}/copy.txt`;
    zip.file(copyPath, copyFile(c, files.map((f) => f.path.split("/").pop()!)));
    entries.push(manifestEntry(c, files, copyPath));
  }

  zip.file("manifest.json", JSON.stringify({ schema_version: EXPORT_SCHEMA_VERSION, generated_at: new Date().toISOString(), post_count: cards.length, media_count: mediaCount, posts: entries }, null, 2));
  zip.file("posts.csv", "\ufeff" + toCsv(rowsFor("socialmotive", cards, assets, mediaNames)));
  zip.file("README.txt", [
    "SocialMotive posting package",
    `Generated ${new Date().toLocaleString()} · ${cards.length} posts · ${mediaCount} media files`,
    "", "Each folder holds one post: copy.txt (caption, hashtags, tags, notes) and its approved media.",
    "posts.csv is a spreadsheet of every post; manifest.json is the machine-readable version with file checksums (SHA-256).",
    "Nothing in this package has been published. Post manually or import into your scheduler.",
  ].join("\n"));

  onProgress?.("Compressing…");
  download(await zip.generateAsync({ type: "blob" }), `${base}.zip`);
  return { skippedMedia: skipped, mediaCount };
}
