import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  monthLabel: string;
  totalPlanned: number;
  totalActual: number;
  onTrack: number;
  atRisk: number;
  overBudget: number;
}

export function BudgetHealthCard({
  monthLabel,
  totalPlanned,
  totalActual,
  onTrack,
  atRisk,
  overBudget,
}: Props) {
  if (totalPlanned <= 0) return null;
  const pct = Math.min(100, Math.round((totalActual / totalPlanned) * 100));

  let healthLabel = "Healthy";
  let healthClass = "text-success";
  let HealthIcon = CheckCircle2;
  if (overBudget > 0) {
    healthLabel = "Over budget";
    healthClass = "text-destructive";
    HealthIcon = XCircle;
  } else if (atRisk > 0) {
    healthLabel = "Watch out";
    healthClass = "text-warning";
    HealthIcon = AlertTriangle;
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Budget health · {monthLabel}</div>
          <div className={cn("flex items-center gap-1 text-xs font-semibold", healthClass)}>
            <HealthIcon className="w-3.5 h-3.5" />
            {healthLabel}
          </div>
        </div>
        <div className="space-y-1">
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{pct}% used</span>
            <span>
              <PrivateValue value={totalActual} /> of <PrivateValue value={totalPlanned} />
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="w-3 h-3" /> {onTrack} on track
          </span>
          {atRisk > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="w-3 h-3" /> {atRisk} at risk
            </span>
          )}
          {overBudget > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="w-3 h-3" /> {overBudget} over budget
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}