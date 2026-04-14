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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare, Plus, Sparkles, Search, AlertCircle, ExternalLink,
  Shield, AlertTriangle, ShieldOff, Loader2, ArrowRight, Radar, Copy, Check,
  Eye, EyeOff, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const RISK_ICON = {
  safe: Shield,
  review_needed: AlertTriangle,
  blocked: ShieldOff,
};

const RISK_COLOR = {
  safe: "text-emerald-400",
  review_needed: "text-amber-400",
  blocked: "text-destructive",
};

const RISK_LABEL = {
  safe: "Safe",
  review_needed: "Review Needed",
  blocked: "Blocked",
};

function InlineComment({ comment, onSave, isSaving, onCopied }: {
  comment: { id: string; draft_copy: string; tone: string | null };
  onSave: (id: string, text: string) => void;
  isSaving: boolean;
  onCopied?: () => void;
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
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

export default function CommentGenerator() {
  const { posts, isLoading, error, addPost, generateComments, scrapePosts, commentsMap, updateComment, markCommented } = useExternalPosts();

  const [formOpen, setFormOpen] = useState(false);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCommented, setShowCommented] = useState(false);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (!showCommented && (p as any).is_commented) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [p.author_name, p.topic, p.post_content, p.external_url]
          .filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [posts, search, platformFilter, showCommented]);

  const commentedCount = posts.filter((p) => (p as any).is_commented).length;

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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Comment Generator"
        description={`${posts.length} external post${posts.length !== 1 ? "s" : ""} curated · Select posts and generate AI comments.`}
      />

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
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border bg-card">
          <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
            {eligibleForGeneration.length > 0 && eligibleForGeneration.every((p) => selectedIds.includes(p.id))
              ? "Deselect All"
              : `Select All (${eligibleForGeneration.length})`
            }
          </Button>
          <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
          <div className="flex-1" />
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
            const isCommented = (post as any).is_commented;
            const isSelected = selectedIds.includes(post.id);
            const RiskIcon = RISK_ICON[post.risk_flag];
            const comment = commentsMap[post.id];

            return (
              <Card
                key={post.id}
                className={`transition-colors ${isSelected ? "ring-1 ring-primary/40 bg-primary/5" : ""} ${isBlocked ? "opacity-50" : "cursor-pointer"} ${isCommented ? "opacity-60 border-emerald-500/30" : ""}`}
                onClick={() => !isBlocked && !isCommented && toggleSelect(post.id)}
              >
                <CardHeader className="py-3 px-4 space-y-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {!isBlocked && !isCommented && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(post.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                      )}
                      {isCommented && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{post.platform}</Badge>
                      {post.topic && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">{post.topic}</Badge>
                      )}
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
                    <p className="text-[10px] text-amber-400/70">⚠️ {post.risk_notes}</p>
                  )}

                  {/* Inline editable auto-generated comment */}
                  {comment && (
                    <InlineComment
                      comment={comment}
                      onSave={handleCommentSave}
                      isSaving={updateComment.isPending}
                      onCopied={() => !isCommented && markCommented.mutate(post.id)}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add post dialog */}
      <ExternalPostFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={(post) => {
          addPost.mutate(post, { onSuccess: () => setFormOpen(false) });
        }}
        isPending={addPost.isPending}
      />

      {/* Scrape posts dialog */}
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
