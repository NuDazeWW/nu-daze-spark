import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Radar, X, Sparkles } from "lucide-react";

const SUGGESTED_QUERIES = [
  { label: "AI & Branding", query: "AI-first branding strategies thought leadership" },
  { label: "Digital Marketing Trends", query: "digital marketing trends 2026 insights" },
  { label: "Social Media Strategy", query: "social media strategy B2B engagement tips" },
  { label: "Content Marketing", query: "content marketing ROI brand storytelling" },
  { label: "Creator Economy", query: "creator economy brand partnerships collaboration" },
  { label: "Design & UX", query: "design thinking UX brand experience innovation" },
  { label: "Startup Growth", query: "startup growth marketing brand building early stage" },
  { label: "LinkedIn Best Practices", query: "LinkedIn post best practices engagement 2026" },
  { label: "Instagram Growth", query: "Instagram growth strategy reels engagement" },
  { label: "Brand Positioning", query: "brand positioning differentiation competitive strategy" },
];

interface ScrapePostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScrape: (params: { platform?: string; query?: string }) => void;
  isPending: boolean;
}

export function ScrapePostsDialog({ open, onOpenChange, onScrape, isPending }: ScrapePostsDialogProps) {
  const [platform, setPlatform] = useState("linkedin");
  const [customQuery, setCustomQuery] = useState("");
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);

  const toggleSuggestion = (query: string) => {
    setSelectedQueries((prev) =>
      prev.includes(query) ? prev.filter((q) => q !== query) : [...prev, query]
    );
  };

  const handleScrape = () => {
    // Combine selected suggestions + custom query
    const parts: string[] = [...selectedQueries];
    if (customQuery.trim()) parts.push(customQuery.trim());
    const combined = parts.join(" OR ");

    onScrape({
      platform,
      query: combined || undefined,
    });
  };

  const activeCount = selectedQueries.length + (customQuery.trim() ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            Find Relevant Posts
          </DialogTitle>
          <DialogDescription>
            Pick topics to search for, or add your own. Multiple selections are combined for broader discovery.
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

          {/* Suggested queries */}
          <div>
            <Label className="mb-2 block">
              <Sparkles className="inline h-3.5 w-3.5 mr-1 text-primary" />
              Quick Topics
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUERIES.map((s) => {
                const active = selectedQueries.includes(s.query);
                return (
                  <button
                    key={s.query}
                    type="button"
                    onClick={() => toggleSuggestion(s.query)}
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer select-none ${
                      active
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/80"
                        : "border-border text-foreground hover:bg-accent"
                    }`}
                  >
                    {s.label}
                    {active && <X className="ml-1 h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom query */}
          <div>
            <Label>Custom Query (optional)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="e.g. AI-powered customer experience"
                className="pl-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {activeCount === 0
                ? "Select topics above or type a custom query. Leave all blank to auto-search from your strategy."
                : `${activeCount} search term${activeCount !== 1 ? "s" : ""} will be combined.`}
            </p>
          </div>

          <Button onClick={handleScrape} disabled={isPending} className="w-full">
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching…</>
            ) : (
              <><Radar className="mr-2 h-4 w-4" />Find Posts{activeCount > 0 ? ` (${activeCount} topics)` : ""}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
