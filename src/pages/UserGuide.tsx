import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/useWorkspace";

type Section = { title: string; body: string[] };

export default function UserGuide() {
  const { entityPlural, entitySingular } = useWorkspace();
  const [params] = useSearchParams();
  const printMode = params.get("print") === "1";

  useEffect(() => {
    if (printMode) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [printMode]);

  const sections: Section[] = [
    {
      title: "1. Welcome to SocialMotive",
      body: [
        "SocialMotive is your team's content operating system. It turns approved strategy and source material into ready-to-post social content for LinkedIn, Instagram and Facebook — with human review at every step. It never publishes automatically.",
        "Everything starts with a Campaign Brief: one approved message. From it, the AI assembles a master content object plus platform variants, each with draft copy, hashtags, tag suggestions, source references and a rationale. Every post carries a sequential SM-NNNN number so you can track it from draft to posted.",
      ],
    },
    {
      title: "2. Getting set up",
      body: [
        "Open Setup and work through the checklist in order: company profile, team invites, connected sources, strategy rules, then your first Campaign Brief.",
        `Each ${entitySingular.toLowerCase()} has its own social accounts, assets, strategy, drafts and team. Switch between ${entityPlural.toLowerCase()} with the selector at the top right of the screen.`,
        "To add a teammate, an Admin creates an invite on the Team settings page and shares the sign-up link. Roles — owner, admin, editor, reviewer and viewer — control who can create, edit, review and approve.",
      ],
    },
    {
      title: "3. Strategy and rules",
      body: [
        "The Strategy module holds your editable rule buckets: brand voice, platform rules, audience definitions, campaign rules, content pillars, hashtag banks, CTA banks, tagging preferences, banned phrases and required language.",
        "These rules feed every generation and every AI Preflight check, so keeping them current keeps output on-brand. Changes to strategy apply to future generations; existing drafts are flagged for review where relevant.",
      ],
    },
    {
      title: "4. Assets and connected sources",
      body: [
        "The Asset Library stores uploaded images, videos, PDFs, decks, testimonials, case studies, links and text snippets. Connect OneDrive, SharePoint or Google Drive in Connected Sources to browse cloud folders directly from the library.",
        "Every asset has a permission state: usable for generation, summarization only, blocked, or archived. Only usable assets feed AI generation. Assets can carry expiration dates so outdated material stops resurfacing.",
      ],
    },
    {
      title: "5. Creating content",
      body: [
        "Write a Campaign Brief and approve it. Then generate a content set: one core message plus LinkedIn, Instagram and Facebook variants. Review each draft in the Daily Queue.",
        "The Media Studio creates images and short videos from your prompts and selected source assets. You can connect your own AI image and video tools in workspace settings, apply your brand kit, and send results to the queue as drafts.",
        "The Repurpose Center suggests reuse of approved posts — repost, rewrite, excerpt/quote, Story or Reel adaptation, and cross-platform adaptations. Each suggestion becomes a new draft linked to the original and still passes Preflight and approval.",
      ],
    },
    {
      title: "6. Review, Preflight and approval",
      body: [
        "AI Preflight checks brand voice, banned phrases, length limits, repetition, missing media or sources, unsupported claims, and complete Story/Reel outlines. It also computes the Content Motive Score™ for each draft.",
        "Blocking issues must be fixed, acknowledged (advisory), or overridden by an Admin with a logged reason before approval or export.",
        "Statuses flow Draft → In Review → Needs Revision → Approved → Exported → Posted, with Archived for retired content. Quotas count at Approved.",
      ],
    },
    {
      title: "7. Publishing and export",
      body: [
        "SocialMotive does not auto-publish. Approved content is copied or exported from Approved Content, and your team posts manually. Bulk export produces posting packages with copy, hashtags, tags and asset references.",
        "The Publishing Status page shows per-channel status for each post so the team can see what has gone out and what is still pending.",
      ],
    },
    {
      title: "8. Comments and engagement",
      body: [
        "The Comment Generator drafts thoughtful comments on relevant external posts, using only posts with topic, relevance and risk context. Comments are a separate workflow from owned-channel posts, with their own daily target.",
        "Default cadence targets: 5 Instagram feed posts, 3 Reels and 5 LinkedIn posts per week; 2 Stories and 10 meaningful comments per day. Admins can tune these in the Content Planner.",
      ],
    },
    {
      title: "9. Workspace administration",
      body: [
        "Workspace settings hold the company profile, organisation labels, plan limits, notification email provider (SendGrid or SMTP), and connected AI tools. Credentials stay server-side and are never visible in the browser.",
        `Admins can export all data, or one ${entitySingular.toLowerCase()} at a time, from Workspace settings. Usage and credits are visible in the sidebar meter and the Usage settings page.`,
      ],
    },
    {
      title: "10. Getting help",
      body: [
        "Use the Help page search to find quick answers. The What's New page lists recent features and fixes. If something looks wrong, note the post's SM-NNNN number and the page you were on before contacting your workspace admin.",
      ],
    },
  ];

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-6 print:max-w-none">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/help"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Help</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />Print / save as PDF
        </Button>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">SocialMotive User Guide</h1>
        <p className="text-sm text-muted-foreground">
          A complete walkthrough of every module. To save as PDF, choose Print and select “Save as PDF” as the destination.
        </p>
      </header>

      <nav className="rounded-md border border-border p-4 print:hidden">
        <p className="mb-2 text-sm font-medium">Contents</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a className="hover:text-foreground hover:underline" href={`#guide-${i + 1}`}>{s.title.replace(/^\d+\.\s*/, "")}</a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.title} id={`guide-${i + 1}`} className="space-y-2 scroll-mt-20">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          {s.body.map((p, j) => (
            <p key={j} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
