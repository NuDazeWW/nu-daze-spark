import { useState } from "react";
import { Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authorContextLines, readAuthorContext, safeAuthorProfile, type AuthorContext } from "@/lib/authorContext";

export function AuthorContextFields({ value, onChange, platform }: { value: AuthorContext; onChange: (value: AuthorContext) => void; platform: string }) {
  const fields: { key: keyof AuthorContext; label: string; max: number }[] = [
    { key: "title", label: "Job title", max: 200 },
    { key: "employer", label: platform === "linkedin" ? "Employer" : "Associated organization", max: 200 },
    { key: "handle", label: "@Handle", max: 100 },
    ...(platform !== "linkedin" ? [{ key: "category" as const, label: "Account category", max: 200 }] : []),
    { key: "bio", label: platform === "linkedin" ? "Public headline / bio" : "Public bio", max: 1000 },
    { key: "profile_url", label: "Profile URL", max: 1000 },
  ];
  const invalidUrl = Boolean(value.profile_url?.trim() && !safeAuthorProfile(value.profile_url.trim(), platform));
  return <div className="space-y-3">{fields.map(({ key, label, max }) => <div key={key}>
    <Label htmlFor={`author-${key}`}>{label}</Label>
    <Input id={`author-${key}`} value={value[key] || ""} maxLength={max} onChange={e => onChange({ ...value, [key]: e.target.value })} />
  </div>)}{invalidUrl && <p className="text-sm text-destructive" role="alert">Enter an HTTPS {platform === "linkedin" ? "LinkedIn person or company" : "Instagram account"} profile URL, not a post URL.</p>}</div>;
}

export function AuthorDetails({ name, context: raw, platform, onSave, isPending }: { name: string | null; context: unknown; platform: string; onSave: (context: AuthorContext) => Promise<unknown>; isPending: boolean }) {
  const context = readAuthorContext(raw);
  const lines = authorContextLines(context, platform);
  const profile = safeAuthorProfile(context.profile_url, platform);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AuthorContext>({});
  const [error, setError] = useState("");
  const invalidUrl = Boolean(draft.profile_url?.trim() && !safeAuthorProfile(draft.profile_url.trim(), platform));
  return <div className="space-y-1" onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium break-words min-w-0">{name || "Author not provided"}</p>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Edit author details for ${name || "this post"}`} onClick={() => { setDraft(context); setError(""); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit author details</TooltipContent></Tooltip>
    </div>
    {lines.map((line, i) => <p key={i} className="text-xs text-muted-foreground break-words">{line}</p>)}
    {((platform === "linkedin" && !context.title && !context.employer) || (platform !== "linkedin" && !lines.length)) && <p className="text-xs text-muted-foreground">{platform === "linkedin" ? "Workplace details unavailable" : "Profile details unavailable"}</p>}
    {profile && <Button asChild variant="link" size="sm" className="px-0"><a href={profile} target="_blank" rel="noopener noreferrer">Open profile <ExternalLink className="ml-1 h-3 w-3" /></a></Button>}
    {lines.length > 0 && context.provenance && <p className="text-xs text-muted-foreground">{context.provenance === "manual" ? "Team-provided details" : "Details from original source"}</p>}
    {context.provenance === "source" && context.evidence && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Source evidence</summary><p className="mt-1 break-words">{context.evidence}</p></details>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Author details — {name || "this post"}</DialogTitle></DialogHeader>
      <AuthorContextFields value={draft} onChange={setDraft} platform={platform} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={isPending || invalidUrl} onClick={async () => { try { const clean = readAuthorContext(draft); delete clean.evidence; await onSave({ ...clean, provenance: "manual" }); setOpen(false); } catch { setError("Could not save author details. Please try again."); } }}>{isPending ? "Saving…" : "Save author details"}</Button>
    </DialogContent></Dialog>
  </div>;
}