import { useState } from "react";
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
import {
  Sparkles, FolderOpen, Image, Video, FileText, X, Loader2,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  image: Image, video: Video,
};

export default function PostGenerator() {
  const { user } = useAuth();
  const { assets } = useAssets();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [platform, setPlatform] = useState<"instagram" | "linkedin">("instagram");
  const [contentType, setContentType] = useState<string>("reel");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);

  const selectedAssets = assets.filter((a) => selectedAssetIds.includes(a.id));

  const handleGenerate = async () => {
    if (!user || selectedAssetIds.length === 0) return;
    setIsGenerating(true);
    setGeneratedCount(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-reels", {
        body: { asset_ids: selectedAssetIds },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedCount(data.count ?? selectedAssetIds.length);
      queryClient.invalidateQueries({ queryKey: ["post_cards"] });
      toast({
        title: `${data.count} post card${data.count !== 1 ? "s" : ""} generated`,
        description: "Draft post cards are ready for review in the Daily Queue.",
      });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Post Generator"
        description="Select source assets and generate structured post cards with AI."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main area */}
        <div className="space-y-6">
          {/* Source assets selection */}
          <Card>
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
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No assets selected. Browse the library to pick source content.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedAssets.map((asset) => {
                    const Icon = ICON_MAP[asset.asset_type] ?? FileText;
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 p-2.5 rounded-md border"
                      >
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
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
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

          {/* Result */}
          {generatedCount !== null && (
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
          )}
        </div>

        {/* Sidebar config */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as "instagram" | "linkedin")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
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

              {isGenerating && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Generating with AI…</p>
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
