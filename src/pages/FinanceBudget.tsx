import { useState } from "react";
import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
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

const FinanceBudget = () => {
  const { householdId } = useHousehold();
  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: budgets, isLoading } = useFinanceBudgets(householdId, currentMonth);
  const { data: summary } = useFinanceMonthlySummary(householdId, currentMonth);
  const upsertBudget = useUpsertBudget(householdId);
  const [showAdd, setShowAdd] = useState(false);

  const totalPlanned = (budgets || []).reduce((s, b) => s + Number(b.planned_amount), 0);
  const totalActual = summary?.expenses || 0;

  const budgetRows = (budgets || []).map((b) => {
    const actual = summary?.categoryBreakdown?.[b.category] || 0;
    const pct = Number(b.planned_amount) > 0 ? Math.min(100, (actual / Number(b.planned_amount)) * 100) : 0;
    const over = actual > Number(b.planned_amount);
    return { ...b, actual, pct, over };
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 pb-20 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Budget Planner</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Budget
          </Button>
        </div>

        <FinanceNav />

        {/* Overall summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {format(new Date(), "MMMM yyyy")}
              </span>
              <span className="text-sm">
                {formatINR(totalActual)} / {formatINR(totalPlanned)}
              </span>
            </div>
            <Progress
              value={totalPlanned > 0 ? Math.min(100, (totalActual / totalPlanned) * 100) : 0}
              className="h-2"
            />
          </CardContent>
        </Card>

        {/* Category budgets */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : budgetRows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">No budgets set for this month</p>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                Set your first budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {budgetRows.map((row) => (
              <Card key={row.id} className={row.over ? "border-destructive/30" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {CATEGORY_LABELS[row.category] || row.category}
                    </span>
                    <span className={`text-xs ${row.over ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {row.over ? "Over budget" : `${Math.round(row.pct)}%`}
                    </span>
                  </div>
                  <Progress value={row.pct} className="h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Spent: {formatINR(row.actual)}</span>
                    <span>Budget: {formatINR(Number(row.planned_amount))}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BudgetDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(data) => upsertBudget.mutate({ month: currentMonth, ...data })}
        existingCategories={(budgets || []).map((b) => b.category)}
      />

      <Footer />
      
    </div>
  );
};

export default FinanceBudget;
