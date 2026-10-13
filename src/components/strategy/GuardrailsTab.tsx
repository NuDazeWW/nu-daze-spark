import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { BASELINE_GUARDRAILS, GUARDRAIL_TIERS, type GuardrailTier } from "@/lib/guardrails";

type Settings = { enabled_tiers: Record<GuardrailTier, boolean>; custom_terms: Record<GuardrailTier, string[]>; disabled_terms: string[] };
const EMPTY: Settings = { enabled_tiers: { profanity: true, risky_claims: true, cliches: true }, custom_terms: { profanity: [], risky_claims: [], cliches: [] }, disabled_terms: [] };

export function GuardrailsTab() {
  const { user, isAdmin } = useAuth();
  const { activeClientId } = useActiveClient();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["guardrail_settings", activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("guardrail_settings").select("*").eq("client_id", activeClientId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [s, setS] = useState<Settings>(EMPTY);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");
  useEffect(() => {
    setS({
      enabled_tiers: { ...EMPTY.enabled_tiers, ...((data?.enabled_tiers as object) ?? {}) },
      custom_terms: { ...EMPTY.custom_terms, ...((data?.custom_terms as object) ?? {}) },
      disabled_terms: data?.disabled_terms ?? [],
    });
  }, [data]);

  const save = async (next: Settings) => {
    setS(next);
    if (!activeClientId) return;
    const { error } = await supabase.from("guardrail_settings").upsert(
      { client_id: activeClientId, ...next, updated_by: user?.id }, { onConflict: "client_id" });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["guardrail_settings"] });
  };
  const disabled = useMemo(() => new Set(s.disabled_terms.map((t) => t.toLowerCase())), [s.disabled_terms]);
  const f = filter.toLowerCase();

  if (isLoading) return <p className="py-8 text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">Built-in word lists that Preflight checks on every draft. Turn a whole list off, remove individual words, or add your own. Your existing banned phrases in Brand Voice still apply too.</p>
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search words…" className="w-56" />
      </div>
      {GUARDRAIL_TIERS.map((tier) => {
        const on = s.enabled_tiers[tier.key];
        const base = BASELINE_GUARDRAILS[tier.key].filter((t) => !f || t.term.includes(f));
        const custom = s.custom_terms[tier.key].filter((t) => !f || t.toLowerCase().includes(f));
        const activeCount = BASELINE_GUARDRAILS[tier.key].filter((t) => !disabled.has(t.term)).length + s.custom_terms[tier.key].length;
        const addTerm = () => {
          const v = (drafts[tier.key] ?? "").trim().toLowerCase();
          if (!v) return;
          setDrafts((d) => ({ ...d, [tier.key]: "" }));
          if (s.custom_terms[tier.key].includes(v)) return;
          save({ ...s, custom_terms: { ...s.custom_terms, [tier.key]: [...s.custom_terms[tier.key], v] } });
        };
        return (
          <Card key={tier.key} className={on ? "" : "opacity-60"}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4 text-primary" />{tier.label}
                  <Badge variant={tier.severity === "blocking" ? "destructive" : "secondary"} className="text-[10px]">{tier.severity === "blocking" ? "Blocks approval" : "Warning"}</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">{activeCount} active</Badge>
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              </div>
              <Switch checked={on} disabled={!isAdmin} aria-label={`Turn ${tier.label} on or off`}
                onCheckedChange={(v) => save({ ...s, enabled_tiers: { ...s.enabled_tiers, [tier.key]: v } })} />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {base.map((t) => {
                  const off = disabled.has(t.term);
                  return (
                    <span key={t.term} title={t.replacement ? `Suggest: ${t.replacement}` : undefined}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${off ? "text-muted-foreground line-through" : ""}`}>
                      {t.term}
                      {isAdmin && (
                        <button aria-label={off ? `Restore ${t.term}` : `Remove ${t.term}`} className="opacity-60 hover:opacity-100"
                          onClick={() => save({ ...s, disabled_terms: off ? s.disabled_terms.filter((x) => x !== t.term) : [...s.disabled_terms, t.term] })}>
                          {off ? <RotateCcw className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </button>
                      )}
                    </span>
                  );
                })}
                {custom.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs">
                    {t}
                    {isAdmin && <button aria-label={`Delete ${t}`} className="opacity-60 hover:opacity-100"
                      onClick={() => save({ ...s, custom_terms: { ...s.custom_terms, [tier.key]: s.custom_terms[tier.key].filter((x) => x !== t) } })}><X className="h-3 w-3" /></button>}
                  </span>
                ))}
              </div>
              {isAdmin && (
                <div className="flex max-w-md gap-2">
                  <Input value={drafts[tier.key] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [tier.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addTerm()} placeholder="Add your own word or phrase" className="h-8" />
                  <Button size="sm" variant="outline" onClick={addTerm}><Plus className="mr-1 h-3 w-3" />Add</Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {!isAdmin && <p className="text-xs text-muted-foreground">Only admins can change guardrails.</p>}
    </div>
  );
}
