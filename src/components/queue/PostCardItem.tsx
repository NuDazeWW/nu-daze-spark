import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy, Pencil, Trash2, ChevronRight, ChevronLeft, MoreVertical,
  Check, Users, Hash, Building2, Target, Megaphone, BookOpen, Eye, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { PostCard, ApprovalStatus } from "@/hooks/usePostCards";
import { STATUS_META, APPROVAL_FLOW } from "@/hooks/usePostCards";
import { NativePreviewDialog } from "@/components/preview/NativePostPreview";
import { usePreflight } from "@/hooks/usePreflight";
import { PreflightBadge, PreflightDialog } from "@/components/preflight/PreflightPanel";
import { PostNumber, StatusProgress, WhereIsIt, PostHistoryButton, postLabel } from "@/components/tracking/PostTracking";
import { useNavigate } from "react-router-dom";

interface PostCardItemProps {
  card: PostCard;
  isAdmin: boolean;
  onEdit: () => void;
  onStatusChange: (status: ApprovalStatus, notes?: string) => void;
  onDelete: () => void;
  isUpdating: boolean;
  statusDates?: Partial<Record<ApprovalStatus, string>>;
}

const copyToClipboard = async (text: string, label: string) => {
  await navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
};

export function PostCardItem({ card, isAdmin, onEdit, onStatusChange, onDelete, isUpdating, statusDates }: PostCardItemProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [gateIntent, setGateIntent] = useState<string | null>(null);
  const pf = usePreflight(card);
  const statusMeta = STATUS_META[card.approval_status];

  const changeStatus = (status: ApprovalStatus) => {
    if ((status === "approved" || status === "exported") && !pf.gate.clear) {
      setGateIntent(`Preflight must pass before moving to ${STATUS_META[status].label}. Run it, fix or acknowledge findings${isAdmin ? ", or override blocking issues with a reason" : ""}.`);
      setPreflightOpen(true);
      return;
    }
    onStatusChange(status);
    if (status === "in_review") pf.run.mutate();
    if (status === "approved")
      toast.success(`${postLabel(card)} moved to Approved Content`, {
        action: { label: "View it", onClick: () => navigate(`/approved?post=${card.id}`) },
      });
  };
  const currentIndex = APPROVAL_FLOW.indexOf(card.approval_status);

  const canAdvance = currentIndex < APPROVAL_FLOW.indexOf("archived") && card.approval_status !== "archived";
  const canRevert = currentIndex > 0 && card.approval_status !== "archived";

  const nextStatus = canAdvance ? APPROVAL_FLOW[currentIndex + 1] : null;
  const prevStatus = canRevert ? APPROVAL_FLOW[currentIndex - 1] : null;

  const hashtagString = (card.hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  const peopleString = (card.people_tags ?? []).join(" ");
  const orgString = (card.org_tags ?? []).join(" ");

  return (
    <Card className="group">
      <CardHeader className="py-3 px-4 space-y-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <PostNumber card={card} />
            <Badge className={`text-[10px] shrink-0 ${statusMeta.color}`}>
              {statusMeta.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize shrink-0">{card.platform}</Badge>
            <Badge variant="outline" className="text-[10px] capitalize shrink-0">{card.content_type}</Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Advance / Revert status */}
            {canRevert && prevStatus && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeStatus(prevStatus)} disabled={isUpdating}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to {STATUS_META[prevStatus].label}</TooltipContent>
              </Tooltip>
            )}
            {canAdvance && nextStatus && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeStatus(nextStatus)} disabled={isUpdating}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move to {STATUS_META[nextStatus].label}</TooltipContent>
              </Tooltip>
            )}
            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => copyToClipboard(card.draft_copy, "Post copy")}>
                  <Copy className="mr-2 h-3.5 w-3.5" />Copy Post
                </DropdownMenuItem>
                {hashtagString && (
                  <DropdownMenuItem onClick={() => copyToClipboard(hashtagString, "Hashtags")}>
                    <Hash className="mr-2 h-3.5 w-3.5" />Copy Hashtags
                  </DropdownMenuItem>
                )}
                {peopleString && (
                  <DropdownMenuItem onClick={() => copyToClipboard(peopleString, "Tags")}>
                    <Users className="mr-2 h-3.5 w-3.5" />Copy People Tags
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                </DropdownMenuItem>
                {isAdmin && card.approval_status !== "archived" && (
                  <DropdownMenuItem onClick={() => onStatusChange("archived")}>
                    <BookOpen className="mr-2 h-3.5 w-3.5" />Archive
                  </DropdownMenuItem>
                )}
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
        <StatusProgress card={card} dates={statusDates} />
        <WhereIsIt card={card} here="queue" />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-3.5 w-3.5" />Preview
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => { setGateIntent(null); setPreflightOpen(true); }}>
            <ShieldCheck className="h-3.5 w-3.5" />Preflight
          </Button>
          <PostHistoryButton card={card} />
          <PreflightBadge state={pf.run.isPending ? "none" : pf.gate.state} review={pf.review} onClick={() => { setGateIntent(null); setPreflightOpen(true); }} />
        </div>
        {/* Draft copy */}
        <div
          className={`text-sm whitespace-pre-wrap cursor-pointer ${!expanded ? "line-clamp-4" : ""}`}
          onClick={() => setExpanded(!expanded)}
        >
          {card.draft_copy}
        </div>
        {card.draft_copy.length > 200 && (
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}

        {/* Revision notes */}
        {card.revision_notes && (
          <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2">
            <p className="text-[10px] font-medium text-amber-400 mb-0.5">Revision Notes</p>
            <p className="text-xs text-muted-foreground">{card.revision_notes}</p>
          </div>
        )}

        {/* Tags section */}
        <div className="space-y-1.5">
          {(card.people_tags ?? []).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Users className="h-3 w-3 text-muted-foreground shrink-0" />
               {(card.people_tags ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}
          {(card.org_tags ?? []).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
               {(card.org_tags ?? []).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}
          {(card.hashtags ?? []).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-[10px] text-muted-foreground">{hashtagString}</p>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 pt-1 flex-wrap">
          {card.objective && (
            <span className="flex items-center gap-1"><Target className="h-2.5 w-2.5" />{card.objective}</span>
          )}
          {card.audience && (
            <span className="flex items-center gap-1"><Megaphone className="h-2.5 w-2.5" />{card.audience}</span>
          )}
          {card.campaign_pillar && (
            <span className="flex items-center gap-1"><BookOpen className="h-2.5 w-2.5" />{card.campaign_pillar}</span>
          )}
          <span>Created {format(new Date(card.created_at), "MMM d, yyyy")}</span>
        </div>

        {/* Rationale */}
        {card.rationale && (
          <details className="group/details">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary">
              View rationale
            </summary>
            <p className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-muted">{card.rationale}</p>
          </details>
        )}
      </CardContent>
      <NativePreviewDialog card={card} open={previewOpen} onOpenChange={setPreviewOpen} />
      <PreflightDialog open={preflightOpen} onOpenChange={setPreflightOpen} pf={pf} isAdmin={isAdmin} intent={gateIntent} />
    </Card>
  );
}
