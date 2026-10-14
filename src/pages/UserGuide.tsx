import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useBilling, useCreditWeights, fmtUsd } from "@/hooks/useBilling";

type Sub = { heading: string; paragraphs?: string[]; steps?: string[]; bullets?: string[] };
type Section = { title: string; route?: string; intro: string; subs: Sub[] };

const fmtNum = (n: number | undefined | null) =>
  n == null ? "—" : n >= 999999 ? "Unlimited" : n.toLocaleString();

export default function UserGuide() {
  const { entityPlural, entitySingular, settings } = useWorkspace() as ReturnType<typeof useWorkspace> & {
    settings: { company_name?: string; company_logo_url?: string | null; org_type?: string } | null;
  };
  const { snapshot, meters, daysLeft } = useBilling();
  const weights = useCreditWeights();
  const [params] = useSearchParams();
  const printMode = params.get("print") === "1";

  const company = settings?.company_name?.trim() || "Your company";
  const logo = settings?.company_logo_url || null;
  const tier = snapshot?.tier;
  const a = tier?.allowances;
  const b = snapshot?.billing;
  const planName = tier?.name ?? "your plan";
  const ent = entitySingular.toLowerCase();
  const ents = entityPlural.toLowerCase();
  const channels = a?.channels?.length ? a.channels.map((c) => c[0].toUpperCase() + c.slice(1)).join(", ") : "your plan's channels";
  const weightRows = ((weights as { data?: Array<{ capability: string; label: string; credits: number }> }).data ?? []);

  useEffect(() => {
    if (printMode) {
      const t = setTimeout(() => window.print(), 900);
      return () => clearTimeout(t);
    }
  }, [printMode]);

  const sections: Section[] = [
    {
      title: "Welcome",
      intro: `SocialMotive is ${company}'s content operating system. It turns approved strategy and source material into ready-to-post social content with human review at every step. It never publishes automatically.`,
      subs: [
        { heading: "How content flows", steps: [
          "Strategy & Rules define voice, platforms, audiences and banned language.",
          "Assets and Connected Sources supply approved source material.",
          "A Campaign Brief captures one approved message.",
          "The generator builds a master content object plus platform variants.",
          "Drafts are reviewed in the Daily Queue, checked by AI Preflight and approved.",
          "Approved posts are exported or posted manually and tracked on Publishing Status.",
        ] },
        { heading: "Post numbers", paragraphs: ["Every post carries a sequential SM-NNNN number on every screen. Use it to find a post from draft to posted, and quote it when asking for help."] },
      ],
    },
    {
      title: "Your plan",
      route: "/settings/billing",
      intro: `${company} is on ${planName}${b ? ` (${b.billing_cycle} billing, status: ${b.billing_status})` : ""}. The limits below are what this workspace can use each cycle.`,
      subs: [
        { heading: "Plan allowances", bullets: a ? [
          `${entityPlural}: ${fmtNum(a.brands)}`,
          `Seats (team members): ${fmtNum(a.seats)}`,
          `Media credits per cycle: ${fmtNum(a.media_credits)}${b?.bonus_credits ? ` + ${b.bonus_credits.toLocaleString()} bonus credits` : ""}`,
          `AI text drafts per cycle: ${fmtNum(a.text_drafts)}`,
          `Publishing dispatches: ${fmtNum(a.dispatches)}`,
          `X (Twitter) spend cap: ${fmtUsd(a.x_cap_cents)}`,
          `Storage: ${fmtNum(a.storage_gb)} GB`,
          `Channels: ${channels}`,
        ] : ["Plan details load once you're signed in to the workspace."] },
        ...(meters ? [{ heading: "Usage right now", bullets: [
          `Media credits: ${meters.credits.used.toLocaleString()} of ${meters.credits.total.toLocaleString()} used`,
          `Text drafts: ${meters.text_drafts.used.toLocaleString()} of ${meters.text_drafts.total.toLocaleString()} used`,
          `X spend: ${fmtUsd(meters.x_spend.used, 2)} of ${fmtUsd(meters.x_spend.total)}`,
          `Cycle resets in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        ] }] : []),
      ],
    },
    {
      title: "Getting set up",
      route: "/setup",
      intro: "Setup walks a new workspace through everything needed before the first post.",
      subs: [
        { heading: "Checklist", steps: [
          "Company profile — name and logo shown in the app and on this guide.",
          `Organization type — agency with clients, or brand with departments (sets the "${entitySingular}" label).`,
          `First ${ent} — create it and connect its social accounts.`,
          "Brand voice basics — tone and language rules the AI must follow.",
          "Cadence targets — posts per week, per platform.",
          "Invite your team with the right role.",
          "AI image & video tools — use built-in AI or connect your own.",
          "Email provider — the account used for team notifications.",
        ] },
        { heading: `Switching ${ents}`, paragraphs: [`Each ${ent} has its own social accounts, assets, strategy, drafts and team access. Use the selector at the top of the screen to switch. Manage the list in Settings → ${entityPlural}.`] },
      ],
    },
    {
      title: "Dashboard",
      route: "/",
      intro: "Your daily starting point: setup progress, cadence against targets, pipeline status and what needs attention.",
      subs: [{ heading: "Using it", bullets: [
        "Open each panel's menu for a description and a shortcut to the related page.",
        "Cadence counts toward targets only once a post reaches Approved.",
        "Use the pipeline view to spot drafts stuck in review or needing revision.",
      ] }],
    },
    {
      title: "Strategy & Rules",
      route: "/strategy",
      intro: "Editable rule buckets that feed every generation and every Preflight check.",
      subs: [
        { heading: "Buckets", bullets: ["Brand voice", "Platform rules and character limits", "Audience definitions", "Campaign rules and content pillars", "Hashtag banks", "CTA banks", "Tagging preferences", "Banned phrases and required language"] },
        { heading: "Editing rules", steps: ["Open a tab.", "Add or edit an entry and switch it active or inactive.", "Save. Future generations use the change; existing drafts are flagged in Preflight where relevant."] },
        { heading: "Guardrails", paragraphs: ["Baseline guardrails always apply. Per-" + ent + " toggles and custom terms let you tighten or relax wording checks."] },
      ],
    },
    {
      title: "Asset Library & Connected Sources",
      route: "/assets",
      intro: "Where approved source material lives.",
      subs: [
        { heading: "Adding assets", steps: ["Upload images, videos, PDFs, decks, testimonials, case studies, links or text snippets.", "Or open Connected Folders to browse OneDrive, SharePoint or Google Drive.", "Set a permission state and optional expiry date."] },
        { heading: "Permission states", bullets: ["Usable for generation — feeds AI drafts.", "Summarization only — summarized, never quoted directly.", "Blocked — never used.", "Archived — retired from use."] },
        { heading: "Connected Sources", paragraphs: ["Connect cloud drives once in Connected Sources. If a connection expires, reconnect it there. Storage counts toward your " + (a ? `${a.storage_gb} GB` : "plan") + " limit."] },
      ],
    },
    {
      title: "Campaign Briefs",
      route: "/briefs",
      intro: "One approved message that every variant traces back to.",
      subs: [
        { heading: "Creating a brief", steps: ["Click New brief and fill objective, audience, core message, proof points, CTA, destination URL, timing and target channels.", "Submit for approval.", "Once approved, generate variants from it."] },
        { heading: "Versioning", paragraphs: ["Editing a strategic field bumps the version, reverts approval and flags linked content as stale so nothing goes out on an outdated message."] },
      ],
    },
    {
      title: "AI Post Generator",
      route: "/generator",
      intro: `Builds a master content object and platform variants for ${channels}.`,
      subs: [
        { heading: "Generating", steps: ["Pick an approved brief.", "Optionally choose an executive voice profile.", "Generate. Each variant includes copy, hashtags, people and organization tags, source references, rationale and a suggested asset.", "Variants land in the Daily Queue as Drafts."] },
        { heading: "Credits", paragraphs: ["Each AI draft uses one text draft from your allowance. You'll see a check before generating if you're short."] },
      ],
    },
    {
      title: "Daily Content Queue",
      route: "/queue",
      intro: "The working list of drafts to review, edit and approve.",
      subs: [
        { heading: "Working a draft", steps: ["Open a post card.", "Edit copy, hashtags and tags — every edit is versioned, with a word-level diff against the prior copy.", "Assign an owner.", "Run Preflight.", "Move to In Review, Needs Revision or Approved."] },
        { heading: "Split across platforms", paragraphs: ["Use “Split across platforms” on a post you love to create optimized Drafts for each major platform."] },
      ],
    },
    {
      title: "AI Preflight & Content Motive Score™",
      intro: "Automatic checks before anything can be approved or exported.",
      subs: [
        { heading: "What it checks", bullets: ["Brand voice and banned phrases", "Length limits per platform", "Repeated hooks, hashtags and CTAs", "Missing media or sources", "Unsupported claims", "Complete Story/Reel outlines"] },
        { heading: "Results", paragraphs: ["Blocking issues must be fixed, acknowledged (advisory) or overridden by an Admin with a logged reason. The Content Motive Score™ breaks down hook, strategic fit, platform fit, originality and voice."] },
      ],
    },
    {
      title: "Content Planner",
      route: "/planner",
      intro: "Calendar and cadence planning by platform and content type.",
      subs: [{ heading: "Using it", bullets: ["Schedule drafts by date and time zone.", "Review quarterly summaries at the top.", "Adjust weekly and daily targets per platform and content type."] }],
    },
    {
      title: "Media Studio",
      route: "/media-studio",
      intro: "Create images and short videos from prompts and selected source assets.",
      subs: [
        { heading: "Creating media", steps: ["Select source assets — they're used in generation.", "Choose format and write a prompt or use a prompt chip.", "Optionally apply your Brand Kit and AI disclosure.", "Generate, review variations, then save, download or send to the queue as a Draft."] },
        { heading: "Credits", paragraphs: ["Images and videos use media credits at the rates in the credit table (see Monitoring credits). Video uses more credits than images."] },
      ],
    },
    {
      title: "Brand Kit Studio",
      route: "/settings/brand-kit",
      intro: `Logo, colors, typography and visual tone per ${ent}.`,
      subs: [{ heading: "Setting it up", steps: ["Upload a logo.", "Add brand colors and fonts.", "Describe the visual tone.", "Choose watermark position and save."] }],
    },
    {
      title: "Comment Generator",
      route: "/comments",
      intro: "Drafts thoughtful comments on relevant external posts — a separate workflow from owned-channel posts.",
      subs: [{ heading: "Using it", steps: ["Find posts or add a post URL.", "Review topic, relevance score, risk flag and author context.", "Generate a comment draft, edit it and approve.", "Post it manually; it's marked as commented."] }],
    },
    {
      title: "Repurpose Center",
      route: "/repurpose",
      intro: "Suggestions to reuse approved posts and generation-allowed assets.",
      subs: [{ heading: "Reuse types", bullets: ["Repost as is", "Cross-platform rewrite", "Excerpt / quote", "Story or Reel adaptation", "LinkedIn ↔ Instagram adaptation"] }, { heading: "Sending to the queue", paragraphs: ["Edit a suggestion and send it to the queue as a new Draft linked to the original. It still passes Preflight and approval."] }],
    },
    {
      title: "Executive Voice",
      intro: "Voice profiles for people who post under their own name.",
      subs: [{ heading: "Creating a profile", steps: ["Add name, role and sample posts.", "Run voice analysis and review the suggested traits.", "Save. Choose the profile when generating to write in that voice."] }],
    },
    {
      title: "Approved Content, Export & Publishing",
      route: "/approved",
      intro: "SocialMotive never auto-publishes. Your team posts approved content manually.",
      subs: [
        { heading: "Exporting", steps: ["Open Approved Content.", "Copy post copy, hashtags or tags with one click, or select several posts for bulk export.", "Open a Posting Package for a native preview and media.", "After posting, paste the live URL to mark it Posted."] },
        { heading: "Publishing Status", paragraphs: [`See Upcoming, Published and Failed posts per channel, plus X spend against your ${a ? fmtUsd(a.x_cap_cents) : ""} cap.`] },
      ],
    },
    {
      title: "Executive Review & Insights",
      intro: "Share-ready views for leadership.",
      subs: [{ heading: "Available views", bullets: ["Executive Review — a clean read-only view of campaigns and variants.", "Portfolio Insights — performance and pipeline across " + ents + "."] }],
    },
    {
      title: "Monitoring credits",
      route: "/settings/usage",
      intro: "Know what you've used and what's left before you run out.",
      subs: [
        { heading: "Where to look", bullets: ["Sidebar usage meter — always visible; turns amber then red as you approach the limit.", "Settings → Usage — breakdown by bucket (media credits, text drafts, X spend, storage) and recent activity.", "Settings → Billing — plan, cycle dates and credit balance."] },
        ...(weightRows.length ? [{ heading: "Credit costs", bullets: weightRows.map((w) => `${w.label}: ${w.credits} credit${w.credits === 1 ? "" : "s"}`) }] : []),
        { heading: "When a limit is reached", paragraphs: ["Before any metered action you'll see whether you have enough. If spending looks unusual, only that bucket pauses — an owner or delegate can review and resume it from the alert."] },
      ],
    },
    {
      title: "Adding credits & changing plans",
      route: "/settings/billing",
      intro: "Owners and admins with spend control can add capacity at any time.",
      subs: [
        { heading: "Buy a credit pack", steps: ["Go to Settings → Billing.", "Click “Buy 500 credits · $25”.", "Complete checkout. Credits are added as bonus credits once payment confirms."] },
        { heading: "Upgrade your plan", steps: ["Open Pricing from Billing.", "Choose a higher plan and complete checkout.", "New allowances apply once payment confirms."] },
        { heading: "How add-ons are billed", paragraphs: [b?.billing_mode === "invoice" ? "This workspace is billed by invoice: add-ons appear on your next invoice." : "This workspace pays by card: credit packs, storage, seats, " + ents + " and channels charge immediately."] },
      ],
    },
    {
      title: "Team & roles",
      route: "/settings/team",
      intro: a ? `${planName} includes ${fmtNum(a.seats)} seats.` : "Invite teammates with the right role.",
      subs: [{ heading: "Roles", bullets: ["Owner — full control, billing limits, ownership transfer and reset.", "Admin — settings, team, strategy, approvals and export.", "Editor — creates and edits briefs, drafts, comments and assets.", "Reviewer — reviews, edits and approves; can't create new drafts.", "Viewer — read-only access to assigned work."] }],
    },
    {
      title: "Notifications & workspace settings",
      route: "/settings/workspace",
      intro: "Company profile, labels, email provider, notifications and AI tools.",
      subs: [{ heading: "Settings", bullets: ["Workspace — company name, logo, organization labels, time zone.", "Notifications — daily digest and “post went out” emails per recipient.", "Email provider — SendGrid or SMTP; credentials stay server-side.", "Connections — social accounts and AI image/video providers.", "Data export — all data or one " + ent + " at a time."] }],
    },
    {
      title: "Getting help",
      route: "/help",
      intro: "Search the Help page for quick answers; What's New lists recent changes.",
      subs: [{ heading: "Reporting a problem", paragraphs: ["Note the post's SM-NNNN number and the page you were on, then contact your workspace admin."] }],
    },
  ];

  return (
    <div className="sm-user-guide animate-fade-in mx-auto max-w-4xl space-y-6 print:max-w-none">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/help"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Help</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />Print / save as PDF
        </Button>
      </div>

      <header className="flex items-center gap-4 border-b border-border pb-4">
        {logo && <img src={logo} alt={`${company} logo`} className="h-12 w-12 rounded object-contain" />}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{company} User Guide</h1>
          <p className="text-sm text-muted-foreground">
            Powered by SocialMotive · Plan: {planName}{b ? ` · Cycle ends ${new Date(b.cycle_end).toLocaleDateString()}` : ""}
          </p>
          <p className="text-xs text-muted-foreground print:hidden">To save as PDF, choose Print and select “Save as PDF”.</p>
        </div>
      </header>

      <nav className="rounded-md border border-border p-4 print:break-after-page">
        <p className="mb-2 text-sm font-medium">Contents</p>
        <ol className="list-decimal columns-1 space-y-1 pl-5 text-sm text-muted-foreground sm:columns-2">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a className="hover:text-foreground hover:underline" href={`#guide-${i + 1}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.title} id={`guide-${i + 1}`} className="space-y-3 scroll-mt-20 print:break-inside-avoid-page">
          <h2 className="text-lg font-semibold">{i + 1}. {s.title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {s.intro}
            {s.route && <span className="print:hidden"> <Link to={s.route} className="text-primary hover:underline">Open page →</Link></span>}
          </p>
          {s.subs.map((sub) => (
            <div key={sub.heading} className="space-y-1.5 pl-1">
              <h3 className="text-sm font-semibold">{sub.heading}</h3>
              {sub.paragraphs?.map((p, j) => <p key={j} className="text-sm leading-relaxed text-muted-foreground">{p}</p>)}
              {sub.steps && <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">{sub.steps.map((x) => <li key={x}>{x}</li>)}</ol>}
              {sub.bullets && <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{sub.bullets.map((x) => <li key={x}>{x}</li>)}</ul>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
