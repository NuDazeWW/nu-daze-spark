import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo } from "react";
import { Search, Image, Video, FileText, Check } from "lucide-react";
import { useAssets, type SourceAsset } from "@/hooks/useAssets";

const ICON_MAP: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
};

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

  const usableAssets = useMemo(() => {
    return assets
      .filter((a) => a.permission_state === "generation_allowed")
      .filter((a) => {
        if (!search) return true;
        return (
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.description?.toLowerCase().includes(search.toLowerCase())
        );
      });
  }, [assets, search]);

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
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Source Assets</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets…"
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[40vh]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : usableAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No assets with generation permission found.</p>
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
