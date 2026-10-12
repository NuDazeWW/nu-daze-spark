import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export function AccountPhotoEditor({ file, busy, onCancel, onSave }: {
  file: File | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [rendering, setRendering] = useState(false);
  const saving = busy || rendering;

  useEffect(() => {
    if (!file) { setUrl(""); return; }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const save = async () => {
    if (!area || !url) return;
    setRendering(true);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image adjustment is unavailable in this browser");
      // Draw the entire source with a translated crop, preserving transparent PNG
      // margins and permitting zoom-out padding without stretching the logo.
      const scale = 512 / area.width;
      context.drawImage(image, -area.x * scale, -area.y * scale, image.naturalWidth * scale, image.naturalHeight * scale);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Could not prepare the image"));
      }, "image/png"));
      await onSave(new File([blob], "account-photo.png", { type: "image/png" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare the image");
    } finally {
      setRendering(false);
    }
  };

  return <Dialog open={!!file} onOpenChange={(open) => { if (!open && !saving) onCancel(); }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onInteractOutside={(event) => { if (saving) event.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle>Adjust account photo or logo</DialogTitle>
        <DialogDescription>{file?.name}</DialogDescription>
      </DialogHeader>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted" aria-label="Account image adjustment">
        {url && <Cropper image={url} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
          objectFit="contain" minZoom={0.25} maxZoom={4} restrictPosition={false}
          onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setArea(pixels)}
          classes={{ cropAreaClassName: "!border-2 !border-primary !shadow-none" }} />}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm"><label id="account-image-size">Image size</label><span className="text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</span></div>
        <Slider aria-labelledby="account-image-size" value={[zoom]} min={0.25} max={4} step={0.01} disabled={saving}
          onValueChange={([value]) => { if (value !== undefined) setZoom(value); }} />
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); }}><RotateCcw />Reset</Button>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
        <Button disabled={saving || !area} onClick={save}>{saving && <Loader2 className="animate-spin" />}Save image</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}