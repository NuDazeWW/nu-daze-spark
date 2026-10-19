import { useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, FileText, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { allItemIds, applyStrategyDraft, readDocumentText, type StrategyDraft } from "@/lib/strategyDraft";
import { STRATEGY_PRESETS } from "@/lib/strategyPresets";
import { StrategyReviewList } from "./StrategyReviewList";

export type BuilderMode = "website" | "document" | "preset";

const TONES = [
  { key: "formal", left: "Casual", right: "Formal" },
  { key: "playful", left: "Serious", right: "Playful" },
  { key: "bold", left: "Understated", right: "Bold" },
  { key: "technical", left: "Simple", right: "Technical" },
];

const META: Record<BuilderMode, { title: string; desc: string; icon: typeof Sparkles }> = {
  website: { title: "Generate brand voice", desc: "No brand guide? We'll read your website, social pages, and any marketing copy you paste, then draft your voice and strategy for you to review.", icon: Sparkles },
  document: { title: "Import brand guide", desc: "Import a brand or style guide (PDF, Word, or text). We'll pull out the voice, rules, audiences, and more for you to review.", icon: FileText },
  preset: { title: "Industry starter kits", desc: "Start from a proven foundation for your industry, then edit anything.", icon: LayoutTemplate },
};

export function StrategyBuilderDialog({ mode, open, onOpenChange }: { mode: BuilderMode; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const { activeClientId, activeClient } = useActiveClient() as { activeClientId: string | null; activeClient?: { name: string } | null };
  const qc = useQueryClient();
  const [urls, setUrls] = useState("");
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<Record<string, number>>({ formal: 50, playful: 50, bold: 50, technical: 50 });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<StrategyDraft | null>(null);
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<{ label: string; ok: boolean }[]>([]);
  const M = META[mode];

  const reset = () => { setDraft(null); setSelected(new Set()); setSources([]); setFile(null); };
  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o); };
  const load = (d: StrategyDraft, l: string) => { setDraft(d); setLabel(l); setSelected(new Set(allItemIds(d))); };

  const generate = async () => {
    setBusy(true);
    try {
      let body: Record<string, unknown>;
      if (mode === "website") {
        const list = urls.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean).map((u) => (/^https?:\/\//.test(u) ? u : `https://${u}`));
        if (!list.length && notes.trim().length < 200) throw new Error("Add at least one link, or paste some marketing copy.");
        body = { mode, urls: list.slice(0, 8), notes, tone, company_name: activeClient?.name };
      } else {
        if (!file) throw new Error("Choose a file first.");
        if (file.size > 20 * 1024 * 1024) throw new Error("File must be under 20 MB.");
        const text = (await readDocumentText(file)).trim();
        if (text.length < 100) throw new Error("We couldn't read text from this file. If it's a scanned PDF, try a Word or text version.");
        body = { mode, document_text: text.slice(0, 120000), document_name: file.name, company_name: activeClient?.name };
      }
      const { data, error } = await supabase.functions.invoke("brand-strategy-extract", { body });
      if (error) {
        const t = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        if (t?.sources) setSources(t.sources);
        throw new Error(t?.error ?? error.message);
      }
      setSources(data.sources ?? []);
      load(data.result, mode === "website" ? "AI from website" : `Imported: ${file?.name ?? "document"}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const apply = async () => {
    if (!draft || !user || !activeClientId) return;
    setBusy(true);
    try {
      const n = await applyStrategyDraft(draft, selected, activeClientId, user.id, label);
      ["brand_voice_rules", "audience_definitions", "campaign_rules", "platform_rules", "cta_banks", "hashtag_banks"].forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
      toast.success(`Added ${n} items to Strategy & Rules`);
      close(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm-strategy-builder max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><M.icon className="h-5 w-5 text-primary" />{M.title}</DialogTitle>
          <DialogDescription>{draft ? "Review, edit, and untick anything you don't want. Nothing is saved until you click Add to strategy." : M.desc}</DialogDescription>
        </DialogHeader>

        {!draft && mode === "website" && (
          <div className="space-y-4">
            <div><Label>Website and social page links</Label>
              <Textarea rows={3} value={urls} onChange={(e) => setUrls(e.target.value)} placeholder={"https://yourcompany.com\nhttps://linkedin.com/company/yourcompany"} />
              <p className="mt-1 text-xs text-muted-foreground">One per line, up to 8. Some social sites block reading — paste a few recent captions below for best results.</p>
            </div>
            <div><Label>Marketing copy (optional)</Label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste About text, recent posts, email copy, taglines…" /></div>
            <div className="space-y-3"><Label>Desired tone (optional)</Label>
              {TONES.map((t) => (
                <div key={t.key} className="grid grid-cols-[90px_1fr_90px] items-center gap-3 text-xs">
                  <span className="text-right text-muted-foreground">{t.left}</span>
                  <Slider value={[tone[t.key]]} min={0} max={100} step={5} onValueChange={([v]) => setTone((x) => ({ ...x, [t.key]: v }))} aria-label={`${t.left} to ${t.right}`} />
                  <span className="text-muted-foreground">{t.right}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!draft && mode === "document" && (
          <div className="space-y-2">
            <Label htmlFor="brand-doc">Brand or style guide</Label>
            <Input id="brand-doc" type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">PDF, Word (.docx), or text — up to 20 MB. Older .doc files: save as .docx first.</p>
          </div>
        )}

        {!draft && mode === "preset" && (
          <div className="sm-starter-kit-grid grid gap-4 sm:grid-cols-2">
            {STRATEGY_PRESETS.map((p) => (
              <Button key={p.key} variant="ghost" onClick={() => load(structuredClone(p.draft), p.name)} className="sm-starter-kit" data-kit={p.key}>
                <span className="sm-starter-kit-title">{p.name}</span>
                <span className="sm-starter-kit-description">{p.description}</span>
              </Button>
            ))}
          </div>
        )}

        {sources.length > 0 && (
          <p className="text-xs text-muted-foreground">Read: {sources.map((s) => `${s.label} ${s.ok ? "✓" : "(couldn't read)"}`).join(" · ")}</p>
        )}

        {draft && <StrategyReviewList draft={draft} onChange={setDraft} selected={selected} onToggle={(id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })} />}

        <DialogFooter>
          {draft ? (<>
            <Button variant="ghost" onClick={reset} disabled={busy}>Back</Button>
            <Button onClick={apply} disabled={busy || !selected.size}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add {selected.size} to strategy</Button>
          </>) : mode !== "preset" && (
            <Button onClick={generate} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Reading and drafting…" : mode === "website" ? "Generate" : "Extract"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
