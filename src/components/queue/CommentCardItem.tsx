import { useState } from "react";
import { openInNewTab, copyThenOpen } from "@/lib/openInNewTab";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy, Pencil, Trash2, ChevronRight, ChevronLeft, MoreVertical,
  MessageSquare, ExternalLink, Shield, AlertTriangle, ShieldOff,
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

  return (
    <Card className="group sm-content-card" data-status={comment.approval_status} data-content-type="comment">
      <CardHeader className="py-3 px-4 space-y-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Badge variant="outline" className={`text-xs shrink-0 ${statusMeta.color}`}>
              {statusMeta.label}
            </Badge>
            <Badge variant="outline" className="sm-type sm-type-comment shrink-0 gap-1">
              <MessageSquare className="h-2.5 w-2.5" />Comment
            </Badge>
            {ext && (
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{ext.platform}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canRevert && prevStatus && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStatusChange(prevStatus)} disabled={isUpdating}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to {STATUS_META[prevStatus].label}</TooltipContent>
              </Tooltip>
            )}
            {canAdvance && nextStatus && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStatusChange(nextStatus)} disabled={isUpdating}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move to {STATUS_META[nextStatus].label}</TooltipContent>
              </Tooltip>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <h3 className="text-lg font-semibold leading-snug break-words">{commentLabel(ext)}</h3>
        {/* External post context */}
        {ext && (
          <div className="rounded-md bg-muted/30 border p-2.5 space-y-1">
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
              <span className="font-medium">Replying to:</span>
              {ext.author_name && <span>{ext.author_name}</span>}
              {ext.topic && <Badge variant="secondary" className="text-[9px] h-4">{ext.topic}</Badge>}
              <Tooltip>
                <TooltipTrigger>
                  <RiskIcon className={`h-3 w-3 ${RISK_COLOR[riskFlag]}`} />
                </TooltipTrigger>
                <TooltipContent className="capitalize">{riskFlag.replace("_", " ")}</TooltipContent>
              </Tooltip>
              {ext.relevance_score != null && (
                <span className="ml-auto">{Math.round(Number(ext.relevance_score) * 100)}% relevant</span>
              )}
            </div>
            {ext.post_content && (
              <p className="text-xs text-muted-foreground line-clamp-2">{ext.post_content}</p>
            )}
          </div>
        )}

        {/* Draft comment */}
        <div
          className={`text-sm whitespace-pre-wrap cursor-pointer ${!expanded ? "line-clamp-4" : ""}`}
          onClick={() => setExpanded(!expanded)}
        >
          {comment.draft_copy}
        </div>
        {comment.draft_copy.length > 200 && (
          <Button variant="link" size="sm" className="px-0 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}

        {ext?.external_url && ["approved","exported"].includes(comment.approval_status) && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => { copyThenOpen(comment.draft_copy, ext.external_url).then((ok) => { if (ok) toast.success("Comment copied — paste it on the post"); }); }}>
            <ExternalLink className="h-3.5 w-3.5" />Copy & open post
          </Button>
        )}

        {/* Tone & rationale */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 pt-1 flex-wrap">
          {comment.tone && <span>Tone: {comment.tone}</span>}
          <span>Created {format(new Date(comment.created_at), "MMM d, yyyy")}</span>
        </div>

        {comment.rationale && (
          <details className="group/details">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary">
              View rationale
            </summary>
            <p className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-muted">{comment.rationale}</p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
