import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useRef, useState, useEffect } from "react";
import { Upload, FileType, Info, X, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAccountTags } from "@/hooks/useAccountTags";
import type { Database } from "@/integrations/supabase/types";

type AssetType = Database["public"]["Enums"]["asset_type"];
type PermissionState = Database["public"]["Enums"]["permission_state"];

/** Maps file MIME prefixes / extensions to an asset_type, or null if ambiguous */
function detectAssetType(file: File): AssetType | null {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "heic", "heif", "tiff", "bmp"].includes(ext)) return "image";
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "wmv", "webm", "mkv", "m4v", "flv", "3gp", "mpg", "mpeg", "ts"].includes(ext)) return "video";
  return null;
}

const AMBIGUOUS_TYPES: { value: AssetType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "deck", label: "Deck / Presentation" },
  { value: "testimonial", label: "Testimonial" },
  { value: "case_study", label: "Case Study" },
];

const PERMISSION_STATES: { value: PermissionState; label: string }[] = [
  { value: "generation_allowed", label: "Generation Allowed" },
  { value: "summarization_only", label: "Summarization Only" },
  { value: "blocked", label: "Blocked" },
  { value: "archived", label: "Archived" },
];

export interface AssetFormData {
  title: string;
  description: string;
  asset_type: AssetType;
  permission_state: PermissionState;
  is_nudaze_origin: boolean;
  external_url: string;
  text_content: string;
  expires_at: string;
  file?: File | null;
  content_date: string;
  is_event: boolean;
  event_name: string;
  contributors: string[];
}

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  form: AssetFormData;
  setForm: React.Dispatch<React.SetStateAction<AssetFormData>>;
  onSubmit: () => void;
  isPending: boolean;
  showFileUpload?: boolean;
}

export const defaultAssetForm: AssetFormData = {
  title: "",
  description: "",
  asset_type: "image",
  permission_state: "generation_allowed",
  is_nudaze_origin: true,
  external_url: "",
  text_content: "",
  expires_at: "",
  file: null,
  content_date: "",
  is_event: false,
  event_name: "",
  contributors: [],
};

type UploadMode = "file" | "link" | "text";

