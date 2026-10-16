import * as React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  AtSign,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  FileCheck,
  FilePlus2,
  FileText,
  FolderOpen,
  Gauge,
  Globe,
  Hash,
  Inbox,
  ListChecks,
  Mail,
  Megaphone,
  MessageSquare,
  Mic,
  MousePointerClick,
  Package,
  Pause,
  PieChart,
  Send,
  Repeat2,
  Shield,
  ShieldCheck,
  Bell,
  Sparkles,
  Target,
  Upload,
  UserPlus,
  Users,
  Video,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export type HoverListItem = { icon: LucideIcon; label: string; description?: string; to?: string };

/** What's inside each sidebar page — informational rows, or links when a real destination exists. */
export const NAV_HOVER_LISTS: Record<string, HoverListItem[]> = {
  "/": [
    { icon: Gauge, label: "Today at a glance", description: "Decisions needed, ready to post, at risk" },
    { icon: CalendarDays, label: "Pipeline overview", description: "Where every post sits this week", to: "/queue" },
    { icon: CheckCircle2, label: "Approved library", description: "Everything cleared to publish", to: "/approved" },
    { icon: Sparkles, label: "New campaign brief", description: "Start the next content set", to: "/briefs" },
  ],
  "/assets": [
    { icon: Upload, label: "Uploads & bulk upload", description: "Images, video, PDFs, decks" },
    { icon: ShieldCheck, label: "Permission states", description: "Usable, summarization-only, blocked, archived" },
    { icon: Clock, label: "Freshness & expiry", description: "Outdated assets stop resurfacing" },
    { icon: Video, label: "Reel creator", description: "Assemble Reels from cleared media" },
  ],
  "/sources": [
    { icon: Database, label: "Document libraries", description: "Approved connected sources" },
    { icon: Globe, label: "Linked webpages", description: "Articles and pages you own" },
    { icon: FolderOpen, label: "OneDrive & SharePoint", description: "Browse and import Microsoft files" },
    { icon: FileText, label: "Import webpage", description: "Save a page as a source" },
  ],
  "/strategy": [
    { icon: BookOpen, label: "Brand Voice", description: "Tone, phrases, hook formulas", to: "/strategy?tab=voice" },
    { icon: Mic, label: "Voices", description: "Executive voice profiles", to: "/strategy?tab=voices" },
    { icon: ShieldCheck, label: "Guardrails", description: "Banned words & required language", to: "/strategy?tab=guardrails" },
    { icon: Globe, label: "Platform Rules", description: "Per-platform voice & formats", to: "/strategy?tab=platform" },
    { icon: Users, label: "Audiences", description: "Who each message speaks to", to: "/strategy?tab=audiences" },
    { icon: Megaphone, label: "Campaigns", description: "Active campaign rules", to: "/strategy?tab=campaigns" },
    { icon: Hash, label: "Hashtags", description: "Approved hashtag banks", to: "/strategy?tab=hashtags" },
    { icon: MousePointerClick, label: "CTAs", description: "Approved calls to action", to: "/strategy?tab=ctas" },
    { icon: CalendarDays, label: "Cadence", description: "Weekly posting targets", to: "/strategy?tab=cadence" },
    { icon: MessageSquare, label: "Engagement", description: "Daily comment targets", to: "/strategy?tab=engagement" },
  ],
  "/briefs": [
    { icon: FilePlus2, label: "New campaign brief", description: "One approved message per campaign" },
    { icon: CheckCircle2, label: "Approval & versioning", description: "Strategic edits reopen approval" },
    { icon: Boxes, label: "Master content objects", description: "The source every variant traces to" },
    { icon: Mic, label: "Write as", description: "Generate variants in a leader's voice", to: "/strategy?tab=voices" },
  ],
  "/generator": [
    { icon: Sparkles, label: "Generate post cards", description: "From approved briefs and assets" },
    { icon: Users, label: "Audience & pillars", description: "Grounded in your strategy rules" },
    { icon: FileCheck, label: "Source provenance", description: "Every draft shows its sources" },
  ],
  "/queue": [
    { icon: CalendarDays, label: "Today's cards", description: "Posts and comments due today" },
    { icon: Package, label: "Posting packages", description: "Copy, media and previews together" },
    { icon: Eye, label: "Native previews", description: "See it as LinkedIn & Instagram render it" },
    { icon: Upload, label: "Schedule import", description: "Bring in a planned schedule" },
  ],
  "/planner": [
    { icon: CalendarRange, label: "Month & quarter views", description: "Coverage up to a year ahead" },
    { icon: PieChart, label: "Cadence coverage", description: "Targets vs. what's scheduled" },
    { icon: Inbox, label: "Unscheduled tray", description: "Drag posts in and out of slots" },
  ],
  "/comments": [
    { icon: MessageSquare, label: "Comment drafts", description: "Genuine, informed engagement" },
    { icon: Target, label: "Engagement targets", description: "Relevant industry posts" },
    { icon: Globe, label: "External posts", description: "Author context and risk checks" },
  ],
  "/approved": [
    { icon: CheckCircle2, label: "Approved posts", description: "Cleared and ready to publish" },
    { icon: Copy, label: "Copy & open", description: "Copy the post, then open the platform" },
    { icon: Download, label: "Export", description: "Hand off to whoever publishes" },
  ],
  "/repurpose": [
    { icon: Repeat2, label: "Reuse types", description: "Repost, rewrite, excerpt, adaptations" },
    { icon: FolderOpen, label: "Sources", description: "Approved posts and cleared assets" },
    { icon: Send, label: "Send to Daily Queue", description: "Each reuse becomes a traceable draft" },
  ],
  "/setup": [
    { icon: ListChecks, label: "Setup checklist", description: "Everything before first use" },
    { icon: Wand2, label: "Starter tools", description: "Presets, brand import, voice synth" },
    { icon: Building2, label: "Company profile", description: "Name, logo, org type" },
    { icon: Shield, label: "Plan & limits", description: "Seats and generation limits" },
  ],
  "/settings/clients": [
    { icon: Building2, label: "Organizations", description: "Client workspaces" },
    { icon: UserPlus, label: "Social accounts", description: "Profile links used everywhere" },
  ],
  "/settings/tags": [
    { icon: AtSign, label: "Account tags", description: "People & orgs to recommend" },
    { icon: Globe, label: "Profile links", description: "Validated platform URLs" },
  ],
  "/settings/team": [
    { icon: Users, label: "Members & invites", description: "Owner, admin, editor, reviewer, viewer" },
    { icon: ShieldCheck, label: "Roles & permissions", description: "Server-enforced limits" },
  ],
  "/settings/usage": [
    { icon: BarChart3, label: "Usage & activity", description: "Generation counts and audit log" },
  ],
  "/settings/notifications": [
    { icon: Bell, label: "Digest & went-out emails", description: "Daily digest and post notifications" },
    { icon: Users, label: "Recipients", description: "Who gets notified, and for which client" },
  ],
  "/settings/connections": [
    { icon: Users, label: "Client channels", description: "Connect LinkedIn, Instagram, Facebook, X, YouTube" },
    { icon: ShieldCheck, label: "Developer apps & keys", description: "Your own platform app credentials" },
  ],
  "/settings/email-provider": [
    { icon: Mail, label: "Email provider", description: "SendGrid, Gmail, Outlook, Apple Mail, SMTP" },
    { icon: Pause, label: "Global pause", description: "Stop all email with one switch" },
  ],
};

