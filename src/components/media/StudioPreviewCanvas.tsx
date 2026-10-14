import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Heart, MessageCircle, Repeat2, Send, Play, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type PreviewFormat = "linkedin" | "instagram" | "story" | "reel";
const TABS: [PreviewFormat, string][] = [["linkedin", "LinkedIn Post"], ["instagram", "Instagram Post"], ["story", "Story"], ["reel", "Reel"]];

type Props = { image: string | null; clientName: string; caption: string; onCaption: (v: string) => void; format: PreviewFormat; onFormat: (f: PreviewFormat) => void };

export function StudioPreviewCanvas({ image, clientName, caption, onCaption, format, onFormat }: Props) {
  const [editing, setEditing] = useState(false);
  const initials = clientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "SM";
  const media = (cls: string) => image
    ? <img src={image} alt="Selected variation" className={cn("w-full object-cover", cls)} />
    : <div className={cn("w-full flex flex-col items-center justify-center gap-2 bg-muted/20 text-xs text-muted-foreground", cls)}><ImagePlus className="h-5 w-5" /> Generate or pick a variation</div>;
  const vertical = format === "story" || format === "reel";

  return (
    <section className="sm-card rounded-2xl border border-border/60 bg-card p-4 space-y-4" aria-label="Preview">
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {TABS.map(([v, l]) => (
          <button key={v} role="tab" aria-selected={format === v} onClick={() => onFormat(v)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              format === v ? "border-primary/70 bg-primary/15 text-foreground shadow-[0_0_16px_-6px_hsl(var(--primary))]" : "border-border/50 text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>

      <div className="flex justify-center">
        {vertical ? (
          <div className="relative w-[240px] aspect-[9/16] overflow-hidden rounded-2xl border border-border/60 bg-muted/10">
            {media("h-full")}
            <div className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-semibold text-brand-bone drop-shadow">
              <span className="h-7 w-7 rounded-full bg-primary/80 flex items-center justify-center text-[10px]">{initials}</span>{clientName}
            </div>
            {format === "reel" && image && <Play className="absolute inset-0 m-auto h-10 w-10 text-brand-bone/90" fill="currentColor" />}
            <p className="absolute bottom-3 left-3 right-3 text-[11px] text-brand-bone line-clamp-3 drop-shadow">{caption}</p>
          </div>
        ) : (
          <div className="w-full max-w-[460px] rounded-xl border border-border/60 bg-background/40 overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <span className="h-9 w-9 rounded-full bg-primary/80 flex items-center justify-center text-xs font-semibold text-primary-foreground">{initials}</span>
              <div><p className="text-sm font-semibold leading-tight">{clientName}</p><p className="text-[10px] text-muted-foreground">Preview · not published</p></div>
            </div>
            {format === "linkedin" && <p className="px-3 pb-2 text-xs whitespace-pre-wrap line-clamp-4">{caption}</p>}
            {media(format === "instagram" ? "aspect-[4/5]" : "aspect-[3/2]")}
            <div className="flex gap-4 px-3 py-2 text-muted-foreground">
              {format === "linkedin" ? <><ThumbsUp className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><Repeat2 className="h-4 w-4" /><Send className="h-4 w-4" /></>
                : <><Heart className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><Send className="h-4 w-4" /></>}
            </div>
            {format === "instagram" && <p className="px-3 pb-3 text-xs line-clamp-3"><span className="font-semibold">{clientName}</span> {caption}</p>}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Caption draft</span>
          <button className="text-primary hover:underline" onClick={() => setEditing((e) => !e)}>{editing ? "Done" : "Edit"}</button>
        </div>
        {editing ? <Textarea rows={3} maxLength={2000} value={caption} onChange={(e) => onCaption(e.target.value)} placeholder="Write the caption that goes with this visual" />
          : <p className="text-xs text-muted-foreground">{caption || "No caption yet — click Edit to write one."}</p>}
      </div>
    </section>
  );
}
