import { NavLink } from "react-router-dom";
import { ListTodo, CheckCircle2, Send } from "lucide-react";

const STEPS = [
  { to: "/queue", label: "Daily Queue", hint: "Drafts & in review", Icon: ListTodo },
  { to: "/approved", label: "Approved Content", hint: "Approved & awaiting publication", Icon: CheckCircle2 },
  { to: "/publishing", label: "Publishing Status", hint: "Scheduled & delivery history", Icon: Send },
];

/** One pipeline, three views; the same bounded one-row switcher on every view. */
export function PipelineNav({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Content pipeline" className={`sm-localnav sm-pipeline-nav ${className}`}>
      {STEPS.map(({ to, label, hint, Icon }) => (
        <NavLink key={to} to={to} end title={hint} data-accent="violet"
          className="sm-localnav-link sm-lit-btn">
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium">{label}</span>
          <span className="sm-pipeline-hint opacity-75">· {hint}</span>
        </NavLink>
      ))}
    </nav>
  );
}
