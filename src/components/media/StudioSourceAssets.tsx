import { useRef, useState } from "react";
import { useAssets } from "@/hooks/useAssets";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Plus, UploadCloud, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = { selected: string[]; onToggle: (id: string, title: string) => void; canCreate: boolean };

export function StudioSourceAssets({ selected, onToggle, canCreate }: Props) {
  const { assets, isLoading, uploadFile, insert } = useAssets();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const usable = assets.filter((a) => a.permission_state === "generation_allowed");

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !canCreate) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const type = file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "pdf";
        const path = await uploadFile(file);
        await insert({ title: file.name, asset_type: type as never, file_path: path, permission_state: "generation_allowed" as never });
      }
    } finally { setUploading(false); }
  };

  return (
    <section className="sm-studio-panel p-3.5 flex flex-col gap-3 min-h-0" aria-label="Source assets">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">Source Assets</h2>
        {canCreate && <Button size="sm" variant="outline" className="sm-btn-cyan h-7 px-2.5 text-xs gap-1" onClick={() => inputRef.current?.click()}>Add assets <Plus className="h-3 w-3" /></Button>}
      </div>
      <p className="text-xs text-muted-foreground -mt-1.5">Use brand assets, product shots, or campaign materials to guide generation.</p>
      <div className="flex items-center justify-between text-[11px]">
        <Link to="/assets" className="flex items-center gap-1 text-primary hover:underline"><FolderOpen className="h-3 w-3" /> Open Asset Library</Link>
        <Badge variant="outline" className="font-mono text-[10px]">{selected.length} selected</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1">
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          : usable.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No cleared assets yet.</p>
          : usable.map((a) => {
            const on = selected.includes(a.id);
            return (
              <button key={a.id} type="button" onClick={() => onToggle(a.id, a.title)}
                aria-pressed={on} className={cn("sm-asset-row w-full flex items-center gap-3 rounded-xl p-2 text-left", on && "is-active")}>
                <div className="w-14 shrink-0 [&>div]:h-12"><AssetThumbnail filePath={a.file_path} assetType={a.asset_type} title={a.title} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{a.title}</p>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{a.asset_type.replace("_", " ")}</p>
                </div>
                {on && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
      </div>
      {canCreate && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }} className={cn("cursor-pointer rounded-xl border border-dashed p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            drag ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50")}>
          {uploading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /> : <UploadCloud className="mx-auto h-5 w-5 text-primary" />}
          <p className="mt-1 text-xs font-medium flex items-center justify-center gap-1"><Plus className="h-3 w-3" /> Add more assets</p>
          <p className="text-[10px] text-muted-foreground">Drag and drop or browse</p>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
      )}
    </section>
  );
}
