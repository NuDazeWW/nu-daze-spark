import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SECTION_LABELS, type DraftSection, type StrategyDraft } from "@/lib/strategyDraft";

interface Props {
  draft: StrategyDraft;
  onChange: (d: StrategyDraft) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
}

/** Editable, selectable review of AI- or preset-generated strategy before it's saved. */
export function StrategyReviewList({ draft, onChange, selected, onToggle }: Props) {
  const sections = (Object.keys(SECTION_LABELS) as DraftSection[]).filter((s) => (draft[s] as unknown[]).length);
  const setItem = (s: DraftSection, i: number, value: unknown) => {
    const arr = [...(draft[s] as unknown[])];
    arr[i] = value;
    onChange({ ...draft, [s]: arr });
  };
  return (
    <div className="space-y-5">
      {draft.summary && <p className="rounded-md bg-muted p-3 text-sm">{draft.summary}</p>}
      {sections.map((s) => (
        <section key={s}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{SECTION_LABELS[s]}</h4>
          <div className="space-y-2">
            {(draft[s] as unknown[]).map((item, i) => {
              const id = `${s}:${i}`;
              const it = item as Record<string, unknown>;
              const isText = typeof item === "string";
              const title = isText ? (item as string) : String(it.rule_name ?? it.segment_name ?? it.name ?? "");
              const titleKey = s === "audiences" ? "segment_name" : s === "pillars" ? "name" : "rule_name";
              const bodyKey = s === "voice_rules" || s === "platform_rules" ? "rule_content" : "description";
              return (
                <div key={id} className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox checked={selected.has(id)} onCheckedChange={() => onToggle(id)} aria-label={`Include ${title}`} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Input value={title} onChange={(e) => setItem(s, i, isText ? e.target.value : { ...it, [titleKey]: e.target.value })} className="h-8 text-sm font-medium" />
                    {!isText && (
                      <textarea
                        value={String(it[bodyKey] ?? "")}
                        onChange={(e) => setItem(s, i, { ...it, [bodyKey]: e.target.value })}
                        rows={2}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    )}
                    {!isText && (it.platform || (it.platforms as string[] | undefined)?.length) ? (
                      <p className="font-mono text-[11px] text-muted-foreground">{String(it.platform ?? (it.platforms as string[]).join(", "))}</p>
                    ) : null}
                    {!isText && it.evidence ? <p className="text-xs italic text-muted-foreground">Based on: {String(it.evidence)}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
