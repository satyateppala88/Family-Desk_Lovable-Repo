import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceMonthlySummary,
  useFinanceBudgets,
  useFinanceSavingsGoals,
  CATEGORY_LABELS,
} from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

const FinanceMonthlyReview = () => {
  const { householdId } = useHousehold();
  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: summary } = useFinanceMonthlySummary(householdId, currentMonth);
  const { data: budgets } = useFinanceBudgets(householdId, currentMonth);
  const { data: goals } = useFinanceSavingsGoals(householdId);

  const savingsRate = summary && summary.income > 0
    ? Math.round(((summary.income - summary.expenses) / summary.income) * 100)
    : 0;

  // Identify wins and risks
  const overBudgetCategories = (budgets || []).filter((b) => {
    const actual = summary?.categoryBreakdown?.[b.category] || 0;
    return actual > Number(b.planned_amount);
  });

  const underBudgetCategories = (budgets || []).filter((b) => {
    const actual = summary?.categoryBreakdown?.[b.category] || 0;
    return actual <= Number(b.planned_amount) * 0.8 && Number(b.planned_amount) > 0;
  });

  // Top spending categories
  const categoryEntries = Object.entries(summary?.categoryBreakdown || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  const activeGoals = (goals || []).filter((g) => g.status === "active");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 pb-20 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Monthly Review</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "MMMM yyyy")}</p>

        <FinanceNav />

        {/* Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Month at a Glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-sm font-semibold">{formatINR(summary?.income || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="text-sm font-semibold">{formatINR(summary?.expenses || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Savings Rate</p>
                <p className={`text-sm font-semibold ${savingsRate >= 20 ? "text-[hsl(var(--success))]" : savingsRate >= 0 ? "text-[hsl(var(--warning))]" : "text-destructive"}`}>
                  {savingsRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wins */}
        {underBudgetCategories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" /> Wins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {underBudgetCategories.map((b) => (
                <p key={b.id} className="text-sm text-muted-foreground">
                  ✓ {CATEGORY_LABELS[b.category]} stayed well under budget
                </p>
              ))}
              {savingsRate >= 20 && (
                <p className="text-sm text-muted-foreground">✓ Saved {savingsRate}% of income — great discipline!</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Risks */}
        {overBudgetCategories.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Areas to Watch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {overBudgetCategories.map((b) => {
                const actual = summary?.categoryBreakdown?.[b.category] || 0;
                return (
                  <p key={b.id} className="text-sm text-muted-foreground">
                    ⚠ {CATEGORY_LABELS[b.category]}: spent {formatINR(actual)} vs {formatINR(Number(b.planned_amount))} budget
                  </p>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Top Spending */}
        {categoryEntries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> Top Spending
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoryEntries.map(([cat, amount]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span>{CATEGORY_LABELS[cat] || cat}</span>
                  <span className="font-medium">{formatINR(amount as number)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Savings Goals Progress */}
        {activeGoals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Savings Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeGoals.map((g) => {
                const pct = Number(g.target_amount) > 0
                  ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
                  : 0;
                return (
                  <div key={g.id} className="flex justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">{pct}% ({formatINR(Number(g.current_amount))})</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {savingsRate < 10 && (
              <p>💡 Try to increase your savings rate to at least 20% by reducing non-essential spending.</p>
            )}
            {overBudgetCategories.length > 0 && (
              <p>💡 Review your {overBudgetCategories.map((b) => CATEGORY_LABELS[b.category]).join(", ")} spending — consider setting stricter limits.</p>
            )}
            {activeGoals.length === 0 && (
              <p>💡 Set a savings goal to stay motivated — even a small emergency fund helps.</p>
            )}
            {summary && summary.transactionCount === 0 && (
              <p>💡 Start tracking your transactions to get meaningful insights next month.</p>
            )}
            {savingsRate >= 20 && overBudgetCategories.length === 0 && (
              <p>🎉 You're doing great! Budget discipline is strong and savings are healthy.</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
      
    </div>
  );
};

export default FinanceMonthlyReview;
