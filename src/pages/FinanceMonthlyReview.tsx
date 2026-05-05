import { Header } from "@/components/layout/Header";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceMonthlySummary,
  useFinanceBudgets,
  useFinanceSavingsGoals,
  CATEGORY_LABELS,
} from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb, PartyPopper, Shield, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { resolveCategoryLabel } from "@/components/finance/CategorySelect";

const FinanceMonthlyReview = () => {
  const { householdId } = useHousehold();
  const currentMonth = format(new Date(), "yyyy-MM");
  const { categories: customCats } = useCustomCategories("transaction");
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

  const hasNoData = !summary || (summary.transactionCount === 0);

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4 animate-fade-in">
        <div>
          <h1 className="page-heading">Monthly Review</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "MMMM yyyy")} — your household's financial health</p>
        </div>

        

        {/* Privacy cue */}
        <div className="trust-badge" role="status">
          <Shield className="h-3 w-3" aria-hidden="true" />
          <span>Based on your household's tracked transactions</span>
        </div>

        {hasNoData ? (
          <EmptyState
            icon={BarChart3}
            title="Your monthly review is almost ready"
            description="Add 3 or more transactions this month and we'll generate a personalised spending review with trends, wins, and tips."
            encouragement="Even a few entries will unlock useful patterns for your household."
            action={{ label: "Add Transactions", onClick: () => window.location.href = "/finance/transactions" }}
          />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-label mb-1">Earned</p>
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
                  <p className={cn(
                    "text-lg font-bold",
                    savingsRate >= 20 ? "text-[hsl(var(--success))]" : savingsRate >= 0 ? "text-warning" : "text-destructive"
                  )}>
                    {savingsRate}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Wins — celebration moment */}
            {(underBudgetCategories.length > 0 || savingsRate >= 20) && (
              <Card className="border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" aria-hidden="true" /> What went well
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {underBudgetCategories.map((b) => (
                    <div key={b.id} className="flex items-start gap-2 text-sm">
                      <Badge variant="success" className="mt-0.5 shrink-0">Under</Badge>
                      <span className="text-muted-foreground">{CATEGORY_LABELS[b.category]} stayed well within budget — great restraint!</span>
                    </div>
                  ))}
                  {savingsRate >= 20 && (
                    <div className="flex items-start gap-2 text-sm animate-celebrate-pop">
                      <Badge variant="success" className="mt-0.5 shrink-0">{savingsRate}%</Badge>
                      <span className="text-muted-foreground">You saved {savingsRate}% of income this month — that's excellent discipline!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Risks */}
            {overBudgetCategories.length > 0 && (
              <Card className="border-destructive/20" role="alert">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" /> Areas to watch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overBudgetCategories.map((b) => {
                    const actual = summary?.categoryBreakdown?.[b.category] || 0;
                    return (
                      <div key={b.id} className="flex items-start gap-2 text-sm">
                        <Badge variant="destructive" className="mt-0.5 shrink-0">Over</Badge>
                        <span className="text-muted-foreground">
                          {CATEGORY_LABELS[b.category]}: spent {formatINR(actual)} against a {formatINR(Number(b.planned_amount))} budget
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
                    <TrendingDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" /> Where the money went
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
                    <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" /> Savings Progress
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

            {/* Recommendations — with AI trust cue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[hsl(var(--module-finance))]" aria-hidden="true" /> Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[10px] text-muted-foreground/60 italic">Based on your household's spending and budget data this month</p>
                {savingsRate < 10 && (
                  <p className="text-sm text-muted-foreground">Consider aiming for at least 20% savings — small cutbacks on dining out or subscriptions can make a difference.</p>
                )}
                {overBudgetCategories.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Your {overBudgetCategories.map((b) => CATEGORY_LABELS[b.category]).join(" and ")} spending ran over — try setting a weekly allowance to stay on track.
                  </p>
                )}
                {activeGoals.length === 0 && (
                  <p className="text-sm text-muted-foreground">Setting even a small savings goal can keep you motivated — how about an emergency fund?</p>
                )}
                {summary && summary.transactionCount < 10 && (
                  <p className="text-sm text-muted-foreground">The more consistently you log transactions, the better these insights get.</p>
                )}
                {savingsRate >= 20 && overBudgetCategories.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
                    <PartyPopper className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Your household's finances are in great shape this month. Keep it up!</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default FinanceMonthlyReview;
