import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { Search, Image, Video, FileText, Check, LayoutGrid, List } from "lucide-react";
import { useAssets } from "@/hooks/useAssets";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";

const ICON_MAP: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
};

type MediaFilter = "all" | "image" | "video" | "document";

interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string[];
  onSelect: (assetIds: string[]) => void;
  multiple?: boolean;
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  selected,
  onSelect,
  multiple = true,
}: AssetPickerDialogProps) {
  const { assets, isLoading } = useAssets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const usableAssets = useMemo(() => {
    return assets
      .filter((a) => a.permission_state === "generation_allowed")
      .filter((a) => {
        if (filter === "all") return true;
        if (filter === "image") return a.asset_type === "image";
        if (filter === "video") return a.asset_type === "video";
        return a.asset_type !== "image" && a.asset_type !== "video";
      })
      .filter((a) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
        );
      });
  }, [assets, search, filter]);

  const counts = useMemo(() => {
    const usable = assets.filter((a) => a.permission_state === "generation_allowed");
    return {
      all: usable.length,
      image: usable.filter((a) => a.asset_type === "image").length,
      video: usable.filter((a) => a.asset_type === "video").length,
      document: usable.filter((a) => a.asset_type !== "image" && a.asset_type !== "video").length,
    };
  }, [assets]);

  const toggleAsset = (id: string) => {
    if (multiple) {
      onSelect(
        selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
      );
    } else {
      onSelect([id]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm-media-picker max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Select Source Media</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border p-0.5 shrink-0">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as MediaFilter)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all" className="text-xs">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="image" className="text-xs gap-1">
              <Image className="h-3 w-3" /> Images ({counts.image})
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs gap-1">
              <Video className="h-3 w-3" /> Videos ({counts.video})
            </TabsTrigger>
            <TabsTrigger value="document" className="text-xs gap-1">
              <FileText className="h-3 w-3" /> Docs ({counts.document})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[50vh]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : usableAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No {filter === "all" ? "assets" : filter + "s"} with generation permission found.
            </p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-3">
              {usableAssets.map((asset) => {
                const isSelected = selected.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={`group text-left rounded-md border overflow-hidden transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="relative">
                      <AssetThumbnail
                        filePath={asset.file_path}
                        assetType={asset.asset_type}
                        title={asset.title}
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1.5 left-1.5 text-[9px] capitalize"
                      >
                        {asset.asset_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{asset.title}</p>
                      {asset.description && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {asset.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1 pr-3">
              {usableAssets.map((asset) => {
                const Icon = ICON_MAP[asset.asset_type] ?? FileText;
                const isSelected = selected.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{asset.title}</p>
                      {asset.description && (
                        <p className="text-xs text-muted-foreground truncate">{asset.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                      {asset.asset_type.replace("_", " ")}
                    </Badge>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {multiple && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
