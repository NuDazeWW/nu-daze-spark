import { formatHashtags } from "./contentPresentation";

type PackageCard = {
  platform: string; content_type: string; scheduled_for?: string | null; draft_copy: string;
  apply_ai_disclosure?: boolean | null; hashtags?: string[] | null; people_tags?: string[] | null;
  org_tags?: string[] | null; suggested_asset_description?: string | null;
};

/** Labels for the one publishing action set, in their fixed order. */
export const PUBLISH_ACTION_LABELS = {
  publishNow: "Publish now",
  schedule: "Schedule",
  copyPackage: "Copy full package",
  downloadPackage: "Download full package",
} as const;

/** Full plain-text posting package: copy, hashtags, first comment, tags, media, notes. */
export function buildPackageText(card: PackageCard, firstComment = "", notes = "", assets: { title: string; url: string | null }[] = []) {
  const lines = [
    `SOCIALMOTIVE POSTING PACKAGE`,
    `Platform: ${card.platform} · ${card.content_type}`,
    card.scheduled_for ? `Scheduled: ${new Date(card.scheduled_for).toLocaleString()}` : `Scheduled: not set`,
    "",
    "=== FINAL COPY ===",
    card.draft_copy + (card.apply_ai_disclosure ? "\n\n#AIassisted" : ""),
    "",
    "=== HASHTAGS ===",
    formatHashtags(card.hashtags ?? []) || "(none)",
    "",
    "=== FIRST COMMENT ===",
    firstComment || "(none)",
    "",
    "=== TAGGING INSTRUCTIONS ===",
    `People: ${(card.people_tags ?? []).join(", ") || "(none)"}`,
    `Organizations: ${(card.org_tags ?? []).join(", ") || "(none)"}`,
    "",
    "=== MEDIA ===",
    ...(assets.length ? assets.map((a) => `- ${a.title}${a.url ? `: ${a.url}` : ""}`) : [card.suggested_asset_description ? `Suggested: ${card.suggested_asset_description}` : "(none)"]),
    "",
    "=== POSTING NOTES ===",
    notes || "(none)",
  ];
  return lines.join("\n");
}

export function downloadPackageText(text: string, card: Pick<PackageCard, "platform" | "content_type">, suffix = "") {
  const blob = new Blob([text + "\n"], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SocialMotive-${card.platform}-${card.content_type}${suffix ? `-${suffix}` : ""}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
