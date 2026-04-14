import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CommentWithPost } from "@/hooks/usePostCards";

interface CommentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: CommentWithPost;
  onSave: (draft_copy: string) => void;
  isPending: boolean;
}

export function CommentEditDialog({ open, onOpenChange, comment, onSave, isPending }: CommentEditDialogProps) {
  const [draftCopy, setDraftCopy] = useState(comment.draft_copy);
  const ext = comment.external_posts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Comment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {ext && (
            <div className="rounded-md bg-muted/30 border p-2.5">
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Replying to {ext.author_name || "external post"}</p>
              {ext.post_content && (
                <p className="text-xs text-muted-foreground line-clamp-3">{ext.post_content}</p>
              )}
            </div>
          )}
          <div>
            <Label>Comment Draft</Label>
            <Textarea value={draftCopy} onChange={(e) => setDraftCopy(e.target.value)} rows={5} />
            <p className="text-[10px] text-muted-foreground mt-1">{draftCopy.length} characters</p>
          </div>
          <Button onClick={() => onSave(draftCopy)} disabled={isPending || !draftCopy.trim()} className="w-full">
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
