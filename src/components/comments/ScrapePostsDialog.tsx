import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Radar } from "lucide-react";

interface ScrapePostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScrape: (params: { platform?: string; query?: string }) => void;
  isPending: boolean;
}

export function ScrapePostsDialog({ open, onOpenChange, onScrape, isPending }: ScrapePostsDialogProps) {
  const [platform, setPlatform] = useState("linkedin");
  const [query, setQuery] = useState("");

  const handleScrape = () => {
    onScrape({
      platform,
      query: query.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            Find Relevant Posts
          </DialogTitle>
          <DialogDescription>
            Search the web for industry posts NuDaze should engage with. Posts are scored for relevance and risk automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Platform Focus</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Search Query (optional)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. AI-first branding strategies"
                className="pl-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Leave blank to auto-search based on your engagement targets & strategy.
            </p>
          </div>

          <Button onClick={handleScrape} disabled={isPending} className="w-full">
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching…</>
            ) : (
              <><Radar className="mr-2 h-4 w-4" />Find Posts</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
