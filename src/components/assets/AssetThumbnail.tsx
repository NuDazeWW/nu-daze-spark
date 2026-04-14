import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

interface AssetThumbnailProps {
  filePath: string;
  assetType: string;
  title: string;
  onClick?: () => void;
}

export function AssetThumbnail({ filePath, assetType, title, onClick }: AssetThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from("source-assets")
      .createSignedUrl(filePath, 600)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(true);
        else setUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [filePath]);

  if (error || !url) return null;

  const isVideo = assetType === "video";

  return (
    <div
      className="relative w-full h-32 rounded-md overflow-hidden bg-muted/30 cursor-pointer group"
      onClick={onClick}
    >
      {isVideo ? (
        <>
          <video
            src={url}
            muted
            preload="metadata"
            className="w-full h-full object-cover"
            onLoadedData={(e) => {
              // Seek to 1s for a better thumbnail frame
              const vid = e.currentTarget;
              if (vid.duration > 1) vid.currentTime = 1;
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <Play className="h-8 w-8 text-white drop-shadow-lg" fill="white" />
          </div>
        </>
      ) : (
        <img
          src={url}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
