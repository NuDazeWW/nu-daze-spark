import { useState, useCallback, useRef } from "react";

export interface ReelConfig {
  slideDuration: number; // seconds per image
  transitionDuration: number; // seconds for crossfade
  width: number;
  height: number;
  fps: number;
  kenBurns: boolean;
}

export const DEFAULT_REEL_CONFIG: ReelConfig = {
  slideDuration: 3,
  transitionDuration: 0.5,
  width: 1080,
  height: 1920,
  fps: 30,
  kenBurns: true,
};

interface ReelProgress {
  stage: string;
  percent: number;
}

export function useReelCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<ReelProgress>({ stage: "", percent: 0 });
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const abortRef = useRef(false);

  const loadImage = (file: File): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cw: number,
    ch: number,
    scale: number,
    offsetX: number,
    offsetY: number,
    alpha: number
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;

    const imgAspect = img.width / img.height;
    const canvasAspect = cw / ch;

    let drawW: number, drawH: number;
    if (imgAspect > canvasAspect) {
      drawH = ch * scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = cw * scale;
      drawH = drawW / imgAspect;
    }

    const x = (cw - drawW) / 2 + offsetX;
    const y = (ch - drawH) / 2 + offsetY;

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();
  };

  const createReel = useCallback(async (files: File[], config: ReelConfig = DEFAULT_REEL_CONFIG) => {
    if (files.length === 0) return;
    abortRef.current = false;
    setIsCreating(true);
    setResultUrl(null);
    setProgress({ stage: "Loading images…", percent: 0 });

    try {
      // Load all images
      const images = await Promise.all(files.map(loadImage));
      if (abortRef.current) return;

      const { width, height, fps, slideDuration, transitionDuration, kenBurns } = config;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(fps);
      const chunks: Blob[] = [];

      // Try MP4 first, fall back to WebM
      const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
        ? "video/mp4;codecs=avc1"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const ext = mimeType.startsWith("video/mp4") ? "video/mp4" : "video/webm";
          resolve(new Blob(chunks, { type: ext }));
        };
      });

      recorder.start();

      const slideFrames = Math.round(slideDuration * fps);
      const transFrames = Math.round(transitionDuration * fps);
      const totalFrames = images.length * slideFrames;

      // Ken Burns directions per image
      const kbDirections = images.map((_, i) => ({
        startScale: 1.0,
        endScale: 1.12,
        offsetXDir: i % 2 === 0 ? 1 : -1,
        offsetYDir: i % 3 === 0 ? 1 : -1,
      }));

      for (let frame = 0; frame < totalFrames; frame++) {
        if (abortRef.current) {
          recorder.stop();
          return;
        }

        const currentSlide = Math.min(Math.floor(frame / slideFrames), images.length - 1);
        const frameInSlide = frame - currentSlide * slideFrames;
        const slideProgress = frameInSlide / slideFrames;

        // Clear
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // Check if we're in a transition zone (last transFrames of a slide)
        const inTransition = currentSlide < images.length - 1 && frameInSlide >= slideFrames - transFrames;

        if (inTransition) {
          const transProgress = (frameInSlide - (slideFrames - transFrames)) / transFrames;
          const nextSlide = currentSlide + 1;

          // Draw current image fading out
          const kb1 = kbDirections[currentSlide];
          const s1 = kenBurns
            ? kb1.startScale + (kb1.endScale - kb1.startScale) * slideProgress
            : 1;
          const ox1 = kenBurns ? kb1.offsetXDir * slideProgress * 20 : 0;
          const oy1 = kenBurns ? kb1.offsetYDir * slideProgress * 15 : 0;
          drawImageCover(ctx, images[currentSlide], width, height, s1, ox1, oy1, 1 - transProgress);

          // Draw next image fading in
          const nextProgress = transProgress * (transFrames / slideFrames);
          const kb2 = kbDirections[nextSlide];
          const s2 = kenBurns
            ? kb2.startScale + (kb2.endScale - kb2.startScale) * nextProgress
            : 1;
          const ox2 = kenBurns ? kb2.offsetXDir * nextProgress * 20 : 0;
          const oy2 = kenBurns ? kb2.offsetYDir * nextProgress * 15 : 0;
          drawImageCover(ctx, images[nextSlide], width, height, s2, ox2, oy2, transProgress);
        } else {
          // Draw current image
          const kb = kbDirections[currentSlide];
          const s = kenBurns
            ? kb.startScale + (kb.endScale - kb.startScale) * slideProgress
            : 1;
          const ox = kenBurns ? kb.offsetXDir * slideProgress * 20 : 0;
          const oy = kenBurns ? kb.offsetYDir * slideProgress * 15 : 0;
          drawImageCover(ctx, images[currentSlide], width, height, s, ox, oy, 1);
        }

        // Update progress
        const percent = Math.round((frame / totalFrames) * 100);
        if (frame % fps === 0) {
          setProgress({ stage: `Rendering frame ${frame}/${totalFrames}…`, percent });
        }

        // Wait for next frame timing
        await new Promise((r) => setTimeout(r, 1000 / fps));
      }

      recorder.stop();
      const blob = await done;
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setProgress({ stage: "Done!", percent: 100 });

      // Cleanup image object URLs
      images.forEach((img) => URL.revokeObjectURL(img.src));
    } catch (err) {
      console.error("Reel creation failed:", err);
      setProgress({ stage: "Error creating reel", percent: 0 });
    } finally {
      setIsCreating(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  const clearResult = useCallback(() => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  }, [resultUrl]);

  return { createReel, isCreating, progress, resultUrl, cancel, clearResult };
}
