import { formatHashtags } from "@/lib/contentPresentation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OpenPlatformButton } from "@/components/posting/OpenPlatformButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy, Pencil, Trash2, ChevronRight, ChevronLeft, MoreVertical,
  Users, Hash, Building2, Target, Megaphone, BookOpen, Eye, ShieldCheck,
  Mic, Lightbulb, AlertTriangle, MoreHorizontal, Play, Send,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { PostCard, ApprovalStatus } from "@/hooks/usePostCards";
import { STATUS_META, APPROVAL_FLOW } from "@/hooks/usePostCards";
import { NativePreviewDialog } from "@/components/preview/NativePostPreview";
import { usePreflight } from "@/hooks/usePreflight";
import { PreflightDialog } from "@/components/preflight/PreflightPanel";
import { useVoiceProfiles } from "@/hooks/useVoiceProfiles";
import { PostNumber, StatusProgress, WhereIsIt, PostHistoryButton, postLabel } from "@/components/tracking/PostTracking";
import { useNavigate } from "react-router-dom";
import { Split } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { SplitPlatformsDialog } from "./SplitPlatformsDialog";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { ReadinessBadge } from "@/components/preflight/ReadinessBadge";
import { usePreviewMedia } from "@/hooks/usePreviewMedia";

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
  const [splitOpen, setSplitOpen] = useState(false);
  const { canCreate, settings } = useWorkspace();
  const [gateIntent, setGateIntent] = useState<string | null>(null);
  const pf = usePreflight(card);
  const { profiles: voices } = useVoiceProfiles();
  const voice = card.voice_profile_id ? voices.find((v) => v.id === card.voice_profile_id) : null;
  const statusMeta = STATUS_META[card.approval_status];
  const { data: media = [] } = usePreviewMedia(card, true);
  const thumb = media.find((m) => m.url && m.asset_type !== "video") ?? media.find((m) => m.url);

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

  const canAdvance = canCreate && currentIndex < APPROVAL_FLOW.indexOf("archived") && card.approval_status !== "archived";
  const canRevert = canCreate && currentIndex > 0 && card.approval_status !== "archived";

  const nextStatus = canAdvance ? APPROVAL_FLOW[currentIndex + 1] : null;
  const prevStatus = canRevert ? APPROVAL_FLOW[currentIndex - 1] : null;

  const hashtagString = formatHashtags(card.hashtags);
  const peopleString = (card.people_tags ?? []).join(" ");
  const orgString = (card.org_tags ?? []).join(" ");

  const gateState = pf.run.isPending ? "none" : pf.gate.state;
  const gateIconCls =
    gateState === "pass" || gateState === "acknowledged" ? "text-brand-success" :
    gateState === "blocked" ? "text-destructive" :
    gateState === "warnings" || gateState === "overridden" || gateState === "stale" ? "text-brand-warning" :
    "text-muted-foreground";

  const details = [
    { show: !!card.objective, icon: Target, label: "Objective", text: card.objective },
    { show: !!card.audience, icon: Megaphone, label: "Audience", text: card.audience },
    { show: !!card.campaign_pillar, icon: BookOpen, label: "Campaign pillar", text: card.campaign_pillar },
    { show: (card.hashtags ?? []).length > 0, icon: Hash, label: `Hashtags (${(card.hashtags ?? []).length})`, text: hashtagString },
    { show: (card.people_tags ?? []).length > 0, icon: Users, label: `People tags (${(card.people_tags ?? []).length})`, text: peopleString },
    { show: (card.org_tags ?? []).length > 0, icon: Building2, label: `Organization tags (${(card.org_tags ?? []).length})`, text: orgString },
    { show: !!voice, icon: Mic, label: "Executive voice", text: voice ? `Written in ${voice.name}'s voice${voice.role_title ? ` · ${voice.role_title}` : ""}` : "" },
    { show: !!card.rationale, icon: Lightbulb, label: "Rationale", text: card.rationale },
    { show: !!card.revision_notes, icon: AlertTriangle, label: "Revision notes", text: card.revision_notes, warn: true },
  ].filter((d) => d.show);

  const tags = formatHashtags(card.hashtags).split(" ").filter(Boolean);
  const captionText = card.draft_copy.replace(/#[\w-]+/g, "").replace(/\s+\n/g, "\n").trim();
  // Text tile fallback: the post's own opening words, like a native text graphic.
  const hookWords = captionText.split(/[\s—–]+/).slice(0, 3).join(" ").replace(/[—–,:;.!?]+$/, "");
  const time = card.scheduled_for ? format(new Date(card.scheduled_for), "h:mm a") : null;
  const preflightLabel = gateState === "none" ? "Not checked yet" : gateState.charAt(0).toUpperCase() + gateState.slice(1);

  return (
    <Card className="group sm-content-card sm-qcard" data-status={card.approval_status} data-content-type="post">
      {/* Header: platform · time · status · menu */}
      <div className="sm-qcard-head">
        <Tooltip><TooltipTrigger asChild>
          <span className="sm-qplatform shrink-0" data-platform={card.platform} aria-label={card.platform}><PlatformIcon platform={card.platform} className="h-3.5 w-3.5" /></span>
        </TooltipTrigger><TooltipContent className="capitalize">{card.platform} · {card.content_type}</TooltipContent></Tooltip>
        {time
          ? <span className="sm-qcard-time">{time}</span>
          : <span className="shrink-0 min-w-0 truncate"><PostNumber card={card} /></span>}
        <span className={`sm-qpill ml-auto ${statusMeta.color}`}>{statusMeta.label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1" aria-label="More actions"><MoreVertical className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canAdvance && nextStatus && (
              <DropdownMenuItem onClick={() => changeStatus(nextStatus)} disabled={isUpdating}>
                <ChevronRight className="mr-2 h-3.5 w-3.5" />Move to {STATUS_META[nextStatus].label}
              </DropdownMenuItem>
            )}
            {canRevert && prevStatus && (
              <DropdownMenuItem onClick={() => changeStatus(prevStatus)} disabled={isUpdating}>
                <ChevronLeft className="mr-2 h-3.5 w-3.5" />Back to {STATUS_META[prevStatus].label}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { setGateIntent(null); setPreflightOpen(true); }}>
              <ShieldCheck className="mr-2 h-3.5 w-3.5" />Preflight check
            </DropdownMenuItem>
            {["draft", "needs_revision"].includes(card.approval_status) && (
              <DropdownMenuItem
                disabled={isUpdating || !canCreate || !settings?.executive_review_enabled}
                onClick={() => {
                  changeStatus("in_review");
                  toast.info(`Submitting ${postLabel(card)} for Executive Review`, {
                    description: "It now shows as Pending Executive Review in the review queue.",
                    action: { label: "Open review", onClick: () => navigate(`/review?post=${card.id}`) },
                  });
                }}
              >
                <Send className="mr-2 h-3.5 w-3.5" />Send for Executive Review
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
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
            {orgString && (
              <DropdownMenuItem onClick={() => copyToClipboard(orgString, "Tags")}>
                <Building2 className="mr-2 h-3.5 w-3.5" />Copy Organization Tags
              </DropdownMenuItem>
            )}
            {canCreate && card.content_type !== "comment" && (
              <DropdownMenuItem onClick={() => setSplitOpen(true)}>
                <Split className="mr-2 h-3.5 w-3.5" />Split across platforms
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

      {/* Body: thumbnail beside caption, hashtag pills underneath */}
      <div className="sm-qcard-body">
        <button type="button" onClick={() => setPreviewOpen(true)} aria-label="Open preview" className="sm-qthumb" data-platform={card.platform}>
          {thumb?.url
            ? (thumb.asset_type === "video"
              ? <><video src={thumb.url} muted className="h-full w-full object-cover" /><span className="sm-qthumb-play"><Play className="h-3.5 w-3.5" /></span></>
              : <img src={thumb.url} alt={thumb.title} loading="lazy" className="h-full w-full object-cover" />)
            : <span className="sm-qthumb-text">{hookWords}</span>}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`sm-qcard-copy ${!expanded ? "line-clamp-3" : "whitespace-pre-wrap"}`}
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Click to collapse" : "Click to read full copy"}
          >
            {expanded ? captionText : captionText.replace(/\s+/g, " ")}
          </p>
          <div className="sm-qcard-tags">
            {(expanded ? tags : tags.slice(0, 2)).map((t) => <span key={t} className="sm-qtag">{t}</span>)}
            {!expanded && tags.length > 2 && <span className="sm-qtag-more">+{tags.length - 2}</span>}
            {time && <span className="sm-qtag-id"><PostNumber card={card} /></span>}
          </div>
        </div>
      </div>

      <div className="px-3 pb-2"><ReadinessBadge card={card} /></div>
      {/* Footer: preview · edit · copy · more */}
      <div className="sm-qcard-foot">
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Preview" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /></Button>
        </TooltipTrigger><TooltipContent>Preview</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
        </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copy post" onClick={() => copyToClipboard(card.draft_copy, "Post copy")}><Copy className="h-4 w-4" /></Button>
        </TooltipTrigger><TooltipContent>Copy post</TooltipContent></Tooltip>
        <Popover>
          <Tooltip><TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 relative" aria-label="Details, preflight and history">
                <MoreHorizontal className="h-4 w-4" />
                <span className={`sm-qdot ${gateIconCls}`} aria-hidden="true" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger><TooltipContent>Details · Preflight: {preflightLabel}</TooltipContent></Tooltip>
          <PopoverContent className="w-72 p-3 space-y-2 max-h-96 overflow-y-auto" align="end">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{postLabel(card)} · Created {format(new Date(card.created_at), "MMM d")}</p>
            <Button variant="outline" size="sm" className={`w-full justify-start h-8 text-xs gap-2 ${gateIconCls}`} onClick={() => { setGateIntent(null); setPreflightOpen(true); }}>
              <ShieldCheck className="h-3.5 w-3.5" />Preflight: {preflightLabel}
            </Button>
            <div className="grid grid-cols-1 gap-1.5">
              <PostHistoryButton card={card} className="w-full justify-start h-8 text-xs gap-2" />
              {["approved", "exported"].includes(card.approval_status) && (
                <OpenPlatformButton clientId={card.client_id} platform={card.platform} className="w-full justify-start h-8 text-xs"
                  copyText={[card.draft_copy, formatHashtags(card.hashtags)].filter(Boolean).join("\n\n")} />
              )}
            </div>
            {details.map((d) => (
              <div key={d.label} className="flex gap-2">
                <d.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${d.warn ? "text-brand-attention" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide">{d.label}</p>
                  <p className="text-xs whitespace-pre-wrap break-words">{d.text}</p>
                </div>
              </div>
            ))}
            <StatusProgress card={card} dates={statusDates} />
            <WhereIsIt card={card} here="queue" />
          </PopoverContent>
        </Popover>
      </div>
      <NativePreviewDialog card={card} open={previewOpen} onOpenChange={setPreviewOpen} />
      <PreflightDialog open={preflightOpen} onOpenChange={setPreflightOpen} pf={pf} isAdmin={isAdmin} intent={gateIntent} draft={card.draft_copy} />
      {splitOpen && <SplitPlatformsDialog card={card} open={splitOpen} onOpenChange={setSplitOpen} />}
    </Card>
  );
}
