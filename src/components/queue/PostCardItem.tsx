import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OpenPlatformButton } from "@/components/posting/OpenPlatformButton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy, Pencil, Trash2, ChevronRight, ChevronLeft, MoreVertical,
  Check, Users, Hash, Building2, Target, Megaphone, BookOpen, Eye, ShieldCheck,
  Mic, Lightbulb, AlertTriangle, Route,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { PostCard, ApprovalStatus } from "@/hooks/usePostCards";
import { STATUS_META, APPROVAL_FLOW } from "@/hooks/usePostCards";
import { NativePreviewDialog } from "@/components/preview/NativePostPreview";
import { usePreflight } from "@/hooks/usePreflight";
import { PreflightBadge, PreflightDialog } from "@/components/preflight/PreflightPanel";
import { useVoiceProfiles } from "@/hooks/useVoiceProfiles";
import { PostNumber, StatusProgress, WhereIsIt, PostHistoryButton, postLabel } from "@/components/tracking/PostTracking";
import { useNavigate } from "react-router-dom";
import { Split } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { SplitPlatformsDialog } from "./SplitPlatformsDialog";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
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
  const { canCreate } = useWorkspace();
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

  const canAdvance = currentIndex < APPROVAL_FLOW.indexOf("archived") && card.approval_status !== "archived";
  const canRevert = currentIndex > 0 && card.approval_status !== "archived";

  const nextStatus = canAdvance ? APPROVAL_FLOW[currentIndex + 1] : null;
  const prevStatus = canRevert ? APPROVAL_FLOW[currentIndex - 1] : null;

  const hashtagString = (card.hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  const peopleString = (card.people_tags ?? []).join(" ");
  const orgString = (card.org_tags ?? []).join(" ");

  return (
    <Card className="group sm-content-card" data-status={card.approval_status} data-content-type="post">
      <CardHeader className="py-3 px-4 space-y-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Tooltip><TooltipTrigger asChild>
              <span className="sm-qplatform" data-platform={card.platform} aria-label={card.platform}><PlatformIcon platform={card.platform} className="h-3.5 w-3.5" /></span>
            </TooltipTrigger><TooltipContent className="capitalize">{card.platform} · {card.content_type}</TooltipContent></Tooltip>
            <PostNumber card={card} />
            {card.scheduled_for && <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(card.scheduled_for), "h:mm a")}</span>}
            <Badge variant="outline" className={`text-[10px] shrink-0 ${statusMeta.color}`}>
              {statusMeta.label}
            </Badge>
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
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-2.5">
        {/* Copy snippet — click to expand */}
        <div className="flex gap-3">
          {thumb?.url && (
            <button type="button" onClick={() => setPreviewOpen(true)} aria-label="Open preview" className="sm-qthumb shrink-0">
              {thumb.asset_type === "video"
                ? <video src={thumb.url} muted className="h-full w-full object-cover" />
                : <img src={thumb.url} alt={thumb.title} loading="lazy" className="h-full w-full object-cover" />}
            </button>
          )}
          <div
            className={`min-w-0 text-sm whitespace-pre-wrap cursor-pointer leading-snug ${!expanded ? "line-clamp-3" : ""}`}
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Click to collapse" : "Click to read full copy"}
          >
            {card.draft_copy.split(/(#[\w-]+)/g).map((part, i) => part.startsWith("#") ? <span key={i} className="sm-qtag">{part}</span> : part)}
          </div>
        </div>

        {/* Compact detail icons — hover for full text */}
        <div className="flex items-center gap-1.5 flex-wrap text-muted-foreground">
          {[
            { show: !!card.objective, icon: Target, label: "Objective", text: card.objective },
            { show: !!card.audience, icon: Megaphone, label: "Audience", text: card.audience },
            { show: !!card.campaign_pillar, icon: BookOpen, label: "Pillar", text: card.campaign_pillar },
            { show: (card.hashtags ?? []).length > 0, icon: Hash, label: `Hashtags (${(card.hashtags ?? []).length})`, text: hashtagString },
            { show: (card.people_tags ?? []).length > 0, icon: Users, label: `People tags (${(card.people_tags ?? []).length})`, text: peopleString },
            { show: (card.org_tags ?? []).length > 0, icon: Building2, label: `Organization tags (${(card.org_tags ?? []).length})`, text: orgString },
            { show: !!voice, icon: Mic, label: "Executive voice", text: voice ? `Written in ${voice.name}'s voice${voice.role_title ? ` · ${voice.role_title}` : ""}` : "" },
            { show: !!card.rationale, icon: Lightbulb, label: "Rationale", text: card.rationale },
            { show: !!card.revision_notes, icon: AlertTriangle, label: "Revision notes", text: card.revision_notes, warn: true },
          ].filter((d) => d.show).map((d) => (
            <Tooltip key={d.label}>
              <TooltipTrigger asChild>
                <span tabIndex={0} aria-label={d.label}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md border bg-muted/40 hover:text-primary hover:border-primary/40 transition-colors ${d.warn ? "text-brand-attention border-brand-attention/40" : ""}`}>
                  <d.icon className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5">{d.label}</p>
                <p className="text-xs whitespace-pre-wrap">{d.text}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} aria-label="Progress" className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-muted/40 hover:text-primary hover:border-primary/40">
                <Route className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="w-72 p-3 space-y-2">
              <StatusProgress card={card} dates={statusDates} />
              <WhereIsIt card={card} here="queue" />
            </TooltipContent>
          </Tooltip>
          <span className="ml-auto text-[10px] text-muted-foreground/70 font-mono">{format(new Date(card.created_at), "MMM d")}</span>
        </div>

        {/* Bottom action icon bar */}
        <div className="flex flex-wrap items-center gap-1 border-t pt-2">
          <PreflightBadge state={pf.run.isPending ? "none" : pf.gate.state} review={pf.review} onClick={() => { setGateIntent(null); setPreflightOpen(true); }} />
          <div className="ml-auto flex flex-wrap items-center justify-end gap-0.5">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Preview" onClick={() => setPreviewOpen(true)}><Eye className="h-3.5 w-3.5" /></Button>
            </TooltipTrigger><TooltipContent>Preview</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Preflight" onClick={() => { setGateIntent(null); setPreflightOpen(true); }}><ShieldCheck className="h-3.5 w-3.5" /></Button>
            </TooltipTrigger><TooltipContent>Preflight</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
            </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copy post" onClick={() => copyToClipboard(card.draft_copy, "Post copy")}><Copy className="h-3.5 w-3.5" /></Button>
            </TooltipTrigger><TooltipContent>Copy post</TooltipContent></Tooltip>
            <PostHistoryButton card={card} />
            {["approved", "exported"].includes(card.approval_status) && (
              <OpenPlatformButton clientId={card.client_id} platform={card.platform}
                copyText={[card.draft_copy, (card.hashtags ?? []).join(" ")].filter(Boolean).join("\n\n")} />
            )}
          </div>
        </div>
      </CardContent>
      <NativePreviewDialog card={card} open={previewOpen} onOpenChange={setPreviewOpen} />
      <PreflightDialog open={preflightOpen} onOpenChange={setPreflightOpen} pf={pf} isAdmin={isAdmin} intent={gateIntent} draft={card.draft_copy} />
      {splitOpen && <SplitPlatformsDialog card={card} open={splitOpen} onOpenChange={setSplitOpen} />}
    </Card>
  );
}
