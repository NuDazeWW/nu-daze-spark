import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExternalPostFormDialog } from "@/components/comments/ExternalPostFormDialog";
import { ScrapePostsDialog } from "@/components/comments/ScrapePostsDialog";
import { useExternalPosts } from "@/hooks/useExternalPosts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  CheckCircle2, Trash2, RefreshCw, Flame, TrendingUp, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

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
  safe: "Safe",
  review_needed: "Review Needed",
  blocked: "Blocked",
};

function EngagementBadge({ engagement }: { engagement: number }) {
  if (!engagement || engagement === 0) return null;
  let tier: string;
  let color: string;
  if (engagement >= 100) {
    tier = "🔥 Hot";
    color = "bg-brand-attention/15 text-brand-attention border-brand-attention/30";
  } else if (engagement >= 30) {
    tier = "📈 Rising";
    color = "bg-brand-warning/15 text-brand-warning border-brand-warning/30";
  } else {
    tier = "💬 Active";
    color = "bg-brand-signal/15 text-brand-signal border-brand-signal/30";
  }
  return (
    <Badge variant="outline" className={`text-[9px] ${color}`}>
      {tier}
    </Badge>
  );
}

function InlineComment({ comment, onSave, isSaving, onCopied, onRegenerate, isRegenerating }: {
  comment: { id: string; draft_copy: string; tone: string | null };
  onSave: (id: string, text: string) => void;
  isSaving: boolean;
  onCopied?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const [text, setText] = useState(comment.draft_copy);
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
    <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-primary/70 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Auto-generated comment
          {comment.tone && <Badge variant="secondary" className="text-[9px] h-4 ml-1">{comment.tone}</Badge>}
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
        rows={3}
        className="text-xs resize-none bg-muted/20 border-muted"
      />
    </div>
  );
}

type SortKey = "recent" | "relevance" | "engagement";

export default function CommentGenerator() {
  const {
    posts, isLoading, error,
    addPost, generateComments, scrapePosts,
    commentsMap, updateComment,
    markCommented, unmarkCommented,
    deletePost, bulkDelete, bulkMarkCommented,
    dailyTarget,
  } = useExternalPosts();

  const [formOpen, setFormOpen] = useState(false);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCommented, setShowCommented] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    let result = posts.filter((p) => {
      if (!showCommented && p.is_commented) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [p.author_name, p.topic, p.post_content, p.external_url]
          .filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });

    // Sort
    if (sortBy === "relevance") {
      result = [...result].sort((a, b) => (Number(b.relevance_score) || 0) - (Number(a.relevance_score) || 0));
    } else if (sortBy === "engagement") {
      result = [...result].sort((a, b) => (b.estimated_engagement || 0) - (a.estimated_engagement || 0));
    }
    // "recent" uses default order from query (created_at desc)

    return result;
  }, [posts, search, platformFilter, showCommented, sortBy]);

  const commentedCount = posts.filter((p) => p.is_commented).length;
  const eligibleForGeneration = filtered.filter((p) => p.risk_flag !== "blocked");

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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Comment Generator"
        description={`${posts.length} external post${posts.length !== 1 ? "s" : ""} curated · Select posts and generate AI comments.`}
      />

      {/* Daily target tracker */}
      {targetData && targetData.target > 0 && (
        <div className="mb-6 p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Daily Comment Target</span>
            </div>
            <span className="text-sm font-semibold text-primary">
              {targetData.completed}/{targetData.target}
            </span>
          </div>
          <Progress value={targetProgress} className="h-2" />
          {targetData.completed >= targetData.target && (
            <p className="text-[10px] text-brand-success mt-1.5">🎉 Daily target reached!</p>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…" className="pl-9" />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setScrapeOpen(true)}>
          <Radar className="mr-2 h-4 w-4" />Find Posts
        </Button>
        <Button variant="outline" onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Post
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Switch checked={showCommented} onCheckedChange={setShowCommented} id="show-commented" />
          <label htmlFor="show-commented" className="text-xs text-muted-foreground cursor-pointer">
            Show commented ({commentedCount})
          </label>
        </div>
      </div>

      {/* Selection bar */}
      {posts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg border bg-card">
          <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
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
                className="text-xs"
              >
                <CheckCircle2 className="mr-1.5 h-3 w-3" />
                Mark Done
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3 w-3" />
                Delete
              </Button>
            </>
          )}
          <Button
            onClick={handleGenerate}
            disabled={selectedIds.length === 0 || generateComments.isPending}
            size="sm"
          >
            {generateComments.isPending ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="mr-2 h-3.5 w-3.5" />Generate Comments ({selectedIds.length})</>
            )}
          </Button>
          <Link to="/queue">
            <Button variant="ghost" size="sm" className="text-xs">
              <ArrowRight className="mr-1.5 h-3 w-3" />Daily Queue
            </Button>
          </Link>
        </div>
      )}

      {/* Posts grid */}
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
                <Button variant="outline" onClick={() => setFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Add Manually
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((post) => {
            const isBlocked = post.risk_flag === "blocked";
            const isCommented = post.is_commented;
            const isSelected = selectedIds.includes(post.id);
            const RiskIcon = RISK_ICON[post.risk_flag];
            const comment = commentsMap[post.id];

            return (
              <Card
                key={post.id}
                className={`transition-colors ${isSelected ? "ring-1 ring-primary/40 bg-primary/5" : ""} ${isBlocked ? "opacity-50" : "cursor-pointer"} ${isCommented ? "opacity-60 border-brand-success/30" : ""}`}
                onClick={() => !isBlocked && !isCommented && toggleSelect(post.id)}
              >
                <CardHeader className="py-3 px-4 space-y-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      {!isBlocked && !isCommented && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(post.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                      )}
                      {isCommented ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={(e) => { e.stopPropagation(); unmarkCommented.mutate(post.id); }}
                            >
                              <CheckCircle2 className="h-4 w-4 text-brand-success" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Unmark — return to active queue</TooltipContent>
                        </Tooltip>
                      ) : !isBlocked && !comment ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={(e) => { e.stopPropagation(); markCommented.mutate(post.id); }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark as commented</TooltipContent>
                        </Tooltip>
                      ) : null}
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{post.platform}</Badge>
                      {post.topic && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">{post.topic}</Badge>
                      )}
                      <EngagementBadge engagement={post.estimated_engagement} />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Tooltip>
                        <TooltipTrigger>
                          <RiskIcon className={`h-3.5 w-3.5 ${RISK_COLOR[post.risk_flag]}`} />
                        </TooltipTrigger>
                        <TooltipContent>{RISK_LABEL[post.risk_flag]}</TooltipContent>
                      </Tooltip>
                      {post.relevance_score != null && (
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round(Number(post.relevance_score) * 100)}%
                        </Badge>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={post.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Open original post</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deletePost.mutate(post.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete post</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 space-y-2">
                  {post.author_name && (
                    <p className="text-xs font-medium">{post.author_name}</p>
                  )}
                  {post.post_content && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.post_content}</p>
                  )}
                  {post.recommended_comment_angle && (
                    <p className="text-[10px] text-primary/70 italic">💡 {post.recommended_comment_angle}</p>
                  )}
                  {post.risk_notes && (
                    <p className="text-[10px] text-brand-warning/70">⚠️ {post.risk_notes}</p>
                  )}

                  {comment && (
                    <InlineComment
                      comment={comment}
                      onSave={handleCommentSave}
                      isSaving={updateComment.isPending}
                      onCopied={() => !isCommented && markCommented.mutate(post.id)}
                      onRegenerate={() => handleRegenerate(post.id)}
                      isRegenerating={generateComments.isPending}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
