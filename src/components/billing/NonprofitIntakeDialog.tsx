import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EIN = /^\d{2}-?\d{7}$/;
const CRA = /^\d{9}RR\d{4}$/i;
type Check = { result: string; route: string; matched_name?: string; citation?: string; source_url?: string } | null;

export const PROPUBLICA_ATTRIBUTION = "Source: ProPublica Nonprofit Explorer, using IRS Form 990 and Exempt Organization data";

export function SourceAttribution({ check }: { check: Check }) {
  if (!check || !check.source_url) return null;
  return (
    <p className="text-[11px] text-muted-foreground">
      {PROPUBLICA_ATTRIBUTION}.{" "}
      <a href={check.source_url} target="_blank" rel="noreferrer" className="underline">View on ProPublica</a>
      {check.citation && <span className="mt-1 block whitespace-pre-line font-mono">{check.citation}</span>}
    </p>
  );
}

export function routeLabel(route?: string | null) {
  switch (route) {
    case "document_review": return "Verified against IRS records — document review";
    case "manual_cra": return "Manual review — CRA documents";
    case "manual_international": return "Manual review — international documents";
    case "manual_irs": return "Manual review — not confirmed in IRS records";
    default: return "Pending review";
  }
}

export function NonprofitIntakeDialog({ open, onOpenChange, intendedTier, onSubmitted }: {
  open: boolean; onOpenChange: (o: boolean) => void; intendedTier?: string; onSubmitted?: () => void;
}) {
  const { user } = useAuth();
  const [f, setF] = useState({ country: "US", legal_name: "", ein: "", cra_number: "", address: "", state: "", contact_name: "", contact_email: user?.email ?? "" });
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [check, setCheck] = useState<Check>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const us = f.country === "US";

  // Live IRS check for US applicants only, once the EIN looks complete.
  useEffect(() => {
    if (!us) { setCheck({ result: "skipped_non_us", route: f.country === "CA" ? "manual_cra" : "manual_international" }); return; }
    setCheck(null);
    if (!EIN.test(f.ein.trim())) return;
    const t = setTimeout(async () => {
      setChecking(true);
      const { data, error } = await supabase.functions.invoke("verify-nonprofit", { body: { ein: f.ein.trim(), country: "US", legal_name: f.legal_name.trim() || undefined, state: f.state.trim() || undefined } });
      setCheck(error ? { result: "error", route: "manual_irs" } : data);
      setChecking(false);
    }, 500);
    return () => clearTimeout(t);
  }, [us, f.country, f.ein, f.legal_name, f.state]);

  const submit = async () => {
    if (!user) return;
    if (f.legal_name.trim().length < 2 || !f.contact_name.trim()) return toast.error("Fill in the organization and contact names");
    if (us && !EIN.test(f.ein.trim())) return toast.error("EIN must look like 12-3456789");
    if (f.country === "CA" && !CRA.test(f.cra_number.trim())) return toast.error("CRA number must look like 123456789RR0001");
    if (!/^\S+@\S+\.\S+$/.test(f.contact_email)) return toast.error("Enter a valid contact email");
    if (!f.address.trim()) return toast.error("Enter the organization's address");
    if (files.length === 0) return toast.error(us ? "Attach your IRS determination letter and EIN letter" : f.country === "CA" ? "Attach your latest T3010" : "Attach your registration documents");
    for (const file of files) {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return toast.error(`${file.name}: must be a PDF, JPG or PNG`);
      if (file.size > 10 * 1024 * 1024) return toast.error(`${file.name}: must be under 10 MB`);
    }
    if (!consent) return toast.error("Please agree to us storing your documents");
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from("nonprofit-letters").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        paths.push(path);
      }
      const { error } = await supabase.from("nonprofit_applications").insert({
        legal_name: f.legal_name.trim(), ein: us ? f.ein.trim() : (f.cra_number.trim() || "n/a"), contact_name: f.contact_name.trim(), contact_email: f.contact_email.trim(),
        letter_path: paths[0], document_paths: paths, intended_tier: intendedTier ?? null, submitted_by: user.id,
        country: f.country, cra_number: f.country === "CA" ? f.cra_number.trim().toUpperCase() : null, address: f.address.trim(),
        consent_at: new Date().toISOString(), review_route: check?.route ?? "manual_irs", corroboration: check, matched_name: check?.matched_name ?? null,
      });
      if (error) throw error;
      toast.success("Submitted. Verification is pending, and standard pricing applies until it's approved.");
      onSubmitted?.(); onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for non-profit pricing</DialogTitle>
          <DialogDescription>For US 501(c)(3) organizations and Canadian registered charities, on annual billing. Non-profit pricing starts at Team Flow, and applies only after we approve your application.</DialogDescription>
        </DialogHeader>
        {!user ? (
          <p className="text-sm">Please <Link to="/auth" className="font-medium text-primary underline">sign in or create an account</Link> to add your documents securely.</p>
        ) : (
          <div className="space-y-3">
            <div><Label>Country</Label>
              <Select value={f.country} onValueChange={(v) => setF({ ...f, country: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="US">United States</SelectItem><SelectItem value="CA">Canada</SelectItem><SelectItem value="OT">Another country</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Legal organization name{us ? " (exactly as on your IRS letter)" : ""}</Label><Input value={f.legal_name} onChange={set("legal_name")} maxLength={200} /></div>
            {us && <div className="grid grid-cols-[1fr_6rem] gap-2">
              <div><Label>EIN</Label><Input value={f.ein} onChange={set("ein")} placeholder="12-3456789" maxLength={10} /></div>
              <div><Label>State</Label><Input value={f.state} onChange={set("state")} placeholder="NY" maxLength={2} /></div>
            </div>}
            {f.country === "CA" && <div><Label>CRA registration number</Label><Input value={f.cra_number} onChange={set("cra_number")} placeholder="123456789RR0001" maxLength={15} /></div>}
            <div><Label>Address</Label><Input value={f.address} onChange={set("address")} maxLength={300} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Contact name</Label><Input value={f.contact_name} onChange={set("contact_name")} maxLength={120} /></div>
              <div><Label>Contact email</Label><Input type="email" value={f.contact_email} onChange={set("contact_email")} maxLength={200} /></div>
            </div>
            <div className="rounded-md border p-3 text-xs" aria-live="polite">
              {checking ? <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Checking IRS records…</span>
                : check?.result === "match" ? <span className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" />Verified against IRS records{check.matched_name ? ` — ${check.matched_name}` : ""}. Next: document review.</span>
                : check ? <span>{routeLabel(check.route)}. You can still apply — a person will review your documents.</span>
                : <span className="text-muted-foreground">Enter your EIN to check IRS records.</span>}
              <div className="mt-2"><SourceAttribution check={check} /></div>
            </div>
            <div>
              <Label>Documents (PDF, JPG or PNG)</Label>
              <ul className="mb-2 mt-1 list-disc pl-4 text-xs text-muted-foreground">
                {us ? <>
                  <li>Required: IRS determination letter and EIN letter (CP 575 or 147c)</li>
                  <li>Supporting: latest Form 990, 990-EZ or 990-N</li>
                  <li>Optional: state charity registration or certificate of good standing</li>
                </> : f.country === "CA" ? <li>Required: latest T3010 return</li> : <li>Required: your country's charity registration documents</li>}
              </ul>
              <Input type="file" multiple accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </div>
            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>I agree to SocialMotive storing these documents privately so admins can review them. They're kept while we subscribe, plus 1 year. The decision record is kept for 7 years.</span>
            </label>
            <p className="text-xs text-muted-foreground">The non-profit program is annual only. Verification is checked again every year.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {user && <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for verification</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
