import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, FileText, Link2, Type, Presentation, Quote, BookOpen } from "lucide-react";

const DOC_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  deck: Presentation,
  testimonial: Quote,
  case_study: BookOpen,
  link: Link2,
  text_snippet: Type,
};

interface AssetThumbnailProps {
  filePath: string | null;
  assetType: string;
  title: string;
  onClick?: () => void;
}

export function AssetThumbnail({ filePath, assetType, title, onClick }: AssetThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const isImage = assetType === "image";
  const isVideo = assetType === "video";
  const needsSignedUrl = (isImage || isVideo) && !!filePath;

  useEffect(() => {
    if (!needsSignedUrl) return;
    let cancelled = false;
    supabase.storage
      .from("source-assets")
      .createSignedUrl(filePath!, 600)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(true);
        else setUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [filePath, needsSignedUrl]);

  // For non-image/video types, show an icon placeholder
  if (!isImage && !isVideo) {
    const Icon = DOC_ICONS[assetType] ?? FileText;
    return (
      <div
        className="relative w-full h-32 rounded-md overflow-hidden bg-muted/30 cursor-pointer group flex items-center justify-center"
        onClick={onClick}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
          <Icon className="h-10 w-10" />
          <span className="text-[10px] uppercase font-medium tracking-wide">{assetType.replace("_", " ")}</span>
        </div>
      </div>
    );
  }

  if (error || !url) return null;

  return (
    <div
      className="relative w-full h-32 rounded-md overflow-hidden bg-muted/30 cursor-pointer group"
      onClick={onClick}
    >
      {isVideo ? (
        <>
          <video src={url} muted preload="metadata" className="w-full h-full object-cover"
            onLoadedData={(e) => { const vid = e.currentTarget; if (vid.duration > 1) vid.currentTime = 1; }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-brand-midnight/30 group-hover:bg-brand-midnight/40 transition-colors">
            <Play className="h-8 w-8 text-brand-bone" fill="currentColor" />
          </div>
        </>
      ) : (
        <img src={url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" onError={() => setError(true)} />
      )}
    </div>
  );
}
