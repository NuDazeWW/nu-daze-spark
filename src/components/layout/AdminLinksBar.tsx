import { ExternalLink, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const adminLinks = [
  { label: "Careers Admin", href: "https://nudaze.com/careers/admin" },
  { label: "Insights Admin", href: "https://nudaze.com/insights/admin" },
];

export function AdminLinksBar() {
  const { user, isAdmin } = useAuth();
  const canAccess = Boolean(user) && isAdmin;
  const lockTitle = user
    ? "You don't have permission to access admin tools"
    : "Sign in to access admin tools";

  return (
    <div className="flex items-center gap-4 border-b border-border/50 bg-card/50 px-4 py-1.5">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {!canAccess && <Lock className="h-3 w-3" />}
        ADMIN
      </span>
      {adminLinks.map((link) =>
        canAccess ? (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors"
          >
            {link.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span
            key={link.href}
            title={lockTitle}
            aria-disabled="true"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 cursor-not-allowed"
          >
            <Lock className="h-3 w-3" />
            {link.label}
          </span>
        ),
      )}
    </div>
  );
}
