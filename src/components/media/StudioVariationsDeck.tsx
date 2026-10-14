import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListPlus, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type Variation = { id: string; image: string; prompt: string };

type Props = { items: Variation[]; activeId: string | null; onSelect: (id: string) => void; onQueue: (v: Variation) => void; queueingId: string | null; canCreate: boolean };

export function StudioVariationsDeck({ items, activeId, onSelect, onQueue, queueingId, canCreate }: Props) {
  return (
    <section className="sm-card rounded-2xl border border-border/60 bg-card p-4 space-y-3" aria-label="AI-generated variations">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI-Generated Variations</h2>
        <span className="font-mono text-[10px] text-muted-foreground">Latest 4 this session</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => {
          const v = items[i];
          if (!v) return <div key={i} className="rounded-xl border border-dashed border-border/50 aspect-[4/3] flex items-center justify-center text-[11px] text-muted-foreground">Variant {i + 1}</div>;
          const on = v.id === activeId;
          return (
            <div key={v.id} className={cn("rounded-xl border overflow-hidden transition-all",
              on ? "border-primary/70 shadow-[0_0_24px_-8px_hsl(var(--primary))]" : "border-border/50 hover:border-primary/40")}>
              <button type="button" onClick={() => onSelect(v.id)} className="block w-full text-left">
                <img src={v.image} alt={`Variant ${i + 1}`} className="w-full aspect-[4/3] object-cover" />
                <div className="p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5"><span className="text-xs font-semibold">Variant {i + 1}</span>{i === 0 && <Badge className="text-[9px] h-4">Latest</Badge>}{on && <Badge variant="outline" className="text-[9px] h-4">In preview</Badge>}</div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{v.prompt}</p>
                </div>
              </button>
              {canCreate && <div className="px-2.5 pb-2.5"><Button size="sm" variant="outline" className="w-full h-7 gap-1.5 text-[11px]" disabled={queueingId === v.id} onClick={() => onQueue(v)}>
                {queueingId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListPlus className="h-3 w-3" />} Add to queue as Draft</Button></div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
