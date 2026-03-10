import { useState } from "react";
import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Budget vs actual chart data
  const budgetChartData = (budgets || []).map((b) => ({
    category: CATEGORY_LABELS[b.category] || b.category,
    planned: Number(b.planned_amount),
    actual: summary?.categoryBreakdown?.[b.category] || 0,
  }));

  // Over-budget categories
  const overBudget = budgetChartData.filter((d) => d.actual > d.planned);

  const recentTransactions = (transactions || []).slice(0, 5);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 pb-20">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
          <Button size="sm" onClick={() => setShowAddTx(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <FinanceNav />

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> Income
              </div>
              <p className="text-lg font-semibold">{formatINR(summary?.income || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingDown className="w-3.5 h-3.5" /> Spent
              </div>
              <p className="text-lg font-semibold">{formatINR(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <PiggyBank className="w-3.5 h-3.5" /> Saved
              </div>
              <p className={`text-lg font-semibold ${(summary?.savings || 0) >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                {formatINR(summary?.savings || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Wallet className="w-3.5 h-3.5" /> Cash Left
              </div>
              <p className="text-lg font-semibold">{formatINR(summary?.cashLeft || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Over-budget alerts */}
        {overBudget.length > 0 && (
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive mb-1">⚠ Over Budget</p>
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

        <div className="grid gap-4 md:grid-cols-2">
          {/* Budget vs Actual chart */}
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
                    <Bar dataKey="actual" fill="hsl(var(--foreground))" name="Actual" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Savings Goals */}
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
                        <span>{goal.name}</span>
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
          <CardContent className="space-y-2">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm">{tx.description || CATEGORY_LABELS[tx.category] || tx.category}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.transaction_date), "MMM d")}</p>
                  </div>
                  <span className={`text-sm font-medium ${tx.type === "income" ? "text-[hsl(var(--success))]" : ""}`}>
                    {tx.type === "income" ? "+" : "-"}{formatINR(Number(tx.amount))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      <TransactionDialog
        open={showAddTx}
        onOpenChange={setShowAddTx}
        onSave={(data) => createTransaction.mutate(data)}
      />

      <Footer />
      
    </div>
  );
};

export default Finance;
