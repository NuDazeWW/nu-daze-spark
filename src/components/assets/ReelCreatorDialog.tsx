import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useState, useRef, useCallback } from "react";
import { Upload, X, ImageIcon, Film, Download, RotateCcw, Save, Sparkles, Loader2 } from "lucide-react";
import { useReelCreator, DEFAULT_REEL_CONFIG, type ReelConfig } from "@/hooks/useReelCreator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ReelCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReelCreatorDialog({ open, onOpenChange }: ReelCreatorDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [config, setConfig] = useState<ReelConfig>(DEFAULT_REEL_CONFIG);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createReel, isCreating, progress, resultUrl, cancel, clearResult } = useReelCreator();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...arr]);
  }, []);

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleCreate = async () => {
    if (files.length < 2) return;
    await createReel(files, config);
  };

  const handleReset = () => {
    clearResult();
    setFiles([]);
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `nudaze-reel-${Date.now()}.webm`;
    a.click();
  };

  const totalDuration = files.length * config.slideDuration;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isCreating) onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Create Video Reel from Images
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Upload 2+ images to stitch them into a 9:16 video reel with Ken Burns effect and crossfade transitions.
        </p>

        {/* Result view */}
        {resultUrl ? (
          <div className="space-y-4">
            <video
              src={resultUrl}
              controls
              className="w-full rounded-lg border max-h-[40vh] mx-auto"
              style={{ aspectRatio: "9/16", objectFit: "contain" }}
            />
            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download Reel
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                New Reel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
              />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Drop images here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse (2+ images required)</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{files.length} image{files.length !== 1 ? "s" : ""}</span>
                  <Badge variant="outline" className="text-[10px]">
                    ~{totalDuration}s video
                  </Badge>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-md border p-2">
                  {files.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeFile(i)} disabled={isCreating}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            {files.length >= 2 && !isCreating && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Duration per slide</Label>
                    <span className="text-xs text-muted-foreground">{config.slideDuration}s</span>
                  </div>
                  <Slider
                    value={[config.slideDuration]}
                    onValueChange={([v]) => setConfig((c) => ({ ...c, slideDuration: v }))}
                    min={1}
                    max={8}
                    step={0.5}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Ken Burns effect (subtle zoom & pan)</Label>
                  <Switch
                    checked={config.kenBurns}
                    onCheckedChange={(v) => setConfig((c) => ({ ...c, kenBurns: v }))}
                  />
                </div>
              </div>
            )}

            {/* Progress */}
            {isCreating && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress.stage}</span>
                  <span>{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} />
                <Button variant="outline" size="sm" onClick={cancel} className="w-full">Cancel</Button>
              </div>
            )}

            {!isCreating && (
              <Button
                onClick={handleCreate}
                disabled={files.length < 2}
                className="w-full"
              >
                <Film className="mr-2 h-4 w-4" />
                Create Slideshow Reel ({files.length} images)
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
