import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Target } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 pb-20 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Savings Goals</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Goal
          </Button>
        </div>

        <FinanceNav />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <Target className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No savings goals yet</p>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                Create your first goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeGoals.map((goal) => {
              const pct = Number(goal.target_amount) > 0 ? Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100) : 0;
              const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;

              return (
                <Card key={goal.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{goal.name}</p>
                        {goal.target_date && (
                          <p className="text-xs text-muted-foreground">
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
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteGoal.mutate(goal.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatINR(Number(goal.current_amount))}</span>
                        <span>{formatINR(Number(goal.target_amount))}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">{Math.round(pct)}%</p>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="₹ Add funds"
                        className="h-8 text-sm"
                        value={addAmounts[goal.id] || ""}
                        onChange={(e) => setAddAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                        min="0"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
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
              <>
                <h3 className="text-sm font-medium text-muted-foreground pt-2">Completed</h3>
                {completedGoals.map((goal) => (
                  <Card key={goal.id} className="opacity-70">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm line-through">{goal.name}</p>
                        <span className="text-xs text-[hsl(var(--success))]">✓ {formatINR(Number(goal.target_amount))}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      <SavingsGoalDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(data) => createGoal.mutate(data)}
      />

      <Footer />
      <MobileNav />
    </div>
  );
};

export default FinanceSavings;
