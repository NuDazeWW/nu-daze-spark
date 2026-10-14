import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { AssetPickerDialog } from "@/components/assets/AssetPickerDialog";
import { useAssets } from "@/hooks/useAssets";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { prepareAssetMedia } from "@/lib/prepareAssetMedia";
import {
  Sparkles, FolderOpen, Image, Video, FileText, X, Loader2, Info, ExternalLink, AtSign, Users, Eye,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  image: Image, video: Video,
};

interface GeneratedCard {
  platform: string;
  content_type: string;
  draft_copy: string;
  hashtags: string[];
  people_tags: string[];
  org_tags: string[];
  rationale: string;
  objective: string;
  audience: string;
}

export default function PostGenerator() {
  const { user } = useAuth();
  const { assets } = useAssets();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [platform, setPlatform] = useState<"instagram" | "linkedin" | "facebook">("instagram");
  const [contentType, setContentType] = useState<string>("reel");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [analyzeVisually, setAnalyzeVisually] = useState(true);
  const [prepStage, setPrepStage] = useState<string>("");

  // Pre-select asset from URL param
  useEffect(() => {
    const assetId = searchParams.get("asset");
    if (assetId && assets.length > 0) {
      setSelectedAssetIds((prev) => prev.includes(assetId) ? prev : [...prev, assetId]);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, assets]);

  const selectedAssets = assets.filter((a) => selectedAssetIds.includes(a.id));

  // Collect all contributors from selected assets for display
  const allContributors = [...new Set(selectedAssets.flatMap((a) => a.contributors || []))];

  const handleGenerate = async () => {
    if (!user || selectedAssetIds.length === 0) return;
    setIsGenerating(true);
    setGeneratedCount(null);
    setGeneratedCards([]);
    setPrepStage("");

    try {
      let media: { asset_id: string; images: string[] }[] = [];
      if (analyzeVisually) {
        setPrepStage("Preparing media for visual analysis…");
        media = await prepareAssetMedia(selectedAssets, { videoFrames: 3 });
      }

      setPrepStage("Generating with AI…");
      const { data, error } = await supabase.functions.invoke("generate-reels", {
        body: {
          asset_ids: selectedAssetIds,
          platform,
          content_type: contentType,
          analyze_visually: analyzeVisually,
          media,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const count = data.count ?? selectedAssetIds.length;
      setGeneratedCount(count);

      if (data.results && Array.isArray(data.results)) {
        setGeneratedCards(data.results.map((r: any) => ({
          platform: r.platform || platform,
          content_type: r.content_type || contentType,
          draft_copy: r.draft_copy || "",
          hashtags: r.hashtags || [],
          people_tags: r.people_tags || [],
          org_tags: r.org_tags || [],
          rationale: r.rationale || "",
          objective: r.objective || "",
          audience: r.audience || "",
        })));
      }

      queryClient.invalidateQueries({ queryKey: ["post_cards"] });
      toast({
        title: `${count} post card${count !== 1 ? "s" : ""} generated`,
        description: analyzeVisually
          ? "AI analyzed the media visually. Review drafts in the Daily Queue."
          : "Draft post cards are ready for review in the Daily Queue.",
      });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setPrepStage("");
    }
  };

  return (
    <div className="sm-reference sm-generator animate-fade-in">
      <PageHeader
        title="Social Post Generator"
        description="Select source assets and generate structured post cards with AI."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main area */}
        <div className="space-y-6">
          {/* Source assets selection */}
          <Card className="sm-generator-sources">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Source Assets
                <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Browse Library
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAssets.length === 0 ? (
                <div className="sm-source-empty text-center py-16 text-sm text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No assets selected. Browse the library to pick source content.</p>
                </div>
              ) : (
                <div className="sm-source-list space-y-3">
                  {selectedAssets.map((asset) => {
                    const Icon = ICON_MAP[asset.asset_type] ?? FileText;
                    return (
                      <div key={asset.id} className="flex items-center gap-3 p-2.5 rounded-md border">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{asset.title}</p>
                          {asset.description && (
                            <p className="text-xs text-muted-foreground truncate">{asset.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                          {asset.asset_type.replace("_", " ")}
                        </Badge>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                          onClick={() => setSelectedAssetIds((prev) => prev.filter((id) => id !== asset.id))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tag accounts preview from selected assets */}
          {allContributors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-primary" />
                  Tag Accounts
                  <span className="text-xs text-muted-foreground font-normal">(from selected assets)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {allContributors.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3 shrink-0" />
                  These tags will be included in generated post cards as people tags.{" "}
                  <Link to="/settings/tags" className="underline inline-flex items-center gap-0.5 hover:text-primary">
                    Manage tags <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Generated results */}
          {generatedCount !== null && (
            <div className="space-y-4">
              <Card className="border-primary/30">
                <CardContent className="pt-6 text-center">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">
                    {generatedCount} draft post card{generatedCount !== 1 ? "s" : ""} created!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Head to the Daily Queue to review and approve them.
                  </p>
                </CardContent>
              </Card>

              {/* Show generated card details with Tag accounts field */}
              {generatedCards.map((card, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Generated Card {idx + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{card.platform}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{card.content_type}</Badge>
                    </div>
                    {card.draft_copy && (
                      <p className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-muted/30">{card.draft_copy}</p>
                    )}
                    {card.people_tags.length > 0 && (
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1">
                          <Users className="h-3 w-3" /> Tag Accounts
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {card.people_tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {card.hashtags.length > 0 && (
                      <div>
                        <Label className="text-xs mb-1 block">Hashtags</Label>
                        <p className="text-xs text-muted-foreground">{card.hashtags.join(" ")}</p>
                      </div>
                    )}
                    {card.rationale && (
                      <div>
                        <Label className="text-xs mb-1 block">Rationale</Label>
                        <p className="text-xs text-muted-foreground">{card.rationale}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar config */}
        <div className="sm-generation-settings space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as "instagram" | "linkedin" | "facebook")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem><SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="analyze-visually" className="text-xs flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-primary" /> Analyze media visually
                    </Label>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      AI looks at the actual image{selectedAssets.some(a => a.asset_type === "video") ? " or samples 3 video frames" : ""} so copy references what's in it. Strategy rules still apply.
                    </p>
                  </div>
                  <Switch
                    id="analyze-visually"
                    checked={analyzeVisually}
                    onCheckedChange={setAnalyzeVisually}
                  />
                </div>
              </div>

              {/* Reminder about account tags */}
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" />
                Need another account tag?{" "}
                <Link to="/settings/tags" className="underline inline-flex items-center gap-0.5 hover:text-primary">
                  Sidebar → Account Tags <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </p>

              {isGenerating && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{prepStage || "Generating with AI…"}</p>
                  <Progress value={undefined} className="animate-pulse" />

                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={selectedAssetIds.length === 0 || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Generate Post Cards ({selectedAssetIds.length})</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AssetPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={selectedAssetIds}
        onSelect={setSelectedAssetIds}
      />
    </div>
  );
}
