import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SOURCE_TYPES = [
  { value: "google_drive", label: "Google Drive" },
  { value: "sharepoint", label: "SharePoint" },
  { value: "onedrive", label: "OneDrive" },
  { value: "webpage", label: "Webpage / URL" },
  { value: "notion", label: "Notion" },
  { value: "dropbox", label: "Dropbox" },
];

export interface SourceFormData {
  source_name: string;
  source_type: string;
  is_connected: boolean;
}

export const defaultSourceForm: SourceFormData = {
  source_name: "",
  source_type: "google_drive",
  is_connected: false,
};

interface SourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  form: SourceFormData;
  setForm: React.Dispatch<React.SetStateAction<SourceFormData>>;
  onSubmit: () => void;
  isPending: boolean;
}

export function SourceFormDialog({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  onSubmit,
  isPending,
}: SourceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Source Name</Label>
            <Input
              value={form.source_name}
              onChange={(e) => setForm((f) => ({ ...f, source_name: e.target.value }))}
              placeholder="e.g. NuDaze Marketing Drive"
            />
          </div>

          <div>
            <Label>Source Type</Label>
            <Select value={form.source_type} onValueChange={(v) => setForm((f) => ({ ...f, source_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_connected}
              onCheckedChange={(c) => setForm((f) => ({ ...f, is_connected: c }))}
            />
            <Label>Connected</Label>
          </div>

          <Button onClick={onSubmit} disabled={!form.source_name || isPending} className="w-full">
            {isPending ? "Saving…" : "Save Source"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
