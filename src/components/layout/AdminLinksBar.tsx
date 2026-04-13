import { ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const adminLinks = [
  { label: "Careers Admin", href: "https://nudaze.com/careers/admin" },
  { label: "Insights Admin", href: "https://nudaze.com/insights/admin" },
];

export function AdminLinksBar() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-4 border-b border-border/50 bg-card/50 px-4 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        NuDaze Admin
      </span>
      {adminLinks.map((link) => (
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
      ))}
    </div>
  );
}
