export interface StoryFrame {
  title: string;
  onScreen: string;
  outline: string;
}

const cleanLine = (line: string) => line.replace(/\*\*/g, "").replace(/^\s*#{1,6}\s*/, "").trim();
const captionHeading = /^(?:FINAL CAPTION|REEL CAPTION|STORY CAPTION)\s*[:—–-]?\s*(.*)$/i;
const endingHeading = /^(?:CTA\s*\/\s*LINK|EDITING NOTES|POSTING NOTES|END FRAME|HASHTAGS|TAGGING INSTRUCTIONS)\b/i;

export function extractPreviewCopy(draft: string, type: string) {
  const lines = draft.split("\n");
  const structured = ["story", "reel"].includes(type) && lines.some((l) =>
    /^(?:FRAME\s+\d+|REEL CONCEPT|DURATION|\d+:\d+\s*[-–]|ON-SCREEN TEXT|VISUAL\s*[:/])/i.test(cleanLine(l)));
  const start = lines.findIndex((line) => captionHeading.test(cleanLine(line)));
  if (start >= 0) {
    const first = cleanLine(lines[start]).match(captionHeading)?.[1] ?? "";
    const rest: string[] = [];
    for (const line of lines.slice(start + 1)) {
      if (endingHeading.test(cleanLine(line))) break;
      rest.push(line);
    }
    const caption = [first, ...rest].join("\n").trim();
    return { caption, structured: true, missingCaption: !caption };
  }
  return { caption: structured ? "" : draft.trim(), structured, missingCaption: structured };
}

export function parseStoryFrames(draft: string): StoryFrame[] {
  const frames: StoryFrame[] = [];
  let current: StoryFrame | undefined;
  for (const raw of draft.split("\n")) {
    const line = cleanLine(raw);
    if (captionHeading.test(line)) break;
    if (/^FRAME\s+\d+\b/i.test(line)) {
      current = { title: line, onScreen: "", outline: "" };
      frames.push(current);
    } else if (current) {
      current.outline += `${raw}\n`;
      const text = line.match(/^On[- ]screen text\s*[:—–-]\s*(.*)$/i);
      if (text) current.onScreen = text[1].replace(/^["“]|["”]$/g, "");
    }
  }
  return frames;
}

export function withHashtags(caption: string, hashtags: string[] | null) {
  const tags = [...new Set((hashtags ?? []).map((t) => `#${t.replace(/^#+/, "").trim()}`).filter((t) => t.length > 1))];
  const missing = tags.filter((tag) => !caption.split(/\s+/).some((word) => word.toLowerCase() === tag.toLowerCase()));
  return [caption, missing.join(" ")].filter(Boolean).join("\n\n");
}

export function isPreviewMedia(asset: { asset_type: string; permission_state: string; deleted_at?: string | null; expires_at?: string | null }) {
  return ["image", "video"].includes(asset.asset_type) && asset.permission_state === "generation_allowed" &&
    !asset.deleted_at && (!asset.expires_at || new Date(asset.expires_at).getTime() > Date.now());
}

export function previewLimit(platform: string) {
  if (platform === "instagram") return 2200;
  if (platform === "facebook") return 63206;
  return 3000;
}