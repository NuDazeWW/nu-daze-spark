import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus, Hash } from "lucide-react";
import { useActiveHashtagBanks } from "@/hooks/useHashtagBanks";
import type { PostCard } from "@/hooks/usePostCards";

interface PostCardEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: PostCard;
  onSave: (updates: Partial<PostCard>) => void;
  isPending: boolean;
}

export function PostCardEditDialog({ open, onOpenChange, card, onSave, isPending }: PostCardEditDialogProps) {
  const [draftCopy, setDraftCopy] = useState(card.draft_copy);
  const [hashtags, setHashtags] = useState<string[]>(card.hashtags ?? []);
  const [peopleTags, setPeopleTags] = useState<string[]>(card.people_tags ?? []);
  const [orgTags, setOrgTags] = useState<string[]>(card.org_tags ?? []);
  const [hashtagInput, setHashtagInput] = useState("");
  const [peopleInput, setPeopleInput] = useState("");
  const [orgInput, setOrgInput] = useState("");
  const [revisionNotes, setRevisionNotes] = useState(card.revision_notes ?? "");
  const { data: hashtagBanks } = useActiveHashtagBanks();

  const insertBank = (bankHashtags: string[]) => {
    const merged = [...new Set([...hashtags, ...bankHashtags])];
    setHashtags(merged);
  };

  const addTag = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
    prefix?: string,
  ) => {
    let v = value.trim();
    if (!v) return;
    if (prefix && !v.startsWith(prefix)) v = `${prefix}${v}`;
    if (!list.includes(v)) setList([...list, v]);
    setInput("");
  };

  const removeTag = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter((t) => t !== value));
  };

  const handleSave = () => {
    onSave({
      draft_copy: draftCopy,
      hashtags,
      people_tags: peopleTags,
      org_tags: orgTags,
      revision_notes: revisionNotes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Draft Copy</Label>
            <Textarea value={draftCopy} onChange={(e) => setDraftCopy(e.target.value)} rows={6} />
            <p className="text-[10px] text-muted-foreground mt-1">{draftCopy.length} characters</p>
          </div>

          {/* Hashtags */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Hashtags</Label>
              {hashtagBanks && hashtagBanks.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Hash className="h-3 w-3" /> Insert Bank
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Click a bank to insert all its hashtags</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {hashtagBanks.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-sm flex items-center justify-between"
                          onClick={() => insertBank(bank.hashtags)}
                        >
                          <span className="font-medium">{bank.bank_name}</span>
                          <Badge variant="secondary" className="text-[10px] ml-2">{bank.hashtags.length}</Badge>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="flex gap-2 mb-1.5">
              <Input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                placeholder="#hashtag"
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(hashtagInput, hashtags, setHashtags, setHashtagInput, "#"); } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addTag(hashtagInput, hashtags, setHashtags, setHashtagInput, "#")}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {hashtags.map((h) => (
                <Badge key={h} variant="outline" className="text-xs gap-1 pr-1">
                  #{h.replace(/^#/, "")}
                  <button type="button" onClick={() => removeTag(h, hashtags, setHashtags)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* People Tags */}
          <div>
            <Label>Tag Accounts</Label>
            <div className="flex gap-2 mb-1.5">
              <Input
                value={peopleInput}
                onChange={(e) => setPeopleInput(e.target.value)}
                placeholder="@handle"
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(peopleInput, peopleTags, setPeopleTags, setPeopleInput, "@"); } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addTag(peopleInput, peopleTags, setPeopleTags, setPeopleInput, "@")}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {peopleTags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs gap-1 pr-1">
                  {t}
                  <button type="button" onClick={() => removeTag(t, peopleTags, setPeopleTags)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Org Tags */}
          <div>
            <Label>Organization Tags</Label>
            <div className="flex gap-2 mb-1.5">
              <Input
                value={orgInput}
                onChange={(e) => setOrgInput(e.target.value)}
                placeholder="@organization"
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(orgInput, orgTags, setOrgTags, setOrgInput, "@"); } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addTag(orgInput, orgTags, setOrgTags, setOrgInput, "@")}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {orgTags.map((t) => (
                <Badge key={t} variant="outline" className="text-xs gap-1 pr-1">
                  {t}
                  <button type="button" onClick={() => removeTag(t, orgTags, setOrgTags)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Revision Notes */}
          <div>
            <Label>Revision Notes</Label>
            <Textarea value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} rows={2} placeholder="Notes for the team…" />
          </div>

          <Button onClick={handleSave} disabled={isPending || !draftCopy.trim()} className="w-full">
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
