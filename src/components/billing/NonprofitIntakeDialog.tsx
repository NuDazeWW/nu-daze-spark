import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const EIN = /^\d{2}-?\d{7}$/;

export function NonprofitIntakeDialog({ open, onOpenChange, intendedTier, onSubmitted }: {
  open: boolean; onOpenChange: (o: boolean) => void; intendedTier?: string; onSubmitted?: () => void;
}) {
  const { user } = useAuth();
  const [f, setF] = useState({ legal_name: "", ein: "", contact_name: "", contact_email: user?.email ?? "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!user) return;
    if (f.legal_name.trim().length < 2 || !f.contact_name.trim()) return toast.error("Fill in the organization and contact names");
    if (!EIN.test(f.ein.trim())) return toast.error("EIN must look like 12-3456789");
    if (!/^\S+@\S+\.\S+$/.test(f.contact_email)) return toast.error("Enter a valid contact email");
    if (!file) return toast.error("Attach your IRS determination letter");
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return toast.error("Letter must be a PDF, JPG or PNG");
    if (file.size > 10 * 1024 * 1024) return toast.error("Letter must be under 10 MB");
    setBusy(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("nonprofit-letters").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("nonprofit_applications").insert({
        legal_name: f.legal_name.trim(), ein: f.ein.trim(), contact_name: f.contact_name.trim(), contact_email: f.contact_email.trim(),
        letter_path: path, intended_tier: intendedTier ?? null, submitted_by: user.id,
      });
      if (error) throw error;
      toast.success("Submitted — verification pending. Standard pricing applies until approved.");
      onSubmitted?.(); onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Verify your 501(c)(3) status</DialogTitle>
          <DialogDescription>Verified non-profits get 40% off annual plans and 25% off implementation. We check every application against the IRS Tax Exempt Organization Search.</DialogDescription>
        </DialogHeader>
        {!user ? (
          <p className="text-sm">Please <Link to="/auth" className="font-medium text-primary underline">sign in or create an account</Link> to upload your determination letter securely.</p>
        ) : (
          <div className="space-y-3">
            <div><Label>Legal organization name</Label><Input value={f.legal_name} onChange={set("legal_name")} maxLength={200} /></div>
            <div><Label>EIN</Label><Input value={f.ein} onChange={set("ein")} placeholder="12-3456789" maxLength={10} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Contact name</Label><Input value={f.contact_name} onChange={set("contact_name")} maxLength={120} /></div>
              <div><Label>Contact email</Label><Input type="email" value={f.contact_email} onChange={set("contact_email")} maxLength={200} /></div>
            </div>
            <div><Label>IRS determination letter (PDF, JPG or PNG)</Label><Input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
            <p className="text-xs text-muted-foreground">The non-profit program is annual only. Your letter is stored privately and seen only by workspace admins.</p>
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
