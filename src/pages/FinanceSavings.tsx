import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { Plus, Trash2, Target, PartyPopper } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceSavingsGoals,
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
  useDeleteSavingsGoal,
} from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { SavingsGoalDialog } from "@/components/finance/SavingsGoalDialog";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const FinanceSavings = () => {
  const { householdId } = useHousehold();
  const { data: goals, isLoading } = useFinanceSavingsGoals(householdId);
  const createGoal = useCreateSavingsGoal(householdId);
  const updateGoal = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const [showAdd, setShowAdd] = useState(false);
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});

  const activeGoals = (goals || []).filter((g) => g.status === "active");
  const completedGoals = (goals || []).filter((g) => g.status === "completed");

  const handleAddFunds = (goalId: string, currentAmount: number) => {
    const addAmount = Number(addAmounts[goalId]);
    if (!addAmount || addAmount <= 0) return;
    const goal = goals?.find((g) => g.id === goalId);
    const newAmount = currentAmount + addAmount;
    const updates: any = { id: goalId, current_amount: newAmount };
    if (goal && newAmount >= Number(goal.target_amount)) {
      updates.status = "completed";
    }
    updateGoal.mutate(updates);
    setAddAmounts((prev) => ({ ...prev, [goalId]: "" }));
  };

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-heading">Savings</h1>
          <Button size="sm" onClick={() => setShowAdd(true)} className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-1" /> New Goal
          </Button>
        </div>

        <FinanceNav />

        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => <Card key={i}><CardContent className="p-4 h-28" /></Card>)}
          </div>
        ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No savings goals"
            description="Set a target and start saving towards it"
            action={{ label: "Create Goal", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => {
              const pct = Number(goal.target_amount) > 0 ? Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100) : 0;
              const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;

              return (
                <Card key={goal.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{goal.name}</p>
                        {goal.target_date && (
                          <p className={cn(
                            "text-[11px] mt-0.5",
                            daysLeft !== null && daysLeft < 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {daysLeft !== null && daysLeft > 0
                              ? `${daysLeft} days left`
                              : daysLeft === 0
                              ? "Due today"
                              : "Overdue"}
                            {" · "}{format(new Date(goal.target_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteGoal.mutate(goal.id)}
                        style={{ minHeight: "28px" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{formatINR(Number(goal.current_amount))}</span>
                        <span className="font-medium">{Math.round(pct)}% of {formatINR(Number(goal.target_amount))}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="₹ Amount"
                        className="h-9 text-sm"
                        value={addAmounts[goal.id] || ""}
                        onChange={(e) => setAddAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                        min="0"
                      />
                      <Button
                        size="sm" variant="outline"
                        onClick={() => handleAddFunds(goal.id, Number(goal.current_amount))}
                      >
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {completedGoals.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-label">Completed</h3>
                {completedGoals.map((goal) => (
                  <Card key={goal.id} className="opacity-60">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PartyPopper className="w-4 h-4 text-[hsl(var(--success))]" />
                        <span className="text-sm line-through text-muted-foreground">{goal.name}</span>
                      </div>
                      <span className="text-xs font-medium text-[hsl(var(--success))]">{formatINR(Number(goal.target_amount))}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <QuickActionButton
        items={[{ label: "New Goal", icon: Plus, onClick: () => setShowAdd(true) }]}
        className="sm:hidden"
      />

      <SavingsGoalDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(data) => createGoal.mutate(data)}
      />
    </div>
  );
};

export default FinanceSavings;
