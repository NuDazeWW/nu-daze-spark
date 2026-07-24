import { supabase } from "@/integrations/supabase/client";
import type { SourceAsset } from "@/hooks/useAssets";

export interface AssetMediaPayload {
  asset_id: string;
  images: string[]; // https URLs or data:image/jpeg;base64,...
}

// Sample N frames from a video file URL by loading it in a hidden <video> and
// drawing canvas snapshots. Returns JPEG data URLs.
async function sampleVideoFrames(videoUrl: string, count = 3, maxDim = 720): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    const frames: string[] = [];
    let timestamps: number[] = [];
    let idx = 0;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    const fail = () => { cleanup(); resolve(frames); };

    video.addEventListener("loadedmetadata", () => {
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      if (!dur) return fail();
      // sample at 10%, 50%, 90% (or evenly spaced for count != 3)
      timestamps = Array.from({ length: count }, (_, i) => dur * ((i + 1) / (count + 1)));
      video.currentTime = timestamps[0];
    });

    video.addEventListener("seeked", () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          frames.push(canvas.toDataURL("image/jpeg", 0.72));
        }
      } catch (e) {
        // tainted canvas or other error — abort further frames
        return fail();
      }
      idx++;
      if (idx < timestamps.length) {
        video.currentTime = timestamps[idx];
      } else {
        cleanup();
        resolve(frames);
      }
    });

    video.addEventListener("error", fail);
    // safety timeout
    setTimeout(() => { if (frames.length === 0) fail(); }, 30000);
  });
}

async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("source-assets").createSignedUrl(path, 60 * 30);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function prepareAssetMedia(
  assets: SourceAsset[],
  opts: { videoFrames?: number } = {}
): Promise<AssetMediaPayload[]> {
  const frames = opts.videoFrames ?? 3;
  const out: AssetMediaPayload[] = [];
  for (const a of assets) {
    const images: string[] = [];
    if (!a.file_path) { out.push({ asset_id: a.id, images }); continue; }
    const url = await getSignedUrl(a.file_path);
    if (!url) { out.push({ asset_id: a.id, images }); continue; }

    if (a.asset_type === "image") {
      images.push(url);
    } else if (a.asset_type === "video") {
      try {
        const sampled = await sampleVideoFrames(url, frames);
        images.push(...sampled);
      } catch {
        // ignore — fall back to metadata-only
      }
    }
    out.push({ asset_id: a.id, images });
  }
  return out;
}
