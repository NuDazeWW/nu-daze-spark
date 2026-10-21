import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { NAV_SEARCH_INDEX, navMatches } from "@/lib/navSearch";

/** Floating page finder for every signed-in screen (Cmd/Ctrl+K). */
export function NavSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const results = NAV_SEARCH_INDEX.filter((e) => navMatches(e, query));
  const groups = [...new Set(results.map((r) => r.group))];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Find a page (Ctrl or Cmd + K)"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-card-foreground shadow-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Find a page</span>
        <kbd className="hidden rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages and sections…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No matching page.</CommandEmpty>
          {groups.map((g) => (
            <CommandGroup key={g} heading={g}>
              {results.filter((r) => r.group === g).map((r) => (
                <CommandItem key={r.href} value={`${r.title} ${r.group} ${r.href}`} onSelect={() => { setOpen(false); navigate(r.href); }}>
                  <r.icon className="mr-2 size-4" aria-hidden="true" />
                  <span>{r.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
