import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Tag, Target, X } from "lucide-react";
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
  useUpdateBudgetById,
  useDeleteBudgetById,
  useCarryForwardBudgets,
  useFinanceTransactions,
  CATEGORY_LABELS,
  FINANCE_CATEGORIES,
  type FinanceBudget as FinanceBudgetType,
} from "@/hooks/useFinance";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { formatINR } from "@/lib/formatINR";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { BudgetDialog } from "@/components/finance/BudgetDialog";
import type { BudgetSavePayload } from "@/components/finance/BudgetDialog";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BudgetSubNav } from "@/components/finance/BudgetSubNav";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FinanceBudget = () => {
  const { householdId } = useHousehold();
  useFinanceRealtime(householdId);
  const { categories: customCats } = useCustomCategories("transaction");
  const { month: currentMonth, label: monthLabel } = useSelectedMonth();
  const { data: budgets, isLoading } = useFinanceBudgets(householdId, currentMonth);
  const { data: summary } = useFinanceMonthlySummary(householdId, currentMonth);
  const { data: members } = useHouseholdMembers(householdId);
  const hasMultipleMembers = (members?.length ?? 0) >= 2;
  const [selectedPaidBy, setSelectedPaidBy] = useState<string>("household");
  // All expense transactions for the month (used for member breakdown + top spender + member-filtered totals)
  const { data: monthExpenses } = useFinanceTransactions(
    householdId,
    { month: currentMonth, type: "expense" },
  );
  const upsertBudget = useUpsertBudget(householdId);
  const updateBudgetById = useUpdateBudgetById(householdId);
  const deleteBudgetById = useDeleteBudgetById(householdId);
  const carryForward = useCarryForwardBudgets(householdId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [editingBudget, setEditingBudget] = useState<FinanceBudgetType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [expandedBreakdown, setExpandedBreakdown] = useState<Record<string, boolean>>({});
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

  const memberById = useMemo(
    () => new Map((members || []).map((m) => [m.userId, m])),
    [members],
  );
  const firstName = (n: string) => (n || "Member").split(/\s+/)[0];

  // Effective payer for a transaction: paid_by, falling back to created_by for legacy data.
  const effectivePayer = (t: { paid_by: string | null; created_by: string }) =>
    t.paid_by || t.created_by;

  // Aggregate expenses by category (all members) and by (category, payer).
  const { categoryTotal, categoryByMember, memberTotal, memberTxnCount } = useMemo(() => {
    const catTotal: Record<string, number> = {};
    const catByMember: Record<string, Record<string, number>> = {};
    const memTotal: Record<string, number> = {};
    const memCount: Record<string, number> = {};
    for (const t of monthExpenses || []) {
      const amt = Number(t.amount) || 0;
      const payer = effectivePayer(t);
      catTotal[t.category] = (catTotal[t.category] || 0) + amt;
      if (!catByMember[t.category]) catByMember[t.category] = {};
      catByMember[t.category][payer] = (catByMember[t.category][payer] || 0) + amt;
      memTotal[payer] = (memTotal[payer] || 0) + amt;
      memCount[payer] = (memCount[payer] || 0) + 1;
    }
    return { categoryTotal: catTotal, categoryByMember: catByMember, memberTotal: memTotal, memberTxnCount: memCount };
  }, [monthExpenses]);

  const isMemberView = selectedPaidBy !== "household";
  const memberCategorySpend = (cat: string): number => {
    if (!isMemberView) return summary?.categoryBreakdown?.[cat] || 0;
    return categoryByMember[cat]?.[selectedPaidBy] || 0;
  };

  const totalPlanned = (budgets || []).reduce((s, b) => s + Number(b.planned_amount), 0);
  const totalActual = isMemberView
    ? memberTotal[selectedPaidBy] || 0
    : (summary?.expenses || 0);
  const overallPct = totalPlanned > 0 ? Math.min(100, (totalActual / totalPlanned) * 100) : 0;

  const budgetRows = (budgets || []).map((b) => {
    const actual = memberCategorySpend(b.category);
    const pct = Number(b.planned_amount) > 0 ? Math.min(100, (actual / Number(b.planned_amount)) * 100) : 0;
    const over = actual > Number(b.planned_amount);
    return { ...b, actual, pct, over };
  }).sort((a, b) => b.pct - a.pct);

  // All available expense categories (built-in minus income + custom)
  const incomeKeys = new Set(["salary", "freelance", "investment_returns"]);
  const selectableCategories = useMemo(() => {
    const builtIn = FINANCE_CATEGORIES.filter((c) => !incomeKeys.has(c));
    const custom = (customCats || []).map((c) => c.key);
    return Array.from(new Set([...builtIn, ...custom]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customCats]);
  const budgetedSet = useMemo(
    () => new Set((budgets || []).map((b) => b.category)),
    [budgets]
  );
  const allCategoriesBudgeted =
    selectableCategories.length > 0 &&
    selectableCategories.every((c) => budgetedSet.has(c));
  const addDisabledTooltip =
    "All categories have budgets set. Edit an existing one to make changes.";

  const selectedMember = isMemberView ? memberById.get(selectedPaidBy) : null;
  const selectedFirstName = selectedMember ? firstName(selectedMember.displayName) : "";

  // Top spender: 2+ members, top has 3+ txns, 2+ distinct payers.
  const topSpender = useMemo(() => {
    if (!hasMultipleMembers) return null;
    const entries = Object.entries(memberTotal);
    if (entries.length < 2) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const [topId, topAmt] = entries[0];
    if ((memberTxnCount[topId] || 0) < 3) return null;
    const m = memberById.get(topId);
    if (!m) return null;
    return { name: firstName(m.displayName), amount: topAmt };
  }, [hasMultipleMembers, memberTotal, memberTxnCount, memberById]);

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
    // Inline edit always creates a per-month override at the current month
    // (does not touch the recurring/annual source row — use the full dialog
    // for "this and all future months" updates).
    upsertBudget.mutate({
      month: currentMonth,
      category,
      planned_amount: n,
      is_recurring: false,
      budget_type: "monthly",
    });
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
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={allCategoriesBudgeted ? 0 : -1}>
                    <Button
                      size="sm"
                      onClick={() => setShowAdd(true)}
                      disabled={allCategoriesBudgeted}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </span>
                </TooltipTrigger>
                {allCategoriesBudgeted && (
                  <TooltipContent>{addDisabledTooltip}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <BudgetSubNav />

        <MonthSwitcher allowFuture />

        {hasMultipleMembers && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {[{ id: "household", name: "Household" }, ...((members || []).map(m => ({ id: m.userId, name: firstName(m.displayName) })))].map((p) => {
              const active = selectedPaidBy === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPaidBy(p.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition border",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Overall progress */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{monthLabel}</span>
              <span className={cn("font-medium", overallPct > 90 ? "text-destructive" : "")}>
                <PrivateValue value={totalActual} /> / <PrivateValue value={totalPlanned} />
              </span>
            </div>
            {totalPlanned > 0 ? (
              <>
                <Progress value={overallPct} className="h-2" />
                <p className="text-[11px] text-muted-foreground text-right">{Math.round(overallPct)}% used</p>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground text-right">No budget set</p>
            )}
          </CardContent>
        </Card>

        {!isMemberView && topSpender && (
          <p className="text-xs text-muted-foreground px-1">
            Highest spender this month: <span className="font-medium text-foreground">{topSpender.name}</span> — <PrivateValue value={topSpender.amount} /> across all categories
          </p>
        )}

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
              <Card key={row.id} className={cn("relative", row.over && "border-destructive/20")}>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  {Number(row.planned_amount) > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditingBudget(row)}
                      aria-label="Edit budget"
                      className="absolute top-2 right-2 p-1 rounded hover:bg-muted/60 transition"
                    >
                      <Pencil className="w-4 h-4" style={{ color: "#6B6965" }} />
                    </button>
                  )}
                  <div className="flex justify-between items-start gap-2 pr-7">
                    <div className="min-w-0 flex flex-col items-start gap-1">
                      <span className="text-sm font-medium">
                        {resolveCategoryLabel(row.category, CATEGORY_LABELS, customCats)}
                      </span>
                      {Number(row.planned_amount) > 0 && (() => {
                        const src = row._source ?? "exact";
                        const chipLabel =
                          src === "annual"
                            ? "Budget set · Annual"
                            : src === "recurring"
                              ? "Budget set · Recurring"
                              : "Budget set";
                        const chip = (
                          <span
                            className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: "#E6F2EE", color: "#0F6E56" }}
                          >
                            {chipLabel}
                          </span>
                        );
                        if (src === "annual" && row.annual_amount) {
                          return (
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="focus:outline-none">{chip}</button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  ₹{Number(row.annual_amount).toLocaleString("en-IN")} annual · ₹
                                  {Number(row.planned_amount).toLocaleString("en-IN")}/month
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        }
                        return chip;
                      })()}
                    </div>
                    <div className="text-right shrink-0">
                      {Number(row.planned_amount) > 0 ? (
                        <span className={cn(
                          "text-xs font-medium",
                          row.over ? "text-destructive" : row.pct > 75 ? "text-warning" : "text-muted-foreground"
                        )}>
                          {row.over ? "Over!" : `${Math.round(row.pct)}%`}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">No budget set</span>
                      )}
                    </div>
                  </div>
                  {isMemberView && selectedFirstName && (
                    <p className="text-[11px] text-muted-foreground">
                      {selectedFirstName}'s spend · Household limit: <PrivateValue value={Number(row.planned_amount)} />
                    </p>
                  )}
                  {Number(row.planned_amount) > 0 && (
                    <Progress value={row.pct} className="h-1.5" />
                  )}
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <span><PrivateValue value={row.actual} /> spent</span>
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
                        <PrivateValue value={Number(row.planned_amount)} /> budget
                        <Pencil className="w-3 h-3 opacity-60" />
                      </button>
                    )}
                  </div>
                  {!isMemberView && hasMultipleMembers && (categoryTotal[row.category] || 0) > 0 && (() => {
                    const expanded = !!expandedBreakdown[row.id];
                    const total = categoryTotal[row.category] || 0;
                    const memberRows = Object.entries(categoryByMember[row.category] || {})
                      .filter(([, amt]) => amt > 0)
                      .map(([uid, amt]) => {
                        const m = memberById.get(uid);
                        return { uid, name: m ? firstName(m.displayName) : "Member", amount: amt, pct: total > 0 ? (amt / total) * 100 : 0 };
                      })
                      .sort((a, b) => b.amount - a.amount);
                    if (memberRows.length === 0) return null;
                    return (
                      <div className="pt-1 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() => setExpandedBreakdown((s) => ({ ...s, [row.id]: !s[row.id] }))}
                          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expanded ? "Hide member breakdown" : "See by member"}
                        </button>
                        {expanded && (
                          <ul className="mt-2 space-y-1.5">
                            {memberRows.map((mr) => (
                              <li key={mr.uid} className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[10px] font-semibold shrink-0">
                                  {mr.name.slice(0, 2).toUpperCase()}
                                </span>
                                <span className="text-[11px] flex-1 min-w-0 truncate">{mr.name}</span>
                                <span className="text-[11px] font-medium tabular-nums"><PrivateValue value={mr.amount} /></span>
                                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${mr.pct}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{Math.round(mr.pct)}%</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <QuickActionButton
        items={[
          {
            label: "Add Budget",
            icon: Plus,
            onClick: () => {
              if (allCategoriesBudgeted) {
                toast.info(addDisabledTooltip);
                return;
              }
              setShowAdd(true);
            },
          },
          { label: "Categories", icon: Tag, onClick: () => navigate("/finance/budget/categories") },
        ]}
        className="sm:hidden"
      />

      <BudgetDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        monthLabel={monthLabel}
        onSave={(data: BudgetSavePayload) => {
          if (data.budget_type === "annual") {
            const year = currentMonth.slice(0, 4);
            upsertBudget.mutate({
              month: `${year}-01`,
              category: data.category,
              planned_amount: data.planned_amount,
              is_recurring: true,
              budget_type: "annual",
              annual_amount: data.annual_amount ?? null,
            });
          } else {
            upsertBudget.mutate({
              month: currentMonth,
              category: data.category,
              planned_amount: data.planned_amount,
              is_recurring: data.is_recurring,
              budget_type: "monthly",
            });
          }
        }}
        existingCategories={(budgets || []).map((b) => b.category)}
      />

      <BudgetDialog
        open={!!editingBudget}
        onOpenChange={(o) => { if (!o) setEditingBudget(null); }}
        mode="edit"
        initialCategory={editingBudget?.category}
        initialAmount={editingBudget ? Number(editingBudget.planned_amount) : undefined}
        initialBudgetType={editingBudget?.budget_type ?? "monthly"}
        initialAnnualAmount={editingBudget?.annual_amount ?? null}
        monthLabel={monthLabel}
        editSource={editingBudget?._source ?? "exact"}
        onDelete={() => {
          if (!editingBudget) return;
          // Recurring/annual: delete the anchor row (originalId). Exact: delete by id.
          const targetId = editingBudget._originalId ?? editingBudget.id;
          // Skip optimistic synthesized ids (no real row to delete).
          if (!targetId || targetId.startsWith("optimistic-") || targetId.startsWith("virtual-")) {
            setEditingBudget(null);
            return;
          }
          deleteBudgetById.mutate(targetId);
          setEditingBudget(null);
        }}
        onSave={(data: BudgetSavePayload) => {
          if (!editingBudget) return;
          const src = editingBudget._source ?? "exact";
          // Annual budget edit → update the anchor row's annual + monthly amount.
          if (data.budget_type === "annual" || src === "annual") {
            const annual = data.annual_amount ?? Number(data.planned_amount) * 12;
            const monthly = Math.floor(annual / 12);
            if (editingBudget._originalId) {
              updateBudgetById.mutate({
                id: editingBudget._originalId,
                planned_amount: monthly,
                annual_amount: annual,
              });
            } else {
              upsertBudget.mutate({
                month: editingBudget.month,
                category: editingBudget.category,
                planned_amount: monthly,
                is_recurring: true,
                budget_type: "annual",
                annual_amount: annual,
              });
            }
          } else if (src === "recurring") {
            if (data.edit_scope === "all_future" && editingBudget._originalId) {
              // Update the original recurring row → propagates to all future months.
              updateBudgetById.mutate({
                id: editingBudget._originalId,
                planned_amount: data.planned_amount,
              });
            } else {
              // "This month only" → create a per-month override.
              upsertBudget.mutate({
                month: currentMonth,
                category: editingBudget.category,
                planned_amount: data.planned_amount,
                is_recurring: false,
                budget_type: "monthly",
              });
            }
          } else {
            // Exact period-specific row → straight upsert at this month.
            upsertBudget.mutate({
              month: currentMonth,
              category: editingBudget.category,
              planned_amount: data.planned_amount,
              is_recurring: editingBudget.is_recurring ?? false,
              budget_type: "monthly",
            });
          }
          setEditingBudget(null);
        }}
      />
    </div>
  );
};

export default FinanceBudget;