type OpenState = {
  key: string;
  title: string;
  icon: LucideIcon;
  items: HoverListItem[];
  rect: DOMRect;
} | null;

const Ctx = React.createContext<{
  open: OpenState;
  show: (v: NonNullable<OpenState>) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
  closeNow: () => void;
} | null>(null);

function useNavHover() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("NavHoverProvider missing");
  return ctx;
}

export function NavHoverProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState<OpenState>(null);
  const closeTimer = React.useRef<number | undefined>(undefined);

  const cancelClose = React.useCallback(() => {
    window.clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = React.useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(null), 160);
  }, []);

  const closeNow = React.useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setOpen(null);
  }, []);

  const show = React.useCallback((v: NonNullable<OpenState>) => {
    window.clearTimeout(closeTimer.current);
    setOpen((cur) => (cur && cur.key === v.key ? cur : v));
  }, []);

  // Close when the page scrolls underneath the panel or the viewport changes.
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  React.useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <Ctx.Provider value={{ open, show, scheduleClose, cancelClose, closeNow }}>
      {children}
      <NavHoverPanel />
    </Ctx.Provider>
  );
}


function NavHoverPanel() {
  const { open, scheduleClose, cancelClose, closeNow } = useNavHover();
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const left = Math.min(open.rect.right + 6, window.innerWidth - el.offsetWidth - 8);
    const top = Math.max(8, Math.min(open.rect.top, window.innerHeight - el.offsetHeight - 8));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      data-sidebar="hover-panel"
      role="menu"
      aria-label={`${open.title} contents`}
      className="sm-hover-panel fixed z-50 w-72 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-elevated"
      style={{ left: open.rect.right + 6, top: open.rect.top }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <div className="flex items-center gap-2 border-b border-sidebar-border/60 bg-sidebar-accent/40 px-3.5 py-2.5">
        <open.icon className="size-4 text-sidebar-primary" />
        <span className="font-display text-sm font-semibold">{open.title}</span>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-1.5">
        {open.items.map((it) => {
          const row = (
            <>
              <it.icon className="mt-0.5 size-4 shrink-0 text-sidebar-primary/70" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-tight">{it.label}</span>
                {it.description && (
                  <span className="mt-0.5 block text-[11px] leading-snug text-sidebar-foreground/60">
                    {it.description}
                  </span>
                )}
              </span>
              {it.to && <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-sidebar-foreground/40" />}
            </>
          );
          const cls = "sm-hover-item flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent";
          return it.to ? (
            <Link key={it.label} to={it.to} onClick={closeNow} className={cls}>
              {row}
            </Link>
          ) : (
            <div key={it.label} className={cls}>
              {row}
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

/** Wraps a sidebar menu button and opens its "what's inside" panel on hover/focus. */
export function NavHoverWrapper({
  href,
  title,
  icon,
  children,
}: {
  href: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(Ctx);
  const items = NAV_HOVER_LISTS[href];
  const isMobile = useIsMobile();
  const ref = React.useRef<HTMLDivElement>(null);
  const openTimer = React.useRef<number | undefined>(undefined);
  const active = !!items && !isMobile;

  React.useEffect(() => () => window.clearTimeout(openTimer.current), []);

  if (!active || !ctx) return <>{children}</>;

  const show = () => {
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) ctx.show({ key: href, title, icon, items, rect });
    }, 90);
  };

  const hide = () => {
    window.clearTimeout(openTimer.current);
    ctx.scheduleClose();
  };

  return (
    <div ref={ref} className="w-full" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onClick={ctx.closeNow}>
      {children}
    </div>
  );
}

