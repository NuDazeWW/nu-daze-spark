import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Heart, MessageCircle, Repeat2, Send, Play, ThumbsUp, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandBadge } from "@/components/shared/BrandBadge";
import type { Variation } from "./StudioVariationsDeck";

export type PreviewFormat = "linkedin" | "instagram" | "story" | "reel";
const TABS: [PreviewFormat, string][] = [["linkedin", "LinkedIn Post"], ["instagram", "Instagram Post"], ["story", "Story"], ["reel", "Reel"]];

type Props = {
  image: string | null; clientName: string; caption: string; onCaption: (v: string) => void;
  format: PreviewFormat; onFormat: (f: PreviewFormat) => void;
  rail: Variation[]; activeId: string | null; onSelect: (id: string) => void; busy: boolean;
};

export function StudioPreviewCanvas({ image, clientName, caption, onCaption, format, onFormat, rail, activeId, onSelect, busy }: Props) {
  const [editing, setEditing] = useState(false);
  const initials = clientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "SM";
  const media = (cls: string) => image
    ? <img src={image} alt="Selected variation" className={cn("w-full object-cover", cls)} />
    : <div className={cn("w-full flex flex-col items-center justify-center gap-2 bg-[hsl(220_14%_94%)] text-xs text-[hsl(220_9%_46%)]", cls)}>
        <ImagePlus className="h-5 w-5" />{busy ? "Creating image…" : "Generate or pick a variation"}
      </div>;
  const vertical = format === "story" || format === "reel";
  const captionText = caption || "No caption yet — click Edit to write one.";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="tablist" aria-label="Preview format">
        {TABS.map(([v, l]) => (
          <button key={v} role="tab" aria-selected={format === v} onClick={() => onFormat(v)}
            className={cn("sm-studio-tab flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium whitespace-nowrap",
              format === v && "is-active")}>
            <BrandBadge platform={v === "linkedin" ? "linkedin" : v === "story" ? "story" : v === "reel" ? "reel" : "instagram"} size={22} />{l}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-3", rail.length > 0 && "sm:grid-cols-[minmax(0,1fr)_112px]")}>
        <div className="flex justify-center">
          {vertical ? (
            <div className="relative w-[230px] aspect-[9/16] overflow-hidden rounded-2xl border border-border/60 bg-black shadow-xl">
              {media("h-full")}
              <div className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-semibold text-brand-bone drop-shadow">
                <span className="h-7 w-7 rounded-full bg-primary/80 flex items-center justify-center text-[10px]">{initials}</span>{clientName}
              </div>
              {format === "reel" && image && <Play className="absolute inset-0 m-auto h-10 w-10 text-brand-bone/90" fill="currentColor" />}
              <p className="absolute bottom-3 left-3 right-3 text-[11px] text-brand-bone line-clamp-3 drop-shadow">{caption}</p>
            </div>
          ) : (
            <div className="sm-native-card w-full max-w-[380px] rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <span className="h-10 w-10 rounded-full bg-[hsl(222_47%_11%)] flex items-center justify-center text-xs font-semibold text-[hsl(0_0%_100%)]">{initials}</span>
                <div className="flex-1"><p className="text-sm font-semibold leading-tight">{clientName}</p><p className="text-[11px] opacity-60">Preview · not published</p></div>
                <MoreHorizontal className="h-4 w-4 opacity-60" />
              </div>
              {format === "linkedin" && <p className="px-3 pb-2 text-[13px] whitespace-pre-wrap line-clamp-4">{captionText}</p>}
              {media(format === "instagram" ? "aspect-square" : "aspect-[16/9]")}
              <div className="flex gap-5 px-3 py-2.5 opacity-70">
                {format === "linkedin" ? <><ThumbsUp className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><Repeat2 className="h-4 w-4" /><Send className="h-4 w-4" /></>
                  : <><Heart className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><Send className="h-4 w-4" /></>}
              </div>
              {format === "instagram" && <p className="px-3 pb-3 text-[13px] line-clamp-3"><span className="font-semibold">{clientName}</span> {captionText}</p>}
            </div>
          )}
        </div>
        {rail.length > 0 && (
          <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible" aria-label="Variation thumbnails">
            {rail.map((v, i) => (
              <button key={v.id} onClick={() => onSelect(v.id)} aria-label={`Show variant ${i + 1}`}
                className={cn("sm-rail-thumb shrink-0 w-24 sm:w-full aspect-[4/3] rounded-lg overflow-hidden", v.id === activeId && "is-active")}>
                <img src={v.image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 text-xs">
        <div className="min-w-0 flex-1">
          <span className="font-medium">Caption draft</span>
          {editing ? <Textarea rows={2} maxLength={2000} value={caption} onChange={(e) => onCaption(e.target.value)} className="mt-1" placeholder="Write the caption that goes with this visual" />
            : <p className="text-muted-foreground line-clamp-1">{captionText}</p>}
        </div>
        <button className="text-primary hover:underline shrink-0" onClick={() => setEditing((e) => !e)}>{editing ? "Done" : "Edit"}</button>
      </div>
    </div>
  );
}
