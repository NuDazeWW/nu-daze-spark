import { useState } from "react";
import { openInNewTab, copyThenOpen } from "@/lib/openInNewTab";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy, Pencil, Trash2, ChevronRight, ChevronLeft, MoreVertical,
  MessageSquare, ExternalLink, Shield, AlertTriangle, ShieldOff, Eye, MoreHorizontal, Send,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { CommentWithPost, ApprovalStatus } from "@/hooks/usePostCards";
import { STATUS_META, APPROVAL_FLOW } from "@/hooks/usePostCards";
import { commentLabel } from "@/lib/contentPresentation";

interface CommentCardItemProps {
  comment: CommentWithPost;
  isAdmin: boolean;
  onEdit: () => void;
  onStatusChange: (status: ApprovalStatus) => void;
  onDelete: () => void;
  isUpdating: boolean;
}

const RISK_ICON = {
  safe: Shield,
  review_needed: AlertTriangle,
  blocked: ShieldOff,
};

const RISK_COLOR = {
  safe: "text-brand-success",
  review_needed: "text-brand-attention",
  blocked: "text-destructive",
};

const copyToClipboard = async (text: string, label: string) => {
  await navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
};

export function CommentCardItem({ comment, isAdmin, onEdit, onStatusChange, onDelete, isUpdating }: CommentCardItemProps) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = STATUS_META[comment.approval_status];
  const currentIndex = APPROVAL_FLOW.indexOf(comment.approval_status);
  const ext = comment.external_posts;

  const canAdvance = currentIndex < APPROVAL_FLOW.indexOf("archived") && comment.approval_status !== "archived";
  const canRevert = currentIndex > 0 && comment.approval_status !== "archived";
  const nextStatus = canAdvance ? APPROVAL_FLOW[currentIndex + 1] : null;
  const prevStatus = canRevert ? APPROVAL_FLOW[currentIndex - 1] : null;

  const riskFlag = ext?.risk_flag ?? "safe";
  const RiskIcon = RISK_ICON[riskFlag];

  const author = ext?.author_name?.trim() || "";
  const initials = (author || commentLabel(ext)).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "C";
  // Stable hue per author so the avatar tile matches the Comment Generator.
  const hue = [...(author || comment.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const platform = ext?.platform ?? "linkedin";

  return (
    <Card className="group sm-content-card sm-qcard" data-status={comment.approval_status} data-content-type="comment">
      <div className="sm-qcard-head">
        <Tooltip><TooltipTrigger asChild>
          <span className="sm-qplatform shrink-0" data-platform={platform} aria-label={platform}><PlatformIcon platform={platform} className="h-3.5 w-3.5" /></span>
        </TooltipTrigger><TooltipContent className="capitalize">Comment on {platform}</TooltipContent></Tooltip>
        <span className="sm-qcard-kind"><MessageSquare className="h-3 w-3" />Comment</span>
        <span className={`sm-qpill ml-auto ${statusMeta.color}`}>{statusMeta.label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1" aria-label="More actions"><MoreVertical className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canAdvance && nextStatus && (
              <DropdownMenuItem onClick={() => onStatusChange(nextStatus)} disabled={isUpdating}>
                <ChevronRight className="mr-2 h-3.5 w-3.5" />Move to {STATUS_META[nextStatus].label}
              </DropdownMenuItem>
            )}
            {canRevert && prevStatus && (
              <DropdownMenuItem onClick={() => onStatusChange(prevStatus)} disabled={isUpdating}>
                <ChevronLeft className="mr-2 h-3.5 w-3.5" />Back to {STATUS_META[prevStatus].label}
              </DropdownMenuItem>
            )}
            {["draft", "needs_revision"].includes(comment.approval_status) && (
              <DropdownMenuItem
                disabled={isUpdating}
                onClick={() => {
                  onStatusChange("in_review");
                  toast.success("Comment sent for Executive Review", {
                    description: "It now shows as Pending Executive Review in the review queue.",
                  });
                }}
              >
                <Send className="mr-2 h-3.5 w-3.5" />Send for Executive Review
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => copyToClipboard(comment.draft_copy, "Comment")}>
              <Copy className="mr-2 h-3.5 w-3.5" />Copy Comment
            </DropdownMenuItem>
            {ext?.external_url && (
              <DropdownMenuItem onClick={() => openInNewTab(ext.external_url)}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />Open Original Post
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />Edit
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="sm-qcard-body">
        <span className="sm-qthumb sm-qavatar" style={{ ["--av" as string]: `${hue} 70% 55%` }} aria-hidden="true">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground truncate" title={commentLabel(ext)}>
            {author ? <>Replying to <span className="text-foreground/80 font-medium">{author}</span></> : commentLabel(ext)}
          </p>
          <p className={`sm-qcard-copy ${!expanded ? "line-clamp-3" : "whitespace-pre-wrap"}`} onClick={() => setExpanded(!expanded)} title={expanded ? "Click to collapse" : "Click to read full comment"}>
            {comment.draft_copy}
          </p>
          <div className="sm-qcard-tags">
            {ext?.topic && <span className="sm-qtag truncate max-w-full">#{ext.topic.replace(/\s+/g, "")}</span>}
            <Tooltip><TooltipTrigger asChild>
              <span className="inline-flex"><RiskIcon className={`h-3 w-3 ${RISK_COLOR[riskFlag]}`} /></span>
            </TooltipTrigger><TooltipContent className="capitalize">Risk: {riskFlag.replace("_", " ")}</TooltipContent></Tooltip>
            {ext?.relevance_score != null && <span className="sm-qtag-id">{Math.round(Number(ext.relevance_score) * 100)}%</span>}
          </div>
        </div>
      </div>

      <div className="sm-qcard-foot">
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={expanded ? "Collapse" : "Read full comment"} onClick={() => setExpanded(!expanded)}><Eye className="h-4 w-4" /></Button>
        </TooltipTrigger><TooltipContent>{expanded ? "Collapse" : "Read full comment"}</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
        </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copy comment" onClick={() => copyToClipboard(comment.draft_copy, "Comment")}><Copy className="h-4 w-4" /></Button>
        </TooltipTrigger><TooltipContent>Copy comment</TooltipContent></Tooltip>
        <Popover>
          <Tooltip><TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Post context and details"><MoreHorizontal className="h-4 w-4" /></Button>
            </PopoverTrigger>
          </TooltipTrigger><TooltipContent>Original post & details</TooltipContent></Tooltip>
          <PopoverContent className="w-80 p-3 space-y-2.5 max-h-96 overflow-y-auto" align="end">
            <p className="text-sm font-semibold leading-snug">{commentLabel(ext)}</p>
            {ext && (
              <div className="rounded-md bg-muted/30 border p-2.5 space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                  <span className="font-medium">Replying to:</span>
                  {ext.author_name && <span>{ext.author_name}</span>}
                  {ext.topic && <span className="sm-qtag">{ext.topic}</span>}
                  <RiskIcon className={`h-3 w-3 ${RISK_COLOR[riskFlag]}`} />
                  <span className="capitalize">{riskFlag.replace("_", " ")}</span>
                  {ext.relevance_score != null && <span className="ml-auto">{Math.round(Number(ext.relevance_score) * 100)}% relevant</span>}
                </div>
                {ext.post_content && <p className="text-xs text-muted-foreground line-clamp-4">{ext.post_content}</p>}
              </div>
            )}
            {ext?.external_url && ["approved", "exported"].includes(comment.approval_status) && (
              <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs gap-1.5"
                onClick={() => { copyThenOpen(comment.draft_copy, ext.external_url).then((ok) => { if (ok) toast.success("Comment copied — paste it on the post"); }); }}>
                <ExternalLink className="h-3.5 w-3.5" />Copy & open post
              </Button>
            )}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
              {comment.tone && <span>Tone: {comment.tone}</span>}
              <span>Created {format(new Date(comment.created_at), "MMM d, yyyy")}</span>
            </div>
            {comment.rationale && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide">Rationale</p>
                <p className="text-xs text-muted-foreground">{comment.rationale}</p>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
}
