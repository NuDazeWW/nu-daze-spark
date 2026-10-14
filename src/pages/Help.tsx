import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen, FileDown, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkspace, ROLE_META, type WorkspaceRole } from "@/hooks/useWorkspace";

type Topic = { q: string; a: React.ReactNode; keywords: string };
type Category = { title: string; blurb: string; topics: Topic[] };

export default function Help() {
  const { entityPlural, entitySingular } = useWorkspace();
  const [query, setQuery] = useState("");

  const categories: Category[] = useMemo(() => [
    {
      title: "Getting started",
      blurb: "The big picture: how SocialMotive is organised and how work flows.",
      topics: [
        { q: "How does content flow through SocialMotive?", keywords: "flow workflow brief queue approve export", a: <>Write a <Link className="underline" to="/briefs">Campaign Brief</Link> and approve it. Generate a content set — one core message plus LinkedIn, Instagram and Facebook versions. Review drafts in the <Link className="underline" to="/queue">Daily Queue</Link>, run AI Preflight, approve, then copy or export from <Link className="underline" to="/approved">Approved Content</Link>. Each post keeps its SM-NNNN number on every screen.</> },
        { q: `What is a ${entitySingular.toLowerCase()}?`, keywords: "workspace client brand switch", a: <>Each {entitySingular.toLowerCase()} has its own social accounts, assets, strategy, drafts and team. Switch between {entityPlural.toLowerCase()} with the selector at the top right. Manage them in <Link className="underline" to="/settings/clients">{entityPlural}</Link>.</> },
        { q: "What should I set up first?", keywords: "setup onboarding start configure", a: <>Work through <Link className="underline" to="/setup">Setup</Link> in order: company profile, team invites, connected sources, strategy rules, then your first Campaign Brief. The setup checklist tracks your progress.</> },
        { q: "Where do I see what's new?", keywords: "whats new updates changelog", a: <>The <Link className="underline" to="/whats-new">What's New</Link> page lists recent features and fixes.</> },
      ],
    },
    {
      title: "Creating content",
      blurb: "Briefs, generation, the Media Studio, and repurposing.",
      topics: [
        { q: "What is a Campaign Brief?", keywords: "brief campaign message objective", a: <>A brief captures one approved message: objective, audience, key points and call to action. Everything generated from it traces back to that brief, so every post has a clear strategic source. Editing strategic fields on an approved brief reverts its approval and flags linked content for review.</> },
        { q: "How does AI generation work?", keywords: "generate ai draft variants platforms", a: <>From an approved brief, generate a content set: one master message plus platform variants for LinkedIn, Instagram and Facebook. Each variant includes draft copy, hashtags, tag suggestions, source references and a short rationale. Nothing is auto-approved — a human always reviews.</> },
        { q: "What is the Media Studio?", keywords: "media studio image video generate visuals", a: <>The <Link className="underline" to="/media-studio">Media Studio</Link> creates images and short videos from your prompts and source assets. You can connect your own AI image and video tools in workspace settings, apply your brand kit, and send results to the queue as drafts.</> },
        { q: "How do I reuse a post that worked?", keywords: "repurpose repost rewrite reuse adapt", a: <>The <Link className="underline" to="/repurpose">Repurpose Center</Link> suggests reuse types — repost, rewrite, excerpt/quote, Story or Reel adaptation, LinkedIn-to-Instagram and Instagram-to-LinkedIn. Each suggestion becomes a new draft linked to the original, and still passes Preflight and approval.</> },
        { q: "Can one post be split across platforms?", keywords: "split platforms cross post adapt", a: <>Yes. From a draft you love, use “Split across platforms” to create linked variants tuned for each major platform. Each variant is reviewed and approved separately.</> },
      ],
    },
    {
      title: "Review and approval",
      blurb: "Preflight, statuses, and keeping quality high.",
      topics: [
        { q: "What does AI Preflight check?", keywords: "preflight check review score motive", a: <>Brand voice, banned phrases, length limits, repetition, missing media or sources, unsupported claims, and complete Story/Reel outlines. It also computes the Content Motive Score™. Blocking issues must be fixed or overridden by an Admin with a logged reason.</> },
        { q: "What are the post statuses?", keywords: "status draft review approved exported posted archived lifecycle", a: <>Draft → In Review → Needs Revision → Approved → Exported → Posted, with Archived for retired content. Quotas count at Approved.</> },
        { q: "How do I find a specific post?", keywords: "find search sm number tracking", a: <>Every post has a sequential SM-NNNN number shown on every screen. Use it in search, or follow jump links between screens — one ID tracks a post from draft to posted.</> },
        { q: "Does SocialMotive publish posts for me?", keywords: "publish auto posting manual", a: <>No. SocialMotive prepares ready-to-post packages; your team posts manually. This keeps a human in control of every post.</> },
      ],
    },
    {
      title: "Assets and sources",
      blurb: "Your library, connected folders, and freshness rules.",
      topics: [
        { q: "How do I connect cloud folders?", keywords: "connect onedrive sharepoint google drive folders sources", a: <>In <Link className="underline" to="/sources">Connected Sources</Link>, link OneDrive, SharePoint or Google Drive. Connected folders appear in the Asset Library browser so you can pull files straight into drafts.</> },
        { q: "What do asset permission states mean?", keywords: "permission usable summarization blocked archived asset", a: <>Each asset is: usable for generation, summarization only, blocked, or archived. Only “usable” assets feed AI generation — blocked and archived assets never resurface.</> },
        { q: "How does content freshness work?", keywords: "freshness expiration outdated expire", a: <>Assets can carry expiration dates. Expired content stops appearing in generation and suggestions, so outdated material doesn't keep resurfacing.</> },
      ],
    },
    {
      title: "Team and roles",
      blurb: "People, permissions, and workspace settings.",
      topics: [
        { q: "Who can do what?", keywords: "roles permissions owner admin editor reviewer viewer", a: <ul className="list-disc pl-5">{(Object.keys(ROLE_META) as WorkspaceRole[]).map((r) => <li key={r}><strong>{ROLE_META[r].label}:</strong> {ROLE_META[r].description}</li>)}</ul> },
        { q: "How do I add a teammate?", keywords: "invite team member add user", a: <>An Admin creates an invite on the <Link className="underline" to="/settings/team">Team</Link> page and shares the sign-up link. They get access as soon as they sign up with the invited email.</> },
        { q: "How do I get my data out?", keywords: "export data download backup", a: <>Admins can download everything, or one {entitySingular.toLowerCase()} at a time, from <Link className="underline" to="/settings/workspace">Workspace settings</Link>.</> },
        { q: "How do notification emails work?", keywords: "email notifications sendgrid smtp", a: <>Email sends through your workspace-configured provider (SendGrid or SMTP), set up in workspace settings. Credentials stay server-side and are never visible in the browser.</> },
      ],
    },
    {
      title: "Comments and engagement",
      blurb: "The separate commenting workflow.",
      topics: [
        { q: "How does the Comment Generator work?", keywords: "comment generator engagement reply", a: <>The <Link className="underline" to="/comments">Comment Generator</Link> drafts thoughtful comments on relevant external posts. It only uses posts with topic, relevance and risk context — never generic or spammy output. Comments are a separate workflow from owned-channel posts and count toward their own daily target.</> },
        { q: "What are the cadence targets?", keywords: "cadence targets weekly daily volume planner", a: <>Defaults: 5 Instagram feed posts, 3 Reels and 5 LinkedIn posts per week; 2 Stories and 10 meaningful comments per day. Admins can tune targets in the <Link className="underline" to="/planner">Content Planner</Link>.</> },
      ],
    },
  ], [entityPlural, entitySingular]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        topics: c.topics.filter(
          (t) => t.q.toLowerCase().includes(q) || t.keywords.includes(q),
        ),
      }))
      .filter((c) => c.topics.length > 0);
  }, [categories, q]);

  const totalResults = filtered.reduce((n, c) => n + c.topics.length, 0);

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <PageHeader title="Help" description="Answers, guides and reference material for SocialMotive." />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help topics…"
          className="pl-9"
          aria-label="Search help topics"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/help/guide"
          className="group flex items-start gap-3 rounded-md border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="flex items-center gap-1 font-medium">
              Browser user guide
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              A full walkthrough of every module, read it right here in the app.
            </span>
          </span>
        </Link>
        <Link
          to="/help/guide?print=1"
          className="group flex items-start gap-3 rounded-md border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <FileDown className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="flex items-center gap-1 font-medium">
              PDF user guide
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              The same guide in a print-ready layout — save it as a PDF from your browser.
            </span>
          </span>
        </Link>
      </div>

      {q && (
        <p className="text-sm text-muted-foreground">
          {totalResults === 0
            ? `No topics match “${query}”. Try a different word.`
            : `${totalResults} topic${totalResults === 1 ? "" : "s"} matching “${query}”.`}
        </p>
      )}

      {filtered.map((c) => (
        <section key={c.title} className="space-y-2">
          <div>
            <h2 className="text-lg font-semibold">{c.title}</h2>
            <p className="text-sm text-muted-foreground">{c.blurb}</p>
          </div>
          <Accordion type="single" collapsible className="rounded-md border border-border px-4">
            {c.topics.map((t) => (
              <AccordionItem key={t.q} value={t.q}>
                <AccordionTrigger className="text-left">{t.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{t.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
}
