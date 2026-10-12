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
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold">{done ? "Workspace setup complete" : "Finish setting up your workspace"}</p>
            <p className="text-xs text-muted-foreground font-mono">{ws.setupCompleted} / {ws.setupTotal} steps</p>
          </div>
          <Progress value={(ws.setupCompleted / ws.setupTotal) * 100} className="w-40" />
          <Button asChild size="sm" variant={done ? "outline" : "default"}><Link to="/setup">{done ? "Review setup" : "Continue setup"}</Link></Button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {SETUP_STEPS.map((s) => (
            <Link key={s.key} to={`/setup?step=${s.key}`} className="flex items-center gap-1 text-xs hover:underline">
              {ws.progress[s.key] ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-success" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}{s.title}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
