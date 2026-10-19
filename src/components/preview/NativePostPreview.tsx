import { useEffect, useMemo, useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Globe2, Heart, ImageOff, Maximize, MessageCircle, MoreHorizontal, Repeat2, Send, ThumbsUp, Volume2, X } from "lucide-react";
import { PlatformIcon } from "@/components/layout/PlatformIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PostCard } from "@/hooks/usePostCards";
import { useActiveClient } from "@/contexts/ClientContext";
import { usePreviewMedia, type PreviewMedia } from "@/hooks/usePreviewMedia";
import { AccountPhotoControl, PreviewAvatar, usePreviewAccount } from "./PreviewAccountIdentity";
import { extractPreviewCopy, parseStoryFrames, previewLimit, withHashtags } from "@/lib/nativePreview";

function Media({ asset, fill, onRatio }: { asset?: PreviewMedia; fill: boolean; onRatio: (ratio: number) => void }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [asset?.url]);
  if (!asset || !asset.url || failed) return <div className="native-media-empty" role="status">
    <ImageOff className="h-7 w-7" /><span>{asset ? "Media unavailable" : "No media attached"}</span>
  </div>;
  const className = `native-media ${fill ? "native-media-fill" : "native-media-fit"}`;
  return asset.asset_type === "video"
    ? <video className={className} src={asset.url} controls playsInline preload="metadata" onError={() => setFailed(true)}
        onLoadedMetadata={(event) => { const video = event.currentTarget; onRatio(video.videoWidth / video.videoHeight); }} />
    : <img className={className} src={asset.url} alt={asset.title} onError={() => setFailed(true)}
        onLoad={(event) => { const image = event.currentTarget; onRatio(image.naturalWidth / image.naturalHeight); }} />;
}

