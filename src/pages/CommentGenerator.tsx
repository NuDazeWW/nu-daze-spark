import { useState, useMemo, useEffect } from "react";
import { copyThenOpen } from "@/lib/openInNewTab";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExternalPostFormDialog } from "@/components/comments/ExternalPostFormDialog";
import { ScrapePostsDialog } from "@/components/comments/ScrapePostsDialog";
import { useExternalPosts, type ExternalPost } from "@/hooks/useExternalPosts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare, Plus, Sparkles, Search, AlertCircle, ExternalLink,
  Shield, AlertTriangle, ShieldOff, Loader2, ArrowRight, Radar, Copy, Check,
  CheckCircle2, Trash2, RefreshCw, TrendingUp, ArrowUpDown, Inbox, Clock,
  Star, AtSign, PenSquare, ChevronRight, Target, Gauge, Users, UsersRound,
  Send, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { AuthorDetails } from "@/components/comments/AuthorDetails";
import { authorContextSearch } from "@/lib/authorContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PlatformIcon } from "@/components/layout/PlatformIcon";

const RISK_ICON = {
  safe: Shield,
  review_needed: AlertTriangle,
  blocked: ShieldOff,
};

const RISK_COLOR = {
  safe: "text-brand-success",
  review_needed: "text-brand-warning",
  blocked: "text-destructive",
};

const RISK_LABEL = {
  safe: "No brand risks flagged",
  review_needed: "Review Needed",
  blocked: "Blocked",
};

function EngagementBadge({ engagement }: { engagement: number }) {
  if (!engagement || engagement === 0) return null;
  let tier: string;
  let color: string;
  if (engagement >= 100) {
    tier = "Hot";
    color = "bg-brand-attention/15 text-brand-attention border-brand-attention/30";
  } else if (engagement >= 30) {
    tier = "Rising";
    color = "bg-brand-warning/15 text-brand-warning border-brand-warning/30";
  } else {
    tier = "Active";
    color = "bg-brand-signal/15 text-brand-signal border-brand-signal/30";
  }
  return (
    <Badge variant="outline" className={`text-[9px] ${color}`} title="Estimated engagement on the original post (likes, comments and shares), from the import. Not a live count.">
      {tier} · {engagement} est. engagement
    </Badge>
  );
}

function InlineComment({ comment, onSave, isSaving, onCopied, onRegenerate, isRegenerating, postUrl, onSendForReview, isSendingForReview }: {
  postUrl?: string | null;
  comment: { id: string; draft_copy: string; tone: string | null; approval_status?: string };
  onSave: (id: string, text: string) => void;
  isSaving: boolean;
  onCopied?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onSendForReview?: () => void;
  isSendingForReview?: boolean;
}) {
  const [text, setText] = useState(comment.draft_copy);
  const workspace = useWorkspace();
  const [copied, setCopied] = useState(false);
  const dirty = text !== comment.draft_copy;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Comment copied to clipboard");
    onCopied?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(comment.id, text);
  };

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-[10px] font-medium text-primary/70 flex items-center gap-1 whitespace-nowrap shrink-0">
          <Sparkles className="h-3 w-3 shrink-0" /> AI reply suggestion
          {comment.tone && <Badge variant="secondary" className="text-[9px] h-4 ml-1 whitespace-nowrap">{comment.tone}</Badge>}
        </span>
        <div className="flex items-center gap-1">
          {dirty && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          )}
          {onRegenerate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onRegenerate(); }} disabled={isRegenerating}>
                  <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate comment</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-brand-success" /> : <Copy className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy comment</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="text-xs resize-none bg-muted/20 border-muted"
        placeholder="Edit or write your response…"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={!dirty || isSaving} onClick={handleSave}>
          Save draft
        </Button>
        {onSendForReview && (
          comment.approval_status === "in_review" ? (
            <Badge variant="secondary" className="h-7 px-2 text-[11px] gap-1 whitespace-nowrap">
              <ShieldCheck className="h-3 w-3" />Pending Executive Review
            </Badge>
          ) : (
            <Button variant="outline" size="sm" className="h-7 text-[11px] whitespace-nowrap"
              disabled={isSendingForReview || dirty || !workspace.canCreate || !workspace.settings?.executive_review_enabled}
              title={dirty ? "Save your edits first" : "Send this comment to the Executive Review queue"}
              onClick={(e) => { e.stopPropagation(); onSendForReview(); }}>
              <Send className="h-3 w-3 mr-1" />{isSendingForReview ? "Sending…" : "Send for Executive Review"}
            </Button>
          )
        )}
        <Button size="sm" className="h-7 text-[11px] sm-cg-approve" disabled={!postUrl}
          title={postUrl ? "Copy the comment and open the original post" : "No link saved for this post"}
          onClick={(e) => { e.stopPropagation(); if (!postUrl) return; copyThenOpen(text, postUrl).then((ok) => { if (ok) toast.success("Comment copied — paste it on the post", { description: "Copying doesn't post it. Mark it commented once it's live." }); }); onCopied?.(); }}>
          <ExternalLink className="h-3 w-3 mr-1" />Copy & open post
        </Button>
      </div>
    </div>
  );
}

