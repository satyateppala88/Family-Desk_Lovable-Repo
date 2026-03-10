import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { Plus, Target } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceBudgets,
  useFinanceMonthlySummary,
  useUpsertBudget,
  CATEGORY_LABELS,
} from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { BudgetDialog } from "@/components/finance/BudgetDialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const FinanceBudget = () => {
  const { householdId } = useHousehold();
  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: budgets, isLoading } = useFinanceBudgets(householdId, currentMonth);
  const { data: summary } = useFinanceMonthlySummary(householdId, currentMonth);
  const upsertBudget = useUpsertBudget(householdId);
  const [showAdd, setShowAdd] = useState(false);

  const totalPlanned = (budgets || []).reduce((s, b) => s + Number(b.planned_amount), 0);
  const totalActual = summary?.expenses || 0;
  const overallPct = totalPlanned > 0 ? Math.min(100, (totalActual / totalPlanned) * 100) : 0;

  const budgetRows = (budgets || []).map((b) => {
    const actual = summary?.categoryBreakdown?.[b.category] || 0;
    const pct = Number(b.planned_amount) > 0 ? Math.min(100, (actual / Number(b.planned_amount)) * 100) : 0;
    const over = actual > Number(b.planned_amount);
    return { ...b, actual, pct, over };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-heading">Budget</h1>
          <Button size="sm" onClick={() => setShowAdd(true)} className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <FinanceNav />

        {/* Overall progress */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{format(new Date(), "MMMM yyyy")}</span>
              <span className={cn("font-medium", overallPct > 90 ? "text-destructive" : "")}>
                {formatINR(totalActual)} / {formatINR(totalPlanned)}
              </span>
            </div>
            <Progress value={overallPct} className="h-2" />
            <p className="text-[11px] text-muted-foreground text-right">{Math.round(overallPct)}% used</p>
          </CardContent>
        </Card>

        {/* Category budgets */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Card key={i}><CardContent className="p-4 h-20" /></Card>)}
          </div>
        ) : budgetRows.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No budgets set"
            description="Set category budgets to track your spending"
            action={{ label: "Set Budget", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <div className="space-y-2">
            {budgetRows.map((row) => (
              <Card key={row.id} className={cn(row.over && "border-destructive/20")}>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {CATEGORY_LABELS[row.category] || row.category}
                    </span>
                    <div className="text-right">
                      <span className={cn(
                        "text-xs font-medium",
                        row.over ? "text-destructive" : row.pct > 75 ? "text-warning" : "text-muted-foreground"
                      )}>
                        {row.over ? "Over!" : `${Math.round(row.pct)}%`}
                      </span>
                    </div>
                  </div>
                  <Progress value={row.pct} className="h-1.5" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatINR(row.actual)} spent</span>
                    <span>{formatINR(Number(row.planned_amount))} budget</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <QuickActionButton
        items={[{ label: "Add Budget", icon: Plus, onClick: () => setShowAdd(true) }]}
        className="sm:hidden"
      />

      <BudgetDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(data) => upsertBudget.mutate({ month: currentMonth, ...data })}
        existingCategories={(budgets || []).map((b) => b.category)}
      />
    </div>
  );
};

export default FinanceBudget;
