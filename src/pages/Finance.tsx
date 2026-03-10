import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { Plus, TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceMonthlySummary,
  useFinanceTransactions,
  useFinanceBudgets,
  useFinanceSavingsGoals,
  useCreateTransaction,
  CATEGORY_LABELS,
} from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { format } from "date-fns";
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Finance = () => {
  const { householdId } = useHousehold();
  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: summary, isLoading } = useFinanceMonthlySummary(householdId);
  const { data: transactions } = useFinanceTransactions(householdId, { month: currentMonth });
  const { data: budgets } = useFinanceBudgets(householdId, currentMonth);
  const { data: savingsGoals } = useFinanceSavingsGoals(householdId);
  const createTransaction = useCreateTransaction(householdId);
  const [showAddTx, setShowAddTx] = useState(false);

  const budgetChartData = (budgets || []).map((b) => ({
    category: CATEGORY_LABELS[b.category] || b.category,
    planned: Number(b.planned_amount),
    actual: summary?.categoryBreakdown?.[b.category] || 0,
  }));

  const overBudget = budgetChartData.filter((d) => d.actual > d.planned);
  const recentTransactions = (transactions || []).slice(0, 5);

  if (isLoading) {
    return (
      <div className="page-container">
        <Header />
        <main className="page-content">
          <PageLoading cards={4} />
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-heading">Finance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(), "MMMM yyyy")}</p>
          </div>
          <Button size="sm" onClick={() => setShowAddTx(true)} className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <FinanceNav />

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> Income
              </div>
              <p className="text-lg font-bold">{formatINR(summary?.income || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingDown className="w-3.5 h-3.5" /> Spent
              </div>
              <p className="text-lg font-bold">{formatINR(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <PiggyBank className="w-3.5 h-3.5" /> Saved
              </div>
              <p className={`text-lg font-bold ${(summary?.savings || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                {formatINR(summary?.savings || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Wallet className="w-3.5 h-3.5" /> Cash Left
              </div>
              <p className="text-lg font-bold">{formatINR(summary?.cashLeft || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {overBudget.length > 0 && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive mb-1">Over Budget</p>
              <div className="space-y-1">
                {overBudget.map((d) => (
                  <p key={d.category} className="text-xs text-muted-foreground">
                    {d.category}: {formatINR(d.actual)} / {formatINR(d.planned)}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {budgetChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={budgetChartData} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`} />
                    <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Bar dataKey="planned" fill="hsl(var(--secondary))" name="Planned" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Savings Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(!savingsGoals || savingsGoals.length === 0) ? (
                <p className="text-sm text-muted-foreground">No savings goals yet</p>
              ) : (
                savingsGoals.filter(g => g.status === "active").slice(0, 3).map((goal) => {
                  const pct = goal.target_amount > 0 ? Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100) : 0;
                  return (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-muted-foreground text-xs">{Math.round(pct)}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {formatINR(Number(goal.current_amount))} / {formatINR(Number(goal.target_amount))}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No transactions yet</p>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{tx.description || CATEGORY_LABELS[tx.category] || tx.category}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.transaction_date), "MMM d")}</p>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ml-3 ${tx.type === "income" ? "text-success" : "text-foreground"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatINR(Number(tx.amount))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      <QuickActionButton
        items={[{ label: "Add Expense", icon: Plus, onClick: () => setShowAddTx(true) }]}
        className="sm:hidden"
      />

      <TransactionDialog
        open={showAddTx}
        onOpenChange={setShowAddTx}
        onSave={(data) => createTransaction.mutate(data)}
      />
    </div>
  );
};

export default Finance;