type SortKey = "recent" | "relevance" | "engagement";
type InboxFilter = "all" | "needs_response" | "high_impact" | "review_needed" | "commented";

function authorInitials(name: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// Deterministic accent per author so each avatar reads as a distinct person.
const AVATAR_ACCENTS = ["cyan", "violet", "magenta", "gold", "lime"] as const;
function authorAccent(name: string | null) {
  if (!name) return AVATAR_ACCENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_ACCENTS[hash % AVATAR_ACCENTS.length];
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export default function CommentGenerator() {
  const { canCreate } = useWorkspace();
  const {
    posts, isLoading, error,
    addPost, generateComments, scrapePosts, updateAuthorContext,
    commentsMap, updateComment, sendCommentForReview,
    markCommented, unmarkCommented,
    deletePost, bulkDelete, bulkMarkCommented,
    dailyTarget,
  } = useExternalPosts();

  const [formOpen, setFormOpen] = useState(false);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCommented, setShowCommented] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = posts.filter((p) => {
      if (!showCommented && p.is_commented) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      if (inboxFilter === "needs_response" && (p.is_commented || p.risk_flag === "blocked")) return false;
      if (inboxFilter === "high_impact" && !(Number(p.relevance_score) >= 0.7)) return false;
      if (inboxFilter === "review_needed" && p.risk_flag !== "review_needed") return false;
      if (inboxFilter === "commented" && !p.is_commented) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [p.author_name, p.topic, p.post_content, p.external_url, authorContextSearch(p.author_context)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === "relevance") {
      result = [...result].sort((a, b) => (Number(b.relevance_score) || 0) - (Number(a.relevance_score) || 0));
    } else if (sortBy === "engagement") {
      result = [...result].sort((a, b) => (b.estimated_engagement || 0) - (a.estimated_engagement || 0));
    }

    return result;
  }, [posts, search, platformFilter, inboxFilter, showCommented, sortBy]);

  const commentedCount = posts.filter((p) => p.is_commented).length;
  const needsResponse = posts.filter((p) => !p.is_commented && p.risk_flag !== "blocked").length;
  const highImpact = posts.filter((p) => Number(p.relevance_score) >= 0.7).length;
  const reviewNeeded = posts.filter((p) => p.risk_flag === "review_needed").length;
  const totalComments = Object.keys(commentsMap).length;
  const eligibleForGeneration = filtered.filter((p) => p.risk_flag !== "blocked");
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of posts) counts[p.platform] = (counts[p.platform] || 0) + 1;
    return counts;
  }, [posts]);

  const activePost: ExternalPost | null = useMemo(
    () => posts.find((p) => p.id === activeId) ?? null,
    [posts, activeId],
  );
  const activeComment = activePost ? commentsMap[activePost.id] : undefined;

  // Auto-select the first visible post so the detail panel is never empty.
  useEffect(() => {
    if (!activePost && filtered.length > 0) setActiveId(filtered[0].id);
  }, [activePost, filtered]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const eligibleIds = eligibleForGeneration.map((p) => p.id);
    const allSelected = eligibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : eligibleIds);
  };

  const handleGenerate = () => {
    if (selectedIds.length === 0) return;
    generateComments.mutate(selectedIds, {
      onSuccess: () => setSelectedIds([]),
    });
  };

  const handleRegenerate = (postId: string) => {
    generateComments.mutate([postId]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => setSelectedIds([]),
    });
  };

  const handleBulkMarkCommented = () => {
    if (selectedIds.length === 0) return;
    bulkMarkCommented.mutate(selectedIds, {
      onSuccess: () => setSelectedIds([]),
    });
  };

  const handleCommentSave = (commentId: string, draft_copy: string) => {
    updateComment.mutate({ id: commentId, draft_copy });
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Comment Generator" description="Curate external posts and generate engagement comments with AI." />
        <div className="space-y-3 py-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Comment Generator" description="Curate external posts and generate engagement comments with AI." />
        <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error.message}</AlertDescription></Alert>
      </div>
    );
  }

  const targetData = dailyTarget;
  const targetProgress = targetData ? Math.min((targetData.completed / Math.max(targetData.target, 1)) * 100, 100) : 0;

  // Icon set mirrors the design mock: bubble, group, @-mention, community.
  const kpis = [
    { label: "Needs Response", value: needsResponse, icon: MessageSquare, accent: "cyan", filter: "needs_response" as InboxFilter },
    { label: "High relevance", value: highImpact, icon: Users, accent: "lime", filter: "high_impact" as InboxFilter },
    { label: "Review Needed", value: reviewNeeded, icon: AtSign, accent: "magenta", filter: "review_needed" as InboxFilter },
    { label: "Total Comments", value: totalComments, icon: UsersRound, accent: "gold", filter: "all" as InboxFilter },
  ];

  const inboxItems: { key: InboxFilter; label: string; count: number; icon: typeof Inbox }[] = [
    { key: "all", label: "All Comments", count: posts.length, icon: Inbox },
    { key: "needs_response", label: "Needs Response", count: needsResponse, icon: Clock },
    { key: "high_impact", label: "High relevance", count: highImpact, icon: Star },
    { key: "review_needed", label: "Review Needed", count: reviewNeeded, icon: AlertTriangle },
    { key: "commented", label: "Commented", count: commentedCount, icon: CheckCircle2 },
  ];

  return (
    <div className="sm-reference sm-comments animate-fade-in">
      <PageHeader
        title="Comment Generator"
        description="Find, prioritize, and respond to the conversations that matter."
      >
        <Button variant="outline" onClick={() => setScrapeOpen(true)}>
          <Radar className="mr-2 h-4 w-4" />Find Posts
        </Button>
        {canCreate && (
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Add Post
          </Button>
        )}
      </PageHeader>

      {/* KPI cards */}
      <div className="sm-cg-kpis grid gap-3 grid-cols-2 xl:grid-cols-4 mb-5">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            data-accent={k.accent}
            className={`sm-cg-kpi ${inboxFilter === k.filter && (k.filter !== "all" || inboxFilter === "all") && inboxFilter === k.filter ? "is-active" : ""}`}
            onClick={() => setInboxFilter(k.filter)}
          >
            <span className="sm-cg-kpi-icon lg-icon-well" data-accent={k.accent}>
              <k.icon />
            </span>
            <span className="sm-cg-kpi-text">
              <span className="sm-cg-kpi-value">{k.value}</span>
              <span className="sm-cg-kpi-label">{k.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="sm-cg-grid">
        {/* Inbox rail */}
        <aside className="sm-cg-inbox lg-card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="sm-cg-rail-title">Inbox</h2>
            {canCreate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormOpen(true)}>
                    <PenSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add a post manually</TooltipContent>
              </Tooltip>
            )}
          </div>
          <nav className="space-y-1">
            {inboxItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`sm-cg-inbox-item ${inboxFilter === item.key ? "is-active" : ""}`}
                onClick={() => setInboxFilter(item.key)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                <span className="sm-cg-count">{item.count}</span>
              </button>
            ))}
          </nav>

          <h3 className="sm-cg-rail-title mt-5">Channels</h3>
          <nav className="space-y-1">
            <button
              type="button"
              className={`sm-cg-inbox-item ${platformFilter === "all" ? "is-active" : ""}`}
              onClick={() => setPlatformFilter("all")}
            >
              <Inbox className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">All Channels</span>
              <span className="sm-cg-count">{posts.length}</span>
            </button>
            {["linkedin", "instagram", "facebook"].map((pl) => (
              <button
                key={pl}
                type="button"
                className={`sm-cg-inbox-item ${platformFilter === pl ? "is-active" : ""}`}
                onClick={() => setPlatformFilter(pl)}
              >
                <PlatformIcon platform={pl} className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate capitalize">{pl}</span>
                <span className="sm-cg-count">{platformCounts[pl] || 0}</span>
              </button>
            ))}
          </nav>

          <div className="mt-5 flex items-center gap-2">
            <Switch checked={showCommented} onCheckedChange={setShowCommented} id="show-commented" />
            <label htmlFor="show-commented" className="text-xs text-muted-foreground cursor-pointer">
              Show commented ({commentedCount})
            </label>
          </div>

          {targetData && targetData.target > 0 && (
            <div className="mt-5 pt-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" /> Daily target
                </span>
                <span className="text-xs font-semibold text-primary">
                  {targetData.completed}/{targetData.target}
                </span>
              </div>
              <Progress value={targetProgress} className="h-1.5" />
              {targetData.completed >= targetData.target && (
                <p className="text-[10px] text-brand-success mt-1.5">Daily target reached!</p>
              )}
            </div>
          )}
        </aside>

        {/* Comments feed */}
        <section className="sm-cg-feed lg-card">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="sm-cg-rail-title mr-auto">Comments ({filtered.length})</h2>
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…" className="pl-8 h-8 text-xs" />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection bar */}
          {posts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-lg border border-border/50 bg-background/40">
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                {eligibleForGeneration.length > 0 && eligibleForGeneration.every((p) => selectedIds.includes(p.id))
                  ? "Deselect All"
                  : `Select All (${eligibleForGeneration.length})`
                }
              </Button>
              <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
              <div className="flex-1" />
              {selectedIds.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkCommented}
                    disabled={bulkMarkCommented.isPending}
                    className="text-xs h-7"
                  >
                    <CheckCircle2 className="mr-1.5 h-3 w-3" />
                    Mark as commented
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDelete.isPending}
                    className="text-xs h-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3 w-3" />
                    Delete
                  </Button>
                </>
              )}
              <span className="text-[11px] text-muted-foreground">{selectedIds.length ? `${selectedIds.length} post${selectedIds.length === 1 ? "" : "s"} selected` : "Select one or more posts to generate comment drafts."}</span>
              <Button
                onClick={handleGenerate}
                disabled={selectedIds.length === 0 || generateComments.isPending}
                size="sm"
                className="h-7 text-xs lg-btn"
                data-accent="cyan"
              >
                {generateComments.isPending ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating…</>
                ) : (
                  <><Sparkles className="mr-2 h-3.5 w-3.5" />Generate Comment Drafts</>
                )}
              </Button>
              <Link to="/queue">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <ArrowRight className="mr-1.5 h-3 w-3" />Daily Queue
                </Button>
              </Link>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={posts.length === 0 ? "No external posts yet" : "No matching posts"}
              description={
                posts.length === 0
                  ? "Find relevant industry posts or add them manually to generate AI-powered engagement comments."
                  : "Try adjusting your search or filter."
              }
              action={
                posts.length === 0 ? (
                  <div className="flex gap-2">
                    <Button onClick={() => setScrapeOpen(true)}>
                      <Radar className="mr-2 h-4 w-4" />Find Posts
                    </Button>
                    {canCreate && (
                      <Button variant="outline" onClick={() => setFormOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />Add Manually
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2.5">
              {filtered.map((post) => {
                const isBlocked = post.risk_flag === "blocked";
                const isCommented = post.is_commented;
                const isSelected = selectedIds.includes(post.id);
                const isActive = activeId === post.id;
                const RiskIcon = RISK_ICON[post.risk_flag];

                return (
                  <article
                    key={post.id}
                    className={`sm-cg-comment ${isActive ? "is-active" : ""} ${isSelected ? "is-checked" : ""} ${isBlocked ? "opacity-50" : "cursor-pointer"} ${isCommented ? "opacity-70" : ""}`}
                    onClick={() => setActiveId(post.id)}
                  >
                    <div className="flex items-start gap-3">
                      {!isBlocked && !isCommented && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(post.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 mt-1"
                        />
                      )}
                      <span className="sm-cg-avatar shrink-0" data-accent={authorAccent(post.author_name)}>
                        {authorInitials(post.author_name)}
                        <span className="sm-cg-avatar-badge">
                          <PlatformIcon platform={post.platform} className="h-2.5 w-2.5" />
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{post.author_name || "Author not provided"}</span>
                          <span className="text-[10px] text-muted-foreground capitalize shrink-0">{post.platform}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{timeAgo(post.created_at)}</span>
                        </div>
                        {post.post_content && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{post.post_content}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {post.topic && (
                            <Badge variant="secondary" className="text-[9px]">{post.topic}</Badge>
                          )}
                          <Badge variant="outline" title="Automated scan against your brand guardrails and banned phrases. Not a guarantee — read before posting." className={`text-[9px] ${RISK_COLOR[post.risk_flag]}`}>
                            <RiskIcon className="h-2.5 w-2.5 mr-1" />{RISK_LABEL[post.risk_flag]}
                          </Badge>
                          <EngagementBadge engagement={post.estimated_engagement} />
                          {isCommented && (
                            <Badge variant="outline" className="text-[9px] text-brand-success border-brand-success/30">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Commented
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2.5 ml-auto"
                            onClick={(e) => { e.stopPropagation(); setActiveId(post.id); }}
                          >
                            Reply
                          </Button>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Detail / reply panel */}
        <aside className="sm-cg-detail lg-card">
          {!activePost ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Select a conversation to review it and draft a reply.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Original post */}
              <div className="sm-cg-detail-post">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="sm-cg-avatar sm-cg-avatar-sm shrink-0" data-accent={authorAccent(activePost.author_name)}>
                      {authorInitials(activePost.author_name)}
                      <span className="sm-cg-avatar-badge">
                        <PlatformIcon platform={activePost.platform} className="h-2.5 w-2.5" />
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{activePost.author_name || "Author not provided"}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{activePost.platform} · {timeAgo(activePost.created_at)}</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-7 text-[11px] shrink-0">
                    <a href={activePost.external_url} target="_blank" rel="noopener noreferrer">
                      View post <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
                {activePost.post_content && (
                  <p className="text-xs text-muted-foreground">{activePost.post_content}</p>
                )}
              </div>

              {/* Signals */}
              <div className="grid grid-cols-3 gap-2">
                <div className="sm-cg-signal">
                  <span className="sm-cg-signal-label">Risk</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${RISK_COLOR[activePost.risk_flag]}`}>
                    {(() => { const RiskIcon = RISK_ICON[activePost.risk_flag]; return <RiskIcon className="h-3.5 w-3.5" />; })()}
                    {RISK_LABEL[activePost.risk_flag]}
                  </span>
                </div>
                <div className="sm-cg-signal">
                  <span className="sm-cg-signal-label">Relevance</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Gauge className="h-3.5 w-3.5" />
                    {activePost.relevance_score != null ? `${Math.round(Number(activePost.relevance_score) * 100)}%` : "—"}
                  </span>
                </div>
                <div className="sm-cg-signal">
                  <span className="sm-cg-signal-label" title="Estimated likes, comments and shares recorded at import; not a live count.">Estimated interactions</span>
                  <span className="flex items-center gap-1 text-xs font-medium">
                    <TrendingUp className="h-3.5 w-3.5 text-brand-warning" />
                    {activePost.estimated_engagement || "—"}
                  </span>
                </div>
              </div>

              {activePost.recommended_comment_angle && (
                <div className="sm-cg-next-move">
                  <p className="text-[11px] font-semibold flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5" /> Recommended next move
                  </p>
                  <p className="text-xs text-muted-foreground">{activePost.recommended_comment_angle}</p>
                </div>
              )}

              {activePost.risk_notes && (
                <p className="text-[10px] text-brand-warning/80">⚠️ {activePost.risk_notes}</p>
              )}

              {/* Author context */}
              <div className="sm-cg-detail-post">
                <AuthorDetails name={activePost.author_name} context={activePost.author_context} platform={activePost.platform}
                  onSave={context => updateAuthorContext.mutateAsync({ id: activePost.id, context })}
                  isPending={updateAuthorContext.isPending} />
              </div>

              {/* AI reply */}
              <div className="sm-cg-reply">
                <p className="text-[11px] font-semibold flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Reply Suggestion
                </p>
                {activeComment ? (
                  <InlineComment
                    postUrl={activePost.external_url}
                    comment={activeComment}
                    onSave={handleCommentSave}
                    isSaving={updateComment.isPending}
                    onCopied={() => toast.info("Copying does not post this comment. Confirm it separately after posting.")}
                    onRegenerate={() => handleRegenerate(activePost.id)}
                    isRegenerating={generateComments.isPending}
                    onSendForReview={() => sendCommentForReview.mutate(activeComment.id)}
                    isSendingForReview={sendCommentForReview.isPending}
                  />
                ) : activePost.risk_flag === "blocked" ? (
                  <p className="text-xs text-muted-foreground">This post is blocked from comment generation.</p>
                ) : (
                  <Button
                    size="sm"
                    className="w-full lg-btn"
                    data-accent="cyan"
                    disabled={generateComments.isPending || !canCreate}
                    onClick={() => handleRegenerate(activePost.id)}
                  >
                    {generateComments.isPending ? (
                      <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating…</>
                    ) : (
                      <><Sparkles className="mr-2 h-3.5 w-3.5" />Generate comment</>
                    )}
                  </Button>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {activePost.is_commented ? (
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => unmarkCommented.mutate(activePost.id)}>
                    <RefreshCw className="mr-1.5 h-3 w-3" />Return to queue
                  </Button>
                ) : activePost.risk_flag !== "blocked" && !!activeComment ? (
                  <Button variant="outline" size="sm" className="text-xs h-7" disabled={markCommented.isPending || !canCreate} onClick={() => markCommented.mutate(activePost.id)}>
                    <CheckCircle2 className="mr-1.5 h-3 w-3" />Mark as commented
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-destructive hover:text-destructive ml-auto"
                  onClick={() => deletePost.mutate(activePost.id)}
                >
                  <Trash2 className="mr-1.5 h-3 w-3" />Delete
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <ExternalPostFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={(post) => {
          addPost.mutate(post, { onSuccess: () => setFormOpen(false) });
        }}
        isPending={addPost.isPending}
      />

      <ScrapePostsDialog
        open={scrapeOpen}
        onOpenChange={setScrapeOpen}
        onScrape={(params) => {
          scrapePosts.mutate(params, { onSuccess: () => setScrapeOpen(false) });
        }}
        isPending={scrapePosts.isPending}
      />
    </div>
  );
}
