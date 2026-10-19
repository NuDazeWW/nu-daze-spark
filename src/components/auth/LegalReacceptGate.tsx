import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LEGAL_DOCS, LEGAL_VERSION, LegalText, type LegalDocKey } from "@/pages/Legal";

const KEYS = Object.keys(LEGAL_DOCS) as LegalDocKey[];

export async function recordAcceptance(userId: string, docs: LegalDocKey[], marketing = { email: false, sms: false }) {
  const ua = navigator.userAgent.slice(0, 500);
  await supabase.from("legal_acceptances").insert(docs.map((d) => ({
    user_id: userId, doc: d, version: LEGAL_DOCS[d].version, user_agent: ua, marketing_email: marketing.email, marketing_sms: marketing.sms,
  })));
}

/** One scrolling box with all four documents; checkbox enabled only after scrolling to the end. */
export function LegalScrollBox({ checked, onChecked }: { checked: boolean; onChecked: (v: boolean) => void }) {
  const [reachedEnd, setReachedEnd] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReachedEnd(true);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 text-xs">
        {KEYS.map((k) => <Link key={k} to={LEGAL_DOCS[k].path} target="_blank" className="sm-auth-link underline">{LEGAL_DOCS[k].title}</Link>)}
      </div>
      <div ref={ref} onScroll={onScroll} tabIndex={0} aria-label="Legal documents" className="max-h-48 overflow-y-auto rounded-md border bg-card p-3 text-card-foreground">
        {KEYS.map((k) => (
          <section key={k} className="mb-4">
            <h3 className="text-sm font-semibold">{LEGAL_DOCS[k].title} <span className="font-mono text-[10px] font-normal text-muted-foreground">v{LEGAL_DOCS[k].version} · Draft — pending legal review</span></h3>
            <LegalText text={LEGAL_DOCS[k].text} />
          </section>
        ))}
        <p className="text-xs text-muted-foreground">End of documents.</p>
      </div>
      <label className="flex items-start gap-2 text-xs leading-snug">
        <Checkbox className="mt-0.5" disabled={!reachedEnd} checked={checked} onCheckedChange={(c) => onChecked(!!c)} />
        <span>{reachedEnd ? "I have read and agree to the Terms of Service, Privacy Policy, Acceptable Use Policy and Cookie Notice." : "Scroll to the end of the documents to agree."}</span>
      </label>
    </div>
  );
}

export function LegalReacceptGate() {
  const { user } = useAuth();
  const [missing, setMissing] = useState<LegalDocKey[]>([]);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (!user) { setMissing([]); return; }
    let ignore = false;
    (async () => {
      const { data, error } = await supabase.from("legal_acceptances").select("doc, version").eq("user_id", user.id);
      if (ignore || error) return;
      const have = new Set((data ?? []).map((r) => `${r.doc}@${r.version}`));
      const need = KEYS.filter((k) => !have.has(`${k}@${LEGAL_DOCS[k].version}`));
      if (!need.length) return;
      // Accepted at sign-up (before email confirmation): record it now.
      const meta = user.user_metadata as { terms_version?: string; marketing_email?: boolean; marketing_sms?: boolean };
      if (meta?.terms_version === LEGAL_VERSION) {
        await recordAcceptance(user.id, need, { email: !!meta.marketing_email, sms: !!meta.marketing_sms });
        return;
      }
      setMissing(need);
    })();
    return () => { ignore = true; };
  }, [user?.id]);

  if (!user || !missing.length) return null;
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Our terms have changed</DialogTitle>
          <DialogDescription>Please review and accept the updated documents to keep using SocialMotive. Your earlier acceptance stays on record.</DialogDescription>
        </DialogHeader>
        <LegalScrollBox checked={agree} onChecked={setAgree} />
        <Button disabled={!agree} onClick={async () => { await recordAcceptance(user.id, missing); setMissing([]); }}>Accept and continue</Button>
      </DialogContent>
    </Dialog>
  );
}
