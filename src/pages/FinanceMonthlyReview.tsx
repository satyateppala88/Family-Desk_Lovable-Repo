import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceMonthlySummary,
  useFinanceBudgets,
  useFinanceSavingsGoals,
  CATEGORY_LABELS,
} from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb, PartyPopper } from "lucide-react";

const FinanceMonthlyReview = () => {
  const { householdId } = useHousehold();
  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: summary } = useFinanceMonthlySummary(householdId, currentMonth);
  const { data: budgets } = useFinanceBudgets(householdId, currentMonth);
  const { data: goals } = useFinanceSavingsGoals(householdId);

  const savingsRate = summary && summary.income > 0
    ? Math.round(((summary.income - summary.expenses) / summary.income) * 100)
    : 0;

  const overBudgetCategories = (budgets || []).filter((b) => {
    const actual = summary?.categoryBreakdown?.[b.category] || 0;
    return actual > Number(b.planned_amount);
  });

  const underBudgetCategories = (budgets || []).filter((b) => {
    const actual = summary?.categoryBreakdown?.[b.category] || 0;
    return actual <= Number(b.planned_amount) * 0.8 && Number(b.planned_amount) > 0;
  });

  const categoryEntries = Object.entries(summary?.categoryBreakdown || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  const activeGoals = (goals || []).filter((g) => g.status === "active");

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4 animate-fade-in">
        <div>
          <h1 className="page-heading">Monthly Review</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "MMMM yyyy")}</p>
        </div>

        <FinanceNav />

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-label mb-1">Income</p>
              <p className="text-lg font-bold text-foreground">{formatINR(summary?.income || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-label mb-1">Spent</p>
              <p className="text-lg font-bold text-foreground">{formatINR(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-label mb-1">Saved</p>
              <p className={`text-lg font-bold ${savingsRate >= 20 ? "text-success" : savingsRate >= 0 ? "text-warning" : "text-destructive"}`}>
                {savingsRate}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Wins */}
        {underBudgetCategories.length > 0 && (
          <Card className="border-success/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" /> Wins This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {underBudgetCategories.map((b) => (
                <div key={b.id} className="flex items-start gap-2 text-sm">
                  <Badge variant="success" className="mt-0.5 shrink-0">Under</Badge>
                  <span className="text-muted-foreground">{CATEGORY_LABELS[b.category]} stayed well under budget</span>
                </div>
              ))}
              {savingsRate >= 20 && (
                <div className="flex items-start gap-2 text-sm">
                  <Badge variant="success" className="mt-0.5 shrink-0">{savingsRate}%</Badge>
                  <span className="text-muted-foreground">Saved {savingsRate}% of income — great discipline!</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Risks */}
        {overBudgetCategories.length > 0 && (
          <Card className="border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Areas to Watch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overBudgetCategories.map((b) => {
                const actual = summary?.categoryBreakdown?.[b.category] || 0;
                return (
                  <div key={b.id} className="flex items-start gap-2 text-sm">
                    <Badge variant="destructive" className="mt-0.5 shrink-0">Over</Badge>
                    <span className="text-muted-foreground">
                      {CATEGORY_LABELS[b.category]}: spent {formatINR(actual)} vs {formatINR(Number(b.planned_amount))} budget
                    </span>
                  </div>
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
                <TrendingDown className="w-4 h-4 text-muted-foreground" /> Top Spending
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryEntries.map(([cat, amount]) => {
                const budget = (budgets || []).find(b => b.category === cat);
                const pct = budget ? Math.min(100, Math.round(((amount as number) / Number(budget.planned_amount)) * 100)) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                      <span className="text-muted-foreground">{formatINR(amount as number)}</span>
                    </div>
                    {budget && <Progress value={pct} className="h-1.5" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Savings Goals Progress */}
        {activeGoals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Savings Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeGoals.map((g) => {
                const pct = Number(g.target_amount) > 0
                  ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
                  : 0;
                return (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{g.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{formatINR(Number(g.current_amount))} of {formatINR(Number(g.target_amount))}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-module-finance" /> Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {savingsRate < 10 && (
              <p className="text-sm text-muted-foreground">Try to increase your savings rate to at least 20% by reducing non-essential spending.</p>
            )}
            {overBudgetCategories.length > 0 && (
              <p className="text-sm text-muted-foreground">Review your {overBudgetCategories.map((b) => CATEGORY_LABELS[b.category]).join(", ")} spending — consider setting stricter limits.</p>
            )}
            {activeGoals.length === 0 && (
              <p className="text-sm text-muted-foreground">Set a savings goal to stay motivated — even a small emergency fund helps.</p>
            )}
            {summary && summary.transactionCount === 0 && (
              <p className="text-sm text-muted-foreground">Start tracking your transactions to get meaningful insights next month.</p>
            )}
            {savingsRate >= 20 && overBudgetCategories.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-success">
                <PartyPopper className="w-4 h-4 shrink-0" />
                <span>You're doing great! Budget discipline is strong and savings are healthy.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default FinanceMonthlyReview;
