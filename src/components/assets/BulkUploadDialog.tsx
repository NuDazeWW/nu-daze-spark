import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useRef, useCallback } from "react";
import { Upload, X, Film, ImageIcon } from "lucide-react";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (files: File[]) => Promise<void>;
  isPending: boolean;
  progress?: { current: number; total: number; stage: string };
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  progress,
}: BulkUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = "image/*,video/*,.mp4,.mov,.avi,.wmv,.webm,.mkv,.m4v,.flv,.3gp";

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
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

  const handleSubmit = async () => {
    if (files.length === 0) return;
    await onSubmit(files);
    setFiles([]);
  };

  const imageCount = files.filter((f) => f.type.startsWith("image/")).length;
  const videoCount = files.filter((f) => f.type.startsWith("video/")).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Bulk Upload & Create Reels
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Upload multiple images and videos. AI will generate reel post cards with captions, hashtags, and copy for each.
        </p>

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
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
          />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Drop images & videos here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{files.length} file{files.length !== 1 ? "s" : ""} selected</span>
              {imageCount > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  <ImageIcon className="h-3 w-3 mr-1" />{imageCount} image{imageCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {videoCount > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  <Film className="h-3 w-3 mr-1" />{videoCount} video{videoCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border p-2">
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Film className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs truncate">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeFile(i)} disabled={isPending}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {isPending && progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.stage}</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={files.length === 0 || isPending}
          className="w-full"
        >
          {isPending ? "Processing…" : `Add & Create Reels (${files.length})`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
