import { Link, useLocation } from "react-router-dom";
import { useWorkspace, SETUP_STEPS } from "@/hooks/useWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";
import type { Accent } from "@/lib/cardAccents";

const STEP_ACCENTS: Record<string, Accent> = {
  company: "violet", org_type: "gold", first_entity: "cyan", brand_voice: "magenta",
  cadence: "violet", team: "magenta", ai_tools: "cyan", email: "gold",
};

export function SetupChecklist() {
  const ws = useWorkspace();
  const { pathname, search } = useLocation();
  if (!ws.canManage || !ws.settings) return null;
  const done = ws.setupCompleted === ws.setupTotal;
  const selectedStep = pathname === "/setup" ? new URLSearchParams(search).get("step") : null;
  return (
    <Card accent="cyan" className="sm-setup-banner">
      <CardContent className="py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold">{done ? "Workspace setup complete" : "Finish setting up your workspace"}</p>
            <p className="text-xs text-muted-foreground font-mono">{ws.setupCompleted} / {ws.setupTotal} steps</p>
          </div>
          <Progress value={(ws.setupCompleted / ws.setupTotal) * 100} className="w-40" />
          <Button asChild size="sm" variant={done ? "outline" : "default"}><Link to="/setup">{done ? "Review setup" : "Continue setup"}</Link></Button>
        </div>
        <nav aria-label="Setup steps" className="sm-setup-steps">
          {SETUP_STEPS.map((s) => {
            const complete = !!ws.progress[s.key];
            const current = selectedStep === s.key;
            const status = complete ? "complete" : "incomplete";
            return (
              <Link
                key={s.key}
                to={`/setup?step=${s.key}`}
                aria-current={current ? "step" : undefined}
                className="sm-localnav-link sm-lit-btn"
                data-accent={STEP_ACCENTS[s.key] ?? "neutral"}
                data-selected={current ? "true" : undefined}
              >
                <span className="sm-setup-status" data-state={status} title={`${s.title}: ${status}`}>
                  {complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span className="sr-only">{s.title}: {status}</span>
                </span>
                {s.title}
              </Link>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
