import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useRef } from "react";
import { Upload, FileType, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type AssetType = Database["public"]["Enums"]["asset_type"];
type PermissionState = Database["public"]["Enums"]["permission_state"];

/** Maps file MIME prefixes / extensions to an asset_type, or null if ambiguous */
function detectAssetType(file: File): AssetType | null {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "heic", "heif", "tiff", "bmp"].includes(ext)) return "image";
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "wmv", "webm", "mkv", "m4v", "flv", "3gp", "mpg", "mpeg", "ts"].includes(ext)) return "video";
  // PDFs and documents are ambiguous — could be pdf, deck, testimonial, case_study
  return null;
}

const AMBIGUOUS_TYPES: { value: AssetType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "deck", label: "Deck / Presentation" },
  { value: "testimonial", label: "Testimonial" },
  { value: "case_study", label: "Case Study" },
];

const NON_FILE_TYPES: { value: AssetType; label: string }[] = [
  { value: "link", label: "Link" },
  { value: "text_snippet", label: "Text Snippet" },
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
};

type UploadMode = "file" | "link" | "text";

export function AssetFormDialog({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  onSubmit,
  isPending,
  showFileUpload = true,
}: AssetFormDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Determine the current mode
  const mode: UploadMode = form.asset_type === "link" ? "link" : form.asset_type === "text_snippet" ? "text" : "file";

  // Whether the file produced an ambiguous type (user needs to pick)
  const isAmbiguousFile = useMemo(() => {
    if (!form.file) return false;
    return detectAssetType(form.file) === null;
  }, [form.file]);

  // Auto-detected label for display
  const detectedLabel = useMemo(() => {
    if (!form.file) return null;
    const detected = detectAssetType(form.file);
    if (detected === "image") return "Image";
    if (detected === "video") return "Video";
    return null; // ambiguous
  }, [form.file]);

  const needsText = ["text_snippet", "testimonial", "case_study"].includes(form.asset_type);

  const isValid = useMemo(() => {
    if (!form.title.trim()) return false;
    if (mode === "file" && showFileUpload && !form.file) return false;
    if (mode === "link" && !form.external_url.trim()) return false;
    if (form.asset_type === "text_snippet" && !form.text_content.trim()) return false;
    return true;
  }, [form, mode, showFileUpload]);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push("Title");
    if (mode === "file" && showFileUpload && !form.file) missing.push("File");
    if (mode === "link" && !form.external_url.trim()) missing.push("URL");
    if (form.asset_type === "text_snippet" && !form.text_content.trim()) missing.push("Content");
    return missing;
  }, [form, mode, showFileUpload]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setForm((f) => ({ ...f, file: null }));
      return;
    }
    const detected = detectAssetType(file);
    setForm((f) => ({
      ...f,
      file,
      asset_type: detected ?? "pdf", // default ambiguous to pdf
      title: !f.title ? file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : f.title,
    }));
  };

  const handleModeSwitch = (newMode: UploadMode) => {
    if (newMode === "link") {
      setForm((f) => ({ ...f, asset_type: "link", file: null }));
    } else if (newMode === "text") {
      setForm((f) => ({ ...f, asset_type: "text_snippet", file: null }));
    } else {
      setForm((f) => ({ ...f, asset_type: "image", file: null }));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Mode selector: File / Link / Text */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">What are you adding?</Label>
            <div className="flex gap-2">
              {([
                { value: "file" as UploadMode, label: "File Upload" },
                { value: "link" as UploadMode, label: "Link / URL" },
                { value: "text" as UploadMode, label: "Text Snippet" },
              ]).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={mode === opt.value ? "default" : "outline"}
                  onClick={() => handleModeSwitch(opt.value)}
                  className="flex-1"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* File upload area */}
          {mode === "file" && showFileUpload && (
            <div>
              <Label>File <span className="text-destructive">*</span></Label>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,.pdf,.pptx,.ppt,.key,.odp,.docx,.doc,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.webp,.svg,.heic,.heif,.tiff,.bmp,.mp4,.mov,.avi,.wmv,.webm,.mkv,.m4v,.flv,.3gp,.mpg,.mpeg,.ts"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {form.file ? form.file.name : "Choose file…"}
              </Button>
              {form.file && (
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-[10px] text-muted-foreground">
                    {form.file.type || "Unknown type"} · {(form.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {detectedLabel && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      Auto-detected: {detectedLabel}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ambiguous file type selector — only when file is PDF/doc */}
          {mode === "file" && isAmbiguousFile && (
            <div>
              <Label className="flex items-center gap-1.5">
                <FileType className="h-3.5 w-3.5 text-muted-foreground" />
                What kind of document is this?
              </Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm((f) => ({ ...f, asset_type: v as AssetType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AMBIGUOUS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                We couldn't tell from the file — please choose the right type
              </p>
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
                {PERMISSION_STATES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
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
            <p className="text-xs text-muted-foreground">
              Required: {missingFields.join(", ")}
            </p>
          )}

          <Button onClick={onSubmit} disabled={!isValid || isPending} className="w-full">
            {isPending ? "Saving…" : "Save Asset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
