import { Link } from "react-router-dom";
import { useWorkspace, SETUP_STEPS } from "@/hooks/useWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

export function SetupChecklist() {
  const ws = useWorkspace();
  if (!ws.canManage || !ws.settings) return null;
  const done = ws.setupCompleted === ws.setupTotal;
  return (
    <Card className="sm-setup-banner">
      <CardContent className="py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold">{done ? "Workspace setup complete" : "Finish setting up your workspace"}</p>
            <p className="text-xs text-muted-foreground font-mono">{ws.setupCompleted} / {ws.setupTotal} steps</p>
          </div>
          <Progress value={(ws.setupCompleted / ws.setupTotal) * 100} className="w-40" />
          <Button asChild size="sm" variant={done ? "outline" : "default"}><Link to="/setup">{done ? "Review setup" : "Continue setup"}</Link></Button>
        </div>
        <nav aria-label="Setup steps" className="flex flex-wrap gap-2">
          {SETUP_STEPS.map((s) => {
            const complete = !!ws.progress[s.key];
            const current = !done && s.key === SETUP_STEPS.find((x) => !ws.progress[x.key])?.key;
            return (
              <Link key={s.key} to={`/setup?step=${s.key}`} aria-current={current ? "step" : undefined}
                className="sm-lit inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                data-accent={current ? "cyan" : "neutral"} data-selected={current} data-interactive="true">
                {complete ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-success" aria-label="Complete" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-label="Not complete" />}{s.title}
              </Link>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
