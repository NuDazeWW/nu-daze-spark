import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AssetType = Database["public"]["Enums"]["asset_type"];
type PermissionState = Database["public"]["Enums"]["permission_state"];

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "link", label: "Link" },
  { value: "text_snippet", label: "Text Snippet" },
  { value: "deck", label: "Deck" },
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
  const needsFile = ["image", "video", "pdf", "deck", "case_study", "testimonial"].includes(form.asset_type);
  const needsUrl = form.asset_type === "link";
  const needsText = ["text_snippet", "testimonial", "case_study"].includes(form.asset_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Asset title" />
          </div>

          <div>
            <Label>Type</Label>
            <Select value={form.asset_type} onValueChange={(v) => setForm((f) => ({ ...f, asset_type: v as AssetType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description…" />
          </div>

          {needsFile && showFileUpload && (
            <div>
              <Label>File</Label>
              <input
                key={form.asset_type}
                ref={fileRef}
                type="file"
                className="hidden"
                accept={
                  form.asset_type === "image" ? "image/*,.jpg,.jpeg,.png,.gif,.webp,.svg,.heic,.heif,.tiff,.bmp" :
                  form.asset_type === "video" ? "video/*,.mp4,.mov,.avi,.wmv,.webm,.mkv,.m4v,.flv,.3gp,.mpg,.mpeg,.ts" :
                  form.asset_type === "pdf" ? ".pdf,application/pdf" :
                  form.asset_type === "deck" ? ".pptx,.ppt,.key,.pdf,.odp,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" :
                  form.asset_type === "case_study" ? ".pdf,.docx,.doc,.txt,.rtf,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
                  form.asset_type === "testimonial" ? ".pdf,.docx,.doc,.txt,.rtf,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
                  "*"
                }
                onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
              />
              <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {form.file ? form.file.name : "Choose file…"}
              </Button>
            </div>
          )}

          {needsUrl && (
            <div>
              <Label>URL</Label>
              <Input value={form.external_url} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} placeholder="https://…" />
            </div>
          )}

          {needsText && (
            <div>
              <Label>Content</Label>
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

          <Button onClick={onSubmit} disabled={!form.title || isPending} className="w-full">
            {isPending ? "Saving…" : "Save Asset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
