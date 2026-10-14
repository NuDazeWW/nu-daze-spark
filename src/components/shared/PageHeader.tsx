import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import headerBirdUrl from "@/assets/brand/socialmotive-header-bird.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

// Contextual "where next" links so nobody gets lost between screens.
const RELATED: Record<string, { to: string; label: string }[]> = {
  "/media-studio": [{ to: "/settings/connections?tab=ai", label: "AI tool connections" }, { to: "/settings/brand-kit", label: "Brand Kit" }, { to: "/assets", label: "Asset Library" }],
  "/settings/connections": [{ to: "/media-studio", label: "Motive Media Studio" }, { to: "/setup", label: "Workspace setup" }],
  "/settings/brand-kit": [{ to: "/media-studio", label: "Motive Media Studio" }],
  "/setup": [{ to: "/settings/workspace", label: "Workspace settings" }, { to: "/help", label: "Help" }],
  "/queue": [{ to: "/planner", label: "Content Planner" }, { to: "/approved", label: "Approved Content" }],
  "/approved": [{ to: "/queue", label: "Daily Queue" }, { to: "/publishing", label: "Publishing Status" }],
  "/generator": [{ to: "/briefs", label: "Campaign Briefs" }, { to: "/queue", label: "Daily Queue" }],
  "/briefs": [{ to: "/generator", label: "Social Post Generator" }],
  "/planner": [{ to: "/queue", label: "Daily Queue" }],
  "/strategy": [{ to: "/setup", label: "Workspace setup" }],
  "/assets": [{ to: "/media-studio", label: "Create with AI" }],
};

export function PageHeader({ title, description, children, linksMenu = false }: PageHeaderProps & { linksMenu?: boolean }) {
  const { pathname } = useLocation();
  const isSettings = pathname.startsWith("/settings") || pathname === "/setup";
  const related = RELATED[pathname] ?? [];
  // Dashboard and Media Studio render their own approved header art.
  const showArt = pathname !== "/" && pathname !== "/media-studio" && !linksMenu;
  const links = [
    ...(!isSettings ? [{ to: "/settings/workspace", label: "Workspace settings" }] : []),
    ...related,
  ];
  return (
    <div className="sm-page-header mb-6 space-y-3">
      {pathname !== "/" && linksMenu && (
        <nav aria-label="Quick navigation" className="sm-page-links flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs"><Link to="/" className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" />Back to workspace</Link></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">Shortcuts <ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {links.map((r) => <DropdownMenuItem key={r.to} asChild><Link to={r.to}>{r.label}</Link></DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      )}
      {pathname !== "/" && !linksMenu && (
        <nav aria-label="Quick navigation" className="sm-page-links flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />Back to workspace
            </Link>
          </Button>
          {!isSettings && (
            <Button asChild variant="ghost" size="sm" className="border border-border/60">
              <Link to="/settings/workspace">Workspace settings</Link>
            </Button>
          )}
          {related.map((r) => (
            <Button asChild key={r.to} variant="ghost" size="sm" className="border border-border/60">
              <Link to={r.to}>{r.label}</Link>
            </Button>
          ))}
        </nav>
      )}
      <div className="sm-page-title-row flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-foreground break-words">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {showArt && (
          <div className="sm-header-art" aria-hidden="true">
            <img src={headerBirdUrl} alt="" className="sm-header-bird" />
            <p className="sm-dash-tagline">Turn strategy<br />into <span className="sm-dash-em-cyan">social</span> <span className="sm-dash-em-lime">momentum.</span></p>
          </div>
        )}
        {children && <div className="sm-page-actions flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
