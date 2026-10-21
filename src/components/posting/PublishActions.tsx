import { CalendarClock, Copy, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenPlatformButton } from "./OpenPlatformButton";
import { useToast } from "@/hooks/use-toast";
import { PUBLISH_ACTION_LABELS as L, buildPackageText, downloadPackageText } from "@/lib/postingPackage";
import { outboundText } from "@/lib/contentPresentation";
import type { PostCard } from "@/hooks/usePostCards";

/**
 * The one publishing action set, identical everywhere a user can publish.
 * Publish now and Schedule only open the existing staged-delivery flow; no platform is contacted here.
 */
export function PublishActions({ card, onPublishNow, onSchedule, packageText, onDownload, size = "sm", disabledReason, onOpened, compact }: {
  card: PostCard;
  onPublishNow: () => void;
  onSchedule: () => void;
  packageText?: string;
  onDownload?: () => void;
  size?: "sm" | "default";
  disabledReason?: string | null;
  onOpened?: () => void;
  /** Icon buttons with the same labels (as tooltips), for narrow queue cards. */
  compact?: boolean;
}) {
  const { toast } = useToast();
  const text = packageText ?? buildPackageText(card);
  const copyPackage = async () => {
    try { await navigator.clipboard.writeText(text); toast({ title: "Full package copied" }); }
    catch { toast({ title: "Couldn't copy", description: "Your browser blocked the clipboard.", variant: "destructive" }); }
  };
  if (compact) {
    const name = card.platform === "linkedin" ? "LinkedIn" : card.platform === "instagram" ? "Instagram" : card.platform;
    const items = [
      { label: L.publishNow, icon: Send, onClick: onPublishNow, primary: true, gated: true },
      { label: L.schedule, icon: CalendarClock, onClick: onSchedule, gated: true },
      { label: L.copyPackage, icon: Copy, onClick: copyPackage },
      { label: L.downloadPackage, icon: Download, onClick: onDownload ?? (() => downloadPackageText(text, card)) },
    ];
    return (
      <div className="sm-publish-actions flex items-center gap-1" role="group" aria-label="Publishing actions">
        {items.map((it) => (
          <Button key={it.label} size="icon" variant={it.primary ? "default" : "ghost"} className="h-7 w-7"
            aria-label={it.label} title={it.gated && disabledReason ? disabledReason : it.label}
            disabled={it.gated && !!disabledReason} onClick={it.onClick}>
            <it.icon className="h-3.5 w-3.5" />
          </Button>
        ))}
        <OpenPlatformButton clientId={card.client_id} platform={card.platform} variant="ghost" className="h-7 px-2 text-xs"
          disabled={!!disabledReason} label={`Copy & open ${name}`}
          copyText={outboundText(card.draft_copy, card.hashtags, card.apply_ai_disclosure)} onOpened={onOpened} />
      </div>
    );
  }
  return (
    <div className="sm-publish-actions flex flex-wrap items-center gap-2" role="group" aria-label="Publishing actions">
      <Button size={size} onClick={onPublishNow} disabled={!!disabledReason} title={disabledReason ?? undefined}><Send className="h-3.5 w-3.5 mr-1" />{L.publishNow}</Button>
      <Button size={size} variant="outline" onClick={onSchedule} disabled={!!disabledReason} title={disabledReason ?? undefined}><CalendarClock className="h-3.5 w-3.5 mr-1" />{L.schedule}</Button>
      <Button size={size} variant="outline" onClick={copyPackage}><Copy className="h-3.5 w-3.5 mr-1" />{L.copyPackage}</Button>
      <Button size={size} variant="outline" onClick={onDownload ?? (() => downloadPackageText(text, card))}><Download className="h-3.5 w-3.5 mr-1" />{L.downloadPackage}</Button>
      <OpenPlatformButton clientId={card.client_id} platform={card.platform} variant="outline"
        disabled={!!disabledReason}
        copyText={outboundText(card.draft_copy, card.hashtags, card.apply_ai_disclosure)} onOpened={onOpened} />
    </div>
  );
}
