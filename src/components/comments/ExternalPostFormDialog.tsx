import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Database } from "@/integrations/supabase/types";

type PlatformType = Database["public"]["Enums"]["platform_type"];
type RiskFlag = Database["public"]["Enums"]["risk_flag"];

interface ExternalPostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (post: {
    external_url: string;
    platform: PlatformType;
    author_name?: string;
    post_content?: string;
    topic?: string;
    relevance_score?: number;
    risk_flag?: RiskFlag;
    risk_notes?: string;
    recommended_comment_angle?: string;
  }) => void;
  isPending: boolean;
}

export function ExternalPostFormDialog({ open, onOpenChange, onSave, isPending }: ExternalPostFormDialogProps) {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<PlatformType>("linkedin");
  const [authorName, setAuthorName] = useState("");
  const [postContent, setPostContent] = useState("");
  const [topic, setTopic] = useState("");
  const [relevanceScore, setRelevanceScore] = useState([0.8]);
  const [riskFlag, setRiskFlag] = useState<RiskFlag>("safe");
  const [riskNotes, setRiskNotes] = useState("");
  const [commentAngle, setCommentAngle] = useState("");

  const handleSave = () => {
    onSave({
      external_url: url,
      platform,
      author_name: authorName || undefined,
      post_content: postContent || undefined,
      topic: topic || undefined,
      relevance_score: relevanceScore[0],
      risk_flag: riskFlag,
      risk_notes: riskNotes || undefined,
      recommended_comment_angle: commentAngle || undefined,
    });
    // Reset form
    setUrl("");
    setAuthorName("");
    setPostContent("");
    setTopic("");
    setRelevanceScore([0.8]);
    setRiskFlag("safe");
    setRiskNotes("");
    setCommentAngle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add External Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Post URL *</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://linkedin.com/posts/..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Platform *</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Author Name</Label>
              <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Jane Smith" />
            </div>
          </div>

          <div>
            <Label>Post Content</Label>
            <Textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={3} placeholder="Paste the post text here…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Topic</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. AI in marketing" />
            </div>
            <div>
              <Label>Risk Assessment</Label>
              <Select value={riskFlag} onValueChange={(v) => setRiskFlag(v as RiskFlag)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">Safe</SelectItem>
                  <SelectItem value="review_needed">Review Needed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Relevance Score: {Math.round(relevanceScore[0] * 100)}%</Label>
            <Slider value={relevanceScore} onValueChange={setRelevanceScore} min={0} max={1} step={0.05} />
          </div>

          {riskFlag === "review_needed" && (
            <div>
              <Label>Risk Notes</Label>
              <Input value={riskNotes} onChange={(e) => setRiskNotes(e.target.value)} placeholder="What to be cautious about…" />
            </div>
          )}

          <div>
            <Label>Recommended Comment Angle</Label>
            <Input value={commentAngle} onChange={(e) => setCommentAngle(e.target.value)} placeholder="e.g. Share NuDaze perspective on AI-first workflows" />
          </div>

          <Button onClick={handleSave} disabled={isPending || !url.trim()} className="w-full">
            {isPending ? "Adding…" : "Add External Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
