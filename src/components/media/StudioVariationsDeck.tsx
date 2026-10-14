import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, ListPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Variation = { id: string; image: string; prompt: string };

type Props = { items: Variation[]; activeId: string | null; onSelect: (id: string) => void; onQueue: (v: Variation) => void; queueingId: string | null; canCreate: boolean };

export function StudioVariationsDeck({ items, activeId, onSelect, onQueue, queueingId, canCreate }: Props) {
  return (
    <section className="sm-studio-panel p-3.5 space-y-3" aria-label="AI-generated variations">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-base font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> AI-Generated Variations</h2>
        <p className="text-xs text-muted-foreground">Click a variation to preview it, or add it to the queue.</p>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">Latest 4 this session</span>
      </div>
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => {
          const v = items[i];
          if (!v) return (
            <div key={i} className="sm-variant-empty rounded-xl h-[112px] flex items-center justify-center text-[11px] text-muted-foreground">
              Variant {i + 1}
            </div>
          );
          const on = v.id === activeId;
          return (
            <div key={v.id} className={cn("sm-variant rounded-xl overflow-hidden", on && "is-active")}>
              <button type="button" onClick={() => onSelect(v.id)} className="relative block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <img src={v.image} alt={`Variant ${i + 1}`} className="w-full h-[88px] object-cover" />
                <span className="absolute top-2 left-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold">Variant {i + 1}</span>
                {on && <Badge variant="outline" className="absolute top-2 right-2 text-[9px] h-4 bg-background/80">In preview</Badge>}
                <p className="px-2.5 pt-2 text-[11px] text-muted-foreground line-clamp-1">{v.prompt}</p>
              </button>
              {canCreate && <div className="p-2.5 pt-1.5"><Button size="sm" variant="outline" className="w-full h-7 gap-1.5 text-[11px]" disabled={queueingId === v.id} onClick={() => onQueue(v)}>
                {queueingId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListPlus className="h-3 w-3" />} Add to queue as Draft</Button></div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