export function NativePostPreview({ card, enabled = true, firstComment }: { card: PostCard; enabled?: boolean; firstComment?: string }) {
  const { activeClient } = useActiveClient();
  const { data: media = [], isFetching, error } = usePreviewMedia(card, enabled);
  const [expanded, setExpanded] = useState(false);
  const [index, setIndex] = useState(0);
  const [fill, setFill] = useState(true);
  const [ratio, setRatio] = useState<number | null>(null);
  const parsed = useMemo(() => extractPreviewCopy(card.draft_copy, card.content_type), [card.draft_copy, card.content_type]);
  const frames = useMemo(() => parseStoryFrames(card.draft_copy), [card.draft_copy]);
  const caption = parsed.missingCaption ? "" : withHashtags(parsed.caption, card.hashtags);
  const isLinkedIn = card.platform === "linkedin";
  const isStory = !isLinkedIn && card.content_type === "story";
  const isReel = !isLinkedIn && card.content_type === "reel";
  const vertical = isStory || isReel;
  const count = isStory ? Math.max(1, frames.length) : Math.max(1, media.length);
  const selectedMedia = isStory ? media[index] ?? media[0] : media[index];
  const frame = frames[index];
  const { account, avatarUrl } = usePreviewAccount(card.client_id, card.platform);
  const name = account?.account_name || (activeClient?.id === card.client_id ? activeClient.name : "Client account");
  const targetRatio = vertical ? 9 / 16 : isLinkedIn ? 1.91 : 4 / 5;
  const limit = previewLimit(card.platform);
  useEffect(() => { setIndex(0); setExpanded(false); setRatio(null); }, [card.id, card.draft_copy]);
  useEffect(() => setRatio(null), [selectedMedia?.id]);

  const navigation = count > 1 ? <div className="flex items-center justify-center gap-3 py-2">
    <Button variant="outline" size="icon" className="h-7 w-7" aria-label={isStory ? "Previous frame" : "Previous media"}
      disabled={index === 0} onClick={() => setIndex((i) => i - 1)}><ChevronLeft className="h-4 w-4" /></Button>
    <span className="text-xs tabular-nums text-muted-foreground">{isStory ? "Frame" : "Media"} {index + 1} / {count}</span>
    <Button variant="outline" size="icon" className="h-7 w-7" aria-label={isStory ? "Next frame" : "Next media"}
      disabled={index === count - 1} onClick={() => setIndex((i) => i + 1)}><ChevronRight className="h-4 w-4" /></Button>
  </div> : null;

  const copy = <div className="native-copy">
    {!isLinkedIn && <strong className="mr-1">{name}</strong>}
    <span className={expanded ? "whitespace-pre-wrap" : `whitespace-pre-wrap ${isLinkedIn ? "line-clamp-3" : "line-clamp-2"}`}>
      {caption || (parsed.missingCaption ? "Caption not identified" : "No caption")}
    </span>
    {(caption.length > (isLinkedIn ? 180 : 90) || caption.split("\n").length > 2) &&
      <Button variant="ghost" size="sm" className="native-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? "Show less" : isLinkedIn ? "… see more" : "more"}
      </Button>}
  </div>;
  const header = <div className="native-header">
    <PreviewAvatar name={name} url={avatarUrl} />
    <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{name}</strong>
      {isLinkedIn && <span className="native-muted flex items-center gap-1 text-xs">Just now · <Globe2 className="h-3 w-3" /></span>}
    </div>
    <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
  </div>;
  const mediaView = <Media asset={selectedMedia} fill={fill} onRatio={setRatio} />;

  return <section className="space-y-3 min-w-0" aria-label={`${isLinkedIn ? "LinkedIn" : "Instagram"} ${card.content_type} preview`}>
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 text-sm font-medium"><PlatformIcon platform={isLinkedIn ? "linkedin" : "instagram"} className="h-4 w-4" />
        {isLinkedIn ? "LinkedIn" : "Instagram"} <span className="text-muted-foreground capitalize">{card.content_type === "post" ? "Feed" : card.content_type}</span>
      </div>
      <ToggleGroup type="single" value={fill ? "fill" : "fit"} onValueChange={(v) => { if (v) setFill(v === "fill"); }} aria-label="Media crop">
        <ToggleGroupItem value="fit" className="h-7 px-2 text-xs" aria-label="Fit media">Fit</ToggleGroupItem>
        <ToggleGroupItem value="fill" className="h-7 px-2 text-xs" aria-label="Fill media"><Maximize className="h-3 w-3 mr-1" />Fill</ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div className="native-stage">
      {vertical ? <div className="native-vertical" data-testid="vertical-preview">
        {mediaView}
        <div className="native-vertical-header">
          {isStory && <div className="flex gap-1 mb-2" aria-hidden="true">{Array.from({ length: count }, (_, i) => <div key={i} className={`native-progress ${i <= index ? "native-progress-active" : ""}`} />)}</div>}
          <div className="flex items-center gap-2"><PreviewAvatar name={name} url={avatarUrl} /><strong className="text-sm truncate flex-1">{name}</strong>
            {isStory ? <X className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}</div>
        </div>
        {isStory && frame?.onScreen && <div className="native-story-text">{frame.onScreen}</div>}
        <div className="native-vertical-footer">
          {isReel ? <><strong className="text-sm">{name}</strong><p className="line-clamp-2 text-xs whitespace-pre-wrap mt-2">{caption || "Caption not identified"}</p></>
            : <div className="native-reply">Send message <Heart className="h-5 w-5 ml-auto" /><Send className="h-5 w-5" /></div>}
        </div>
        {isReel && <div className="native-reel-actions" aria-hidden="true"><Heart /><MessageCircle /><Send /><MoreHorizontal /></div>}
      </div> : <article className="native-feed" data-testid="feed-preview">
        {header}
        {isLinkedIn && copy}
        {(!isLinkedIn || media.length > 0) && <div className={`native-feed-media ${isLinkedIn ? "native-linkedin-media" : "native-instagram-media"}`}>{mediaView}
          {count > 1 && <span className="native-counter">{index + 1}/{count}</span>}
        </div>}
        {isLinkedIn ? <div className="native-linkedin-actions" aria-hidden="true">
          <span><ThumbsUp />Like</span><span><MessageCircle />Comment</span><span><Repeat2 />Repost</span><span><Send />Send</span>
        </div> : <><div className="native-instagram-actions" aria-hidden="true"><Heart /><MessageCircle /><Send /><Bookmark className="ml-auto" /></div>{copy}</>}
        {isLinkedIn && firstComment?.trim() && <div className="native-first-comment"><strong className="text-xs">{name}</strong><p className="text-xs whitespace-pre-wrap mt-1">{firstComment}</p></div>}
      </article>}
    </div>
    {navigation}
    {vertical && !isStory && copy && <div className="text-sm whitespace-pre-wrap break-words">{caption || "Caption not identified"}</div>}
    {card.client_id && <AccountPhotoControl account={account} clientId={card.client_id} hasPhoto={!!avatarUrl} />}
    <div className="text-xs space-y-1 text-muted-foreground" role="status">
      <p className={caption.length > limit ? "text-destructive" : ""}>{caption.length.toLocaleString()} / {limit.toLocaleString()} characters{caption.length > limit && " — over platform limit"}</p>
      {isFetching && <p>Loading attached media…</p>}
      {error && <p className="text-destructive">Attached media could not be loaded.</p>}
      {!isFetching && !media.length && (!isLinkedIn || (card.source_references?.length ?? 0) > 0) && <p>No cleared image or video available for this preview.</p>}
      {fill && ratio && Math.abs(ratio - targetRatio) > 0.05 && <p className="text-accent">Media edges will be cropped in {vertical ? "9:16" : isLinkedIn ? "1.91:1" : "4:5"} fill view.</p>}
      {vertical && ratio && Math.abs(ratio - 9 / 16) > 0.05 && <p>Attached media is not 9:16 portrait.</p>}
      {isReel && selectedMedia && selectedMedia.asset_type !== "video" && <p className="text-accent">Still image only — no finished Reel video attached.</p>}
      {parsed.missingCaption && <p className="text-accent">Production outline found, but no final caption was identified.</p>}
      {isStory && !frames.length && <p className="text-accent">No structured Story frames identified.</p>}
      {isStory && frames.length > media.length && <p>Storyboard text is simulated; individual frame media is not fully attached.</p>}
    </div>
    {parsed.structured && <details className="text-xs border-t pt-3"><summary className="cursor-pointer text-muted-foreground">Production outline{frame ? ` · ${frame.title}` : ""}</summary>
      <p className="whitespace-pre-wrap break-words mt-2 max-h-64 overflow-y-auto">{isStory && frame ? frame.outline : card.draft_copy}</p></details>}
    {card.suggested_asset_description && !media.length && <details className="text-xs"><summary className="text-muted-foreground cursor-pointer">Suggested visual · not attached</summary><p className="mt-2">{card.suggested_asset_description}</p></details>}
    <p className="text-[11px] text-muted-foreground">Simulated preview · actual platform rendering may vary.</p>
  </section>;
}

export function NativePreviewDialog({ card, open, onOpenChange }: { card: PostCard; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)]">
    <DialogHeader><DialogTitle>Post preview</DialogTitle><DialogDescription className="capitalize">{card.platform} · {card.content_type}</DialogDescription></DialogHeader>
    {open && <NativePostPreview card={card} enabled={open} firstComment={card.first_comment ?? undefined} />}
  </DialogContent></Dialog>;
}