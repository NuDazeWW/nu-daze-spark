import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BrandColor = { name: string; hex: string };
export type BrandKit = {
  id?: string; client_id: string; logo_path: string | null; colors: BrandColor[]; fonts: string[];
  product_image_paths: string[]; tone: string | null;
};
export type WatermarkPos = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export function useBrandKit(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ["brand-kit", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_kits").select("*").eq("client_id", clientId!).maybeSingle();
      if (error) throw error;
      const kit: BrandKit = data
        ? { ...data, colors: (Array.isArray(data.colors) ? data.colors : []) as BrandColor[] }
        : { client_id: clientId!, logo_path: null, colors: [], fonts: [], product_image_paths: [], tone: null };
      let logoUrl: string | null = null;
      if (kit.logo_path) {
        const { data: s } = await supabase.storage.from("account-avatars").createSignedUrl(kit.logo_path, 3600);
        logoUrl = s?.signedUrl ?? null;
      }
      return { kit, logoUrl };
    },
  });
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

/** Composite the logo onto the image client-side; returns a PNG blob. */
export async function composeWatermark(imgSrc: string, logoSrc: string | null, pos: WatermarkPos = "bottom-right", opacity = 0.85, scale = 0.16) {
  const img = await loadImg(imgSrc);
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0);
  if (logoSrc) {
    const logo = await loadImg(logoSrc);
    const w = c.width * scale; const h = (logo.naturalHeight / logo.naturalWidth) * w; const m = c.width * 0.04;
    const x = pos.endsWith("right") ? c.width - w - m : m; const y = pos.startsWith("bottom") ? c.height - h - m : m;
    ctx.globalAlpha = opacity; ctx.drawImage(logo, x, y, w, h); ctx.globalAlpha = 1;
  }
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}
