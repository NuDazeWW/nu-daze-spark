import { formatHashtags } from "@/lib/contentPresentation";
import { PipelineNav } from "@/components/queue/PipelineNav";
import { PlatformIcon, PlatformOption } from "@/components/layout/PlatformIcon";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PostNumber, StatusProgress, WhereIsIt, PostHistoryButton, useStatusDates, postLabel, matchesPostNumber } from "@/components/tracking/PostTracking";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePostCards, STATUS_META, type PostCard, type ApprovalStatus } from "@/hooks/usePostCards";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpenPlatformButton } from "@/components/posting/OpenPlatformButton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { PostingPackageDrawer } from "@/components/queue/PostingPackageDrawer";
import { BulkExportDialog } from "@/components/export/BulkExportDialog";
import {
  CheckCircle2, Search, AlertCircle, Copy, Hash, AtSign, Users,
  ArrowRight, Download, Check, Package, Send,
} from "lucide-react";


const VISIBLE_STATUSES: ApprovalStatus[] = ["approved", "exported", "posted"];

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export default function ApprovedContent() {
  const { cards, isLoading, error, updateStatus, isAdmin } = usePostCards();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const allDates = useStatusDates();
  const [params, setParams] = useSearchParams();
  const jumpId = params.get("post");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  useEffect(() => {
    if (!jumpId) return;
    const c = cards.find((x) => x.id === jumpId);
    if (!c) return;
    setSearch(postLabel(c)); setStatusFilter("all"); setPlatformFilter("all");
    setParams({}, { replace: true });
  }, [jumpId, cards, setParams]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [packageTab, setPackageTab] = useState<"package" | "publish">("package");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPicked, setExportPicked] = useState<string[] | undefined>();
  const packageCard = cards.find((c) => c.id === packageId) ?? null;

  // Only approved, exported, posted cards
  const approvedCards = useMemo(() => {
    let result = cards.filter((c) => VISIBLE_STATUSES.includes(c.approval_status));
    if (statusFilter !== "all") result = result.filter((c) => c.approval_status === statusFilter);
    if (platformFilter !== "all") result = result.filter((c) => c.platform === platformFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          matchesPostNumber(c, search) ||
          postLabel(c).toLowerCase().includes(q) ||
          c.draft_copy.toLowerCase().includes(q) ||
          (c.hashtags ?? []).some((h) => h.toLowerCase().includes(q)) ||
          (c.campaign_pillar ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [cards, statusFilter, platformFilter, search]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === approvedCards.length) setSelected(new Set());
    else setSelected(new Set(approvedCards.map((c) => c.id)));
  };

  const handleCopy = (text: string, label: string, cardId: string) => {
    copyToClipboard(text);
    setCopiedId(cardId + label);
    toast({ title: `${label} copied` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (id: string, status: ApprovalStatus) => {
    await updateStatus.mutateAsync({ id, status, itemType: "post" });
    toast({ title: `Marked as ${STATUS_META[status].label}` });
  };

  const handleBulkExport = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await updateStatus.mutateAsync({ id, status: "exported", itemType: "post" });
    }
    toast({ title: `${ids.length} card${ids.length !== 1 ? "s" : ""} marked as exported` });
    setSelected(new Set());
  };

  // Build export text for bulk download
  const handleBulkDownload = () => {
    const ids = Array.from(selected);
    const exportCards = approvedCards.filter((c) => ids.includes(c.id));
    const text = exportCards
      .map((c, i) => {
        const lines = [
          `--- Card ${i + 1} ---`,
          `Platform: ${c.platform}`,
          `Type: ${c.content_type}`,
          `Status: ${c.approval_status}`,
          "",
          c.draft_copy,
          "",
          `Hashtags: ${formatHashtags(c.hashtags)}`,
          `People Tags: ${(c.people_tags ?? []).join(", ")}`,
          `Org Tags: ${(c.org_tags ?? []).join(", ")}`,
        ];
        if (c.suggested_asset_description) lines.push(`Suggested Asset: ${c.suggested_asset_description}`);
        return lines.join("\n");
      })
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const now = new Date();
    a.download = `SocialMotive-export-${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast({ title: `${ids.length} card${ids.length !== 1 ? "s" : ""} exported as text file` });
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Approved Content" description="Finalized post cards ready for export and manual posting." />
        <div className="space-y-3 mt-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Approved Content" description="Finalized post cards ready for export and manual posting." />
        <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error.message}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Approved Content" description="Finalized post cards ready to publish, schedule or export." />
      <PipelineNav className="mt-4" />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mt-4 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search copy, hashtags…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {VISIBLE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <PlatformOption value="linkedin" />
            <PlatformOption value="instagram" />
            <PlatformOption value="facebook" />
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => { setExportPicked(undefined); setExportOpen(true); }}>
          <Package className="h-4 w-4 mr-1" /> Bulk export
        </Button>
      </div>
      <BulkExportDialog
        key={exportOpen ? "open" : "closed"}
        open={exportOpen}
        onOpenChange={setExportOpen}
        cards={cards.filter((c) => VISIBLE_STATUSES.includes(c.approval_status))}
        preselected={exportPicked}
        canMarkExported={isAdmin}
        onMarkExported={async (ids) => { for (const id of ids) await updateStatus.mutateAsync({ id, status: "exported", itemType: "post" }); setSelected(new Set()); }}
      />

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <Checkbox checked={selected.size === approvedCards.length} onCheckedChange={selectAll} />
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={handleBulkExport}>
              <ArrowRight className="h-3.5 w-3.5 mr-1" /> Mark Exported
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleBulkDownload}>
            <Download className="h-3.5 w-3.5 mr-1" /> Download .txt
          </Button>
          <Button size="sm" onClick={() => { setExportPicked(Array.from(selected)); setExportOpen(true); }}>
            <Package className="h-3.5 w-3.5 mr-1" /> Export package
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {approvedCards.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No approved content"
          description="Post cards that pass review and approval will appear here for copy and export."
        />
      ) : (
        <>
          {selected.size === 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={selectAll}>
                Select all ({approvedCards.length})
              </Button>
            </div>
          )}
          <div className="space-y-3">
            {approvedCards.map((card) => (
              <ApprovedCard
                key={card.id}
                card={card}
                isSelected={selected.has(card.id)}
                onToggleSelect={() => toggleSelect(card.id)}
                onCopy={handleCopy}
                copiedId={copiedId}
                onStatusChange={handleStatusChange}
                isAdmin={isAdmin}
                onOpenPackage={() => { setPackageTab("package"); setPackageId(card.id); }}
                onOpenPublish={() => { setPackageTab("publish"); setPackageId(card.id); }}
                statusDates={allDates[card.id]}
              />
            ))}
          </div>
        </>
      )}
      <PostingPackageDrawer
        initialTab={packageTab}
        card={packageCard}
        open={!!packageCard}
        onOpenChange={(o) => !o && setPackageId(null)}
        canExport={isAdmin}
        onMarkExported={(id) => handleStatusChange(id, "exported")}
      />
    </div>
  );
}

function ApprovedCard({
  card,
  isSelected,
  onToggleSelect,
  onCopy,
  copiedId,
  onStatusChange,
  isAdmin,
  onOpenPackage,
  onOpenPublish,
  statusDates,
}: {
  card: PostCard;
  isSelected: boolean;
  onToggleSelect: () => void;
  onCopy: (text: string, label: string, cardId: string) => void;
  copiedId: string | null;
  onStatusChange: (id: string, status: ApprovalStatus) => void;
  isAdmin: boolean;
  onOpenPackage: () => void;
  onOpenPublish: () => void;
  statusDates?: Partial<Record<ApprovalStatus, string>>;
}) {
  const meta = STATUS_META[card.approval_status];
  const hashtags = formatHashtags(card.hashtags);
  const peopleTags = (card.people_tags ?? []).join(", ");
  const orgTags = (card.org_tags ?? []).join(", ");

  const CopyBtn = ({ text, label, icon: Icon, id }: { text: string; label: string; icon: React.ElementType; id: string }) => {
    const isCopied = copiedId === card.id + label;
    return text ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => onCopy(text, label, card.id)}
          >
            {isCopied ? <Check className="h-3 w-3 text-brand-success" /> : <Icon className="h-3 w-3" />}
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Copy {label.toLowerCase()}</TooltipContent>
      </Tooltip>
    ) : null;
  };

  // Next status in the export workflow
  const nextStatus: ApprovalStatus | null =
    card.approval_status === "approved" ? "exported" :
    card.approval_status === "exported" ? "posted" : null;

  return (
    <Card data-status={card.approval_status} data-content-type="post" className={`sm-content-card transition-colors ${isSelected ? "ring-2 ring-primary/40" : ""}`}>
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="mt-1" />
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <PostNumber card={card} />
              <Badge variant="outline" className="sm-type sm-type-post">Post</Badge>
              <PlatformIcon platform={card.platform} className="h-4 w-4" />
              <span className="text-xs text-muted-foreground capitalize">{card.content_type}</span>
              <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
              {card.campaign_pillar && <Badge variant="secondary" className="text-[10px]">{card.campaign_pillar}</Badge>}
              <span className="flex-1" />
              <PostHistoryButton card={card} />
              <WhereIsIt card={card} here="approved" />
            </div>
            <StatusProgress card={card} dates={statusDates} />

            {/* Copy text */}
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{card.draft_copy}</p>

            {/* Tags preview */}
            {hashtags && (
              <div className="flex flex-wrap gap-1">
                {(card.hashtags ?? []).slice(0, 8).map((h) => (
                  <span key={h} className="text-[11px] text-primary/70">{h}</span>
                ))}
                {(card.hashtags ?? []).length > 8 && (
                  <span className="text-[11px] text-muted-foreground">+{(card.hashtags ?? []).length - 8}</span>
                )}
              </div>
            )}

            {card.suggested_asset_description && (
              <p className="text-[11px] text-muted-foreground italic">📷 {card.suggested_asset_description}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-border/30">
              <CopyBtn text={card.draft_copy} label="Copy" icon={Copy} id="copy" />
              <CopyBtn text={hashtags} label="Hashtags" icon={Hash} id="hashtags" />
              <CopyBtn text={peopleTags} label="People" icon={AtSign} id="people" />
              <CopyBtn text={orgTags} label="Orgs" icon={Users} id="orgs" />
              <OpenPlatformButton clientId={card.client_id} platform={card.platform} variant="ghost" />

              <div className="flex-1" />

              <Button size="sm" className="h-7 text-xs gap-1" onClick={onOpenPublish}>
                <Send className="h-3 w-3" /> Publish / Schedule
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onOpenPackage}>
                <Package className="h-3 w-3" /> Posting package
              </Button>

              {isAdmin && nextStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => onStatusChange(card.id, nextStatus)}
                >
                  <ArrowRight className="h-3 w-3" />
                  Mark {STATUS_META[nextStatus].label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
