import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountPhotoEditor } from "@/components/preview/AccountPhotoEditor";
import { IDENTITY_ICONS, useProfileAvatar } from "@/hooks/useProfileAvatar";

/** Lets the user choose an identity icon, upload a photo, or fall back to initials. */
export function IdentityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { stored, save, upload, initials } = useProfileAvatar();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try { await fn(); toast.success(msg); onOpenChange(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(false); }
  };

  return <>
    <Dialog open={open && !file} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your profile picture</DialogTitle>
          <DialogDescription>Pick an icon or add a photo. If you skip this, your initials are shown.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Identity icons">
          {Object.entries(IDENTITY_ICONS).map(([key, Icon]) => {
            const active = stored === `icon:${key}`;
            return <button key={key} type="button" role="radio" aria-checked={active} aria-label={key} disabled={busy}
              onClick={() => run(() => save(`icon:${key}`), "Profile icon saved")}
              className={`flex aspect-square items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted/40 text-foreground hover:bg-muted"}`}>
              <Icon className="size-5" />
            </button>;
          })}
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f) return;
          if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) return toast.error("Please choose a PNG, JPEG or WebP image");
          setFile(f);
        }} />
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" disabled={busy || !stored} onClick={() => run(() => save(null), `Showing ${initials}`)}>Use initials</Button>
          <Button variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}Add photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AccountPhotoEditor file={file} busy={busy} onCancel={() => setFile(null)}
      onSave={async (f) => { await run(() => upload(f), "Profile photo saved"); setFile(null); }} />
  </>;
}
