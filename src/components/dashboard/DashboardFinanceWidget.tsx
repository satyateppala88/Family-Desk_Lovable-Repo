import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useHousehold } from "@/hooks/useHousehold";
import { useFinanceMonthlySummary } from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { Plus } from "lucide-react";

export const DashboardFinanceWidget = () => {
  const { householdId } = useHousehold();
  const { data: summary } = useFinanceMonthlySummary(householdId);

  const healthPercent = summary && summary.income > 0
    ? Math.round(((summary.income - summary.expenses) / summary.income) * 100)
    : 0;

  const healthColor = healthPercent >= 20 ? "text-[hsl(var(--success))]" : healthPercent >= 0 ? "text-[hsl(var(--warning))]" : "text-destructive";

  return (
    <Link to="/finance" className="block">
      <Card className="h-full hover:shadow-sm transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Finance</span>
            <span className={`text-xs font-normal ${healthColor}`}>
              {summary ? `${healthPercent}% saved` : "–"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!summary || summary.transactionCount === 0 ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-sm text-muted-foreground">No transactions this month</p>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add your first transaction
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Spent</span>
                <span className="text-sm font-medium">{formatINR(summary.expenses)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Income</span>
                <span className="text-sm font-medium">{formatINR(summary.income)}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">View all →</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
