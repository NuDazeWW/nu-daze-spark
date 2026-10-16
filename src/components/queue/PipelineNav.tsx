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
    <nav aria-label="Content pipeline" className={`flex w-fit flex-wrap items-center gap-1 rounded-full border bg-card p-1 ${className}`}>
      {STEPS.map(({ to, label, hint, Icon }) => (
        <NavLink key={to} to={to} end title={hint}
          className={({ isActive }) => `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
