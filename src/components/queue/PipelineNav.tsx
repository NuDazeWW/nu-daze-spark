import { NavLink } from "react-router-dom";
import { ListTodo, CheckCircle2, Send } from "lucide-react";

const STEPS = [
  { to: "/queue", label: "Working pipeline", hint: "Drafts & in review", Icon: ListTodo },
  { to: "/approved", label: "Ready to go", hint: "Approved & scheduled", Icon: CheckCircle2 },
  { to: "/publishing", label: "Live & delivered", hint: "Published history", Icon: Send },
];

/** One pipeline, three views: shared switcher across Queue, Approved and Publishing. */
export function PipelineNav({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Content pipeline" className={`grid grid-cols-3 gap-1 rounded-lg border bg-card p-1 ${className}`}>
      {STEPS.map(({ to, label, hint, Icon }, i) => (
        <NavLink key={to} to={to} end
          className={({ isActive }) => `flex min-w-0 items-center gap-2 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
          <span className="font-mono text-xs opacity-70">{i + 1}</span>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{label}</span>
            <span className="hidden truncate text-xs opacity-80 md:block">{hint}</span>
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