export function AssetFormDialog({
  open, onOpenChange, title, form, setForm, onSubmit, isPending, showFileUpload = true,
}: AssetFormDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [contributorInput, setContributorInput] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const { tags: accountTags, defaultTags } = useAccountTags();

  // Auto-populate defaults on new asset (when form has empty contributors)
  useEffect(() => {
    if (open && form.contributors.length === 0 && defaultTags.length > 0) {
      setForm((f) => ({ ...f, contributors: defaultTags.map((t) => t.handle) }));
    }
  }, [open, defaultTags]);
  const mode: UploadMode = form.asset_type === "link" ? "link" : form.asset_type === "text_snippet" ? "text" : "file";

  const isAmbiguousFile = useMemo(() => {
    if (!form.file) return false;
    return detectAssetType(form.file) === null;
  }, [form.file]);

  const detectedLabel = useMemo(() => {
    if (!form.file) return null;
    const detected = detectAssetType(form.file);
    if (detected === "image") return "Image";
    if (detected === "video") return "Video";
    return null;
  }, [form.file]);

  const needsText = ["text_snippet", "testimonial", "case_study"].includes(form.asset_type);

  const isValid = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!form.content_date) return false;
    if (form.contributors.length === 0) return false;
    if (form.is_event && !form.event_name.trim()) return false;
    if (mode === "file" && showFileUpload && !form.file) return false;
    if (mode === "link" && !form.external_url.trim()) return false;
    if (form.asset_type === "text_snippet" && !form.text_content.trim()) return false;
    return true;
  }, [form, mode, showFileUpload]);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push("Title");
    if (!form.content_date) missing.push("Date Created/Taken");
    if (form.contributors.length === 0) missing.push("Contributors");
    if (form.is_event && !form.event_name.trim()) missing.push("Event Name");
    if (mode === "file" && showFileUpload && !form.file) missing.push("File");
    if (mode === "link" && !form.external_url.trim()) missing.push("URL");
    if (form.asset_type === "text_snippet" && !form.text_content.trim()) missing.push("Content");
    return missing;
  }, [form, mode, showFileUpload]);

  const handleFileChange = (file: File | null) => {
    if (!file) { setForm((f) => ({ ...f, file: null })); return; }
    const detected = detectAssetType(file);
    setForm((f) => ({
      ...f, file,
      asset_type: detected ?? "pdf",
      title: !f.title ? file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : f.title,
    }));
  };

  const handleModeSwitch = (newMode: UploadMode) => {
    if (newMode === "link") setForm((f) => ({ ...f, asset_type: "link", file: null }));
    else if (newMode === "text") setForm((f) => ({ ...f, asset_type: "text_snippet", file: null }));
    else setForm((f) => ({ ...f, asset_type: "image", file: null }));
    if (fileRef.current) fileRef.current.value = "";
  };

  const addContributor = () => {
    const name = contributorInput.trim();
    if (name && !form.contributors.includes(name)) {
      setForm((f) => ({ ...f, contributors: [...f.contributors, name] }));
    }
    setContributorInput("");
  };

  const removeContributor = (name: string) => {
    setForm((f) => ({ ...f, contributors: f.contributors.filter((c) => c !== name) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Mode selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">What are you adding? <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              {([
                { value: "file" as UploadMode, label: "File Upload" },
                { value: "link" as UploadMode, label: "Link / URL" },
                { value: "text" as UploadMode, label: "Text Snippet" },
              ]).map((opt) => (
                <Button key={opt.value} type="button" size="sm" variant={mode === opt.value ? "default" : "outline"} onClick={() => handleModeSwitch(opt.value)} className="flex-1">
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Is this from an event? */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_event} onCheckedChange={(c) => setForm((f) => ({ ...f, is_event: c, event_name: c ? f.event_name : "" }))} />
              <Label>Is this from an event?</Label>
            </div>
            {form.is_event && (
              <div>
                <Label>Event Name <span className="text-destructive">*</span></Label>
                <Input value={form.event_name} onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))} placeholder="e.g. NuDaze Launch Party 2025" />
              </div>
            )}
          </div>

          {/* File upload area */}
          {mode === "file" && showFileUpload && (
            <div>
              <Label>File <span className="text-destructive">*</span></Label>
              <input ref={fileRef} type="file" className="hidden"
                accept="image/*,video/*,.pdf,.pptx,.ppt,.key,.odp,.docx,.doc,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.webp,.svg,.heic,.heif,.tiff,.bmp,.mp4,.mov,.avi,.wmv,.webm,.mkv,.m4v,.flv,.3gp,.mpg,.mpeg,.ts"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {form.file ? form.file.name : "Choose file…"}
              </Button>
              {form.file && (
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-[10px] text-muted-foreground">{form.file.type || "Unknown type"} · {(form.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  {detectedLabel && <Badge variant="secondary" className="text-[10px] h-4">Auto-detected: {detectedLabel}</Badge>}
                </div>
              )}
            </div>
          )}

          {/* Ambiguous file type selector */}
          {mode === "file" && isAmbiguousFile && (
            <div>
              <Label className="flex items-center gap-1.5"><FileType className="h-3.5 w-3.5 text-muted-foreground" /> What kind of document is this?</Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm((f) => ({ ...f, asset_type: v as AssetType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AMBIGUOUS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Info className="h-3 w-3" />We couldn't tell from the file — please choose the right type</p>
            </div>
          )}

          {/* URL field for links */}
          {mode === "link" && (
            <div>
              <Label>URL <span className="text-destructive">*</span></Label>
              <Input value={form.external_url} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} placeholder="https://…" />
            </div>
          )}

          {/* Title */}
          <div>
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Asset title" />
          </div>

          {/* Date Created / Taken */}
          <div>
            <Label>Date Created or Taken <span className="text-destructive">*</span></Label>
            <Input type="date" value={form.content_date} onChange={(e) => setForm((f) => ({ ...f, content_date: e.target.value }))} />
          </div>

          {/* Contributors / Who's in it */}
          <div>
            <Label>Who's in it, wrote it, or created it? <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="flex-1 justify-start text-sm font-normal text-muted-foreground">
                    Select account tag…
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[260px]" align="start">
                  <Command>
                    <CommandInput placeholder="Search tags…" />
                    <CommandList>
                      <CommandEmpty>No tags found.</CommandEmpty>
                      <CommandGroup>
                        {accountTags.filter((t) => !form.contributors.includes(t.handle)).map((t) => (
                          <CommandItem key={t.id} value={t.handle} onSelect={() => {
                            setForm((f) => ({ ...f, contributors: [...f.contributors, t.handle] }));
                            setTagPopoverOpen(false);
                          }}>
                            <span>{t.handle}</span>
                            {t.display_name && <span className="ml-1 text-muted-foreground text-xs">({t.display_name})</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Input
                value={contributorInput}
                onChange={(e) => setContributorInput(e.target.value)}
                placeholder="Custom name…"
                className="w-32"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addContributor(); } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addContributor} disabled={!contributorInput.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.contributors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.contributors.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1 pr-1">
                    {name}
                    <button type="button" onClick={() => removeContributor(name)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description…" />
          </div>

          {/* Text content for text_snippet, testimonial, case_study */}
          {needsText && (
            <div>
              <Label>Content {form.asset_type === "text_snippet" && <span className="text-destructive">*</span>}</Label>
              <Textarea value={form.text_content} onChange={(e) => setForm((f) => ({ ...f, text_content: e.target.value }))} rows={4} placeholder="Paste text content…" />
            </div>
          )}

          <div>
            <Label>Permission State</Label>
            <Select value={form.permission_state} onValueChange={(v) => setForm((f) => ({ ...f, permission_state: v as PermissionState }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERMISSION_STATES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Expiration Date (optional)</Label>
            <Input type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_nudaze_origin} onCheckedChange={(c) => setForm((f) => ({ ...f, is_nudaze_origin: c }))} />
            <Label>NuDaze Origin</Label>
          </div>

          {!isValid && missingFields.length > 0 && (
            <p className="text-xs text-muted-foreground">Required: {missingFields.join(", ")}</p>
          )}

          <Button onClick={onSubmit} disabled={!isValid || isPending} className="w-full">
            {isPending ? "Saving…" : "Save Asset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
