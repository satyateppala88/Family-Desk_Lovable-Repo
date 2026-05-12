import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { Check, Pencil, Plus, Tag, Target, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useHousehold } from "@/hooks/useHousehold";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { MonthSwitcher } from "@/components/finance/MonthSwitcher";
import {
  useFinanceBudgets,
  useFinanceMonthlySummary,
  useFinanceRealtime,
  useUpsertBudget,
  useCarryForwardBudgets,
  CATEGORY_LABELS,
} from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { BudgetDialog } from "@/components/finance/BudgetDialog";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BudgetSubNav } from "@/components/finance/BudgetSubNav";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

const FinanceBudget = () => {
  const { householdId } = useHousehold();
  useFinanceRealtime(householdId);
  const { categories: customCats } = useCustomCategories("transaction");
  const { month: currentMonth, label: monthLabel } = useSelectedMonth();
  const { data: budgets, isLoading } = useFinanceBudgets(householdId, currentMonth);
  const { data: summary } = useFinanceMonthlySummary(householdId, currentMonth);
  const upsertBudget = useUpsertBudget(householdId);
  const carryForward = useCarryForwardBudgets(householdId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const triedCarryRef = useRef<Set<string>>(new Set());

  // Auto carry-forward: if this month has no budgets, clone the most recent
  // prior month's budgets in. Runs once per (household, month) per session.
  useEffect(() => {
    if (!householdId || isLoading) return;
    if (budgets && budgets.length > 0) return;
    const key = `${householdId}:${currentMonth}`;
    if (triedCarryRef.current.has(key)) return;
    triedCarryRef.current.add(key);
    carryForward
      .mutateAsync(currentMonth)
      .then((res) => {
        if (res.cloned > 0 && res.sourceMonth) {
          const [y, m] = res.sourceMonth.split("-").map(Number);
          const srcLabel = format(new Date(y, m - 1, 1), "MMM yyyy");
          const insertedIds = res.insertedIds;
          toast.success(`Carried forward ${res.cloned} categories from ${srcLabel}.`, {
            action: {
              label: "Undo",
              onClick: async () => {
                if (!insertedIds.length) return;
                await supabase.from("finance_budgets").delete().in("id", insertedIds);
                queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
              },
            },
          });
        }
      })
      .catch(() => {
        /* silent: budgets just stay empty */
      });
  }, [householdId, currentMonth, budgets, isLoading, carryForward, queryClient]);

  const totalPlanned = (budgets || []).reduce((s, b) => s + Number(b.planned_amount), 0);
  const totalActual = summary?.expenses || 0;
  const overallPct = totalPlanned > 0 ? Math.min(100, (totalActual / totalPlanned) * 100) : 0;

  const budgetRows = (budgets || []).map((b) => {
    const actual = summary?.categoryBreakdown?.[b.category] || 0;
    const pct = Number(b.planned_amount) > 0 ? Math.min(100, (actual / Number(b.planned_amount)) * 100) : 0;
    const over = actual > Number(b.planned_amount);
    return { ...b, actual, pct, over };
  }).sort((a, b) => b.pct - a.pct);

  const startEdit = (id: string, current: number) => {
    setEditingId(id);
    setEditAmount(String(current));
  };
  const saveEdit = (category: string) => {
    const n = Number(editAmount);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    upsertBudget.mutate({ month: currentMonth, category, planned_amount: n });
    setEditingId(null);
  };

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-heading">Budget</h1>
          <div className="hidden sm:flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/finance/budget/categories">
                <Tag className="w-4 h-4 mr-1" /> Categories
              </Link>
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        <BudgetSubNav />

        <MonthSwitcher allowFuture />

        {/* Overall progress */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{monthLabel}</span>
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
                      {resolveCategoryLabel(row.category, CATEGORY_LABELS, customCats)}
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
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>{formatINR(row.actual)} spent</span>
                    {editingId === row.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveEdit(row.category);
                            }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-7 w-24 text-xs"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => saveEdit(row.category)}
                          aria-label="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(row.id, Number(row.planned_amount))}
                        className="inline-flex items-center gap-1 hover:text-foreground transition"
                        aria-label="Edit budget for this month"
                      >
                        {formatINR(Number(row.planned_amount))} budget
                        <Pencil className="w-3 h-3 opacity-60" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <QuickActionButton
        items={[
          { label: "Add Budget", icon: Plus, onClick: () => setShowAdd(true) },
          { label: "Categories", icon: Tag, onClick: () => navigate("/finance/budget/categories") },
        ]}
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
