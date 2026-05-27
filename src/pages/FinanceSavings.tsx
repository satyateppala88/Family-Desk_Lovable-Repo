import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Trash2, Target, PartyPopper, Loader2, AlertCircle, X, Pencil } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceSavingsGoals,
  useFinanceRealtime,
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
  useDeleteSavingsGoal,
  useCreateTransaction,
  type FinanceSavingsGoal,
} from "@/hooks/finance";
import { useSavingsContributions } from "@/hooks/useSavingsContributions";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/formatINR";
import { PrivateValue, PrivateText } from "@/components/shared/PrivateValue";
import { SavingsGoalDialog } from "@/components/finance/SavingsGoalDialog";
import { format, differenceInDays, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { formatTimeLeft } from "@/lib/formatTimeLeft";

type Signal =
  | { kind: "reached" }
  | { kind: "ontrack"; expectedBy: string }
  | { kind: "behind"; shortfall: number }
  | { kind: "review"; shortfall: number }
  | { kind: "needs_date" }
  | { kind: "none" };

const initialsOf = (name: string) =>
  (name || "M").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "M";
const firstName = (n: string) => (n || "Member").split(/\s+/)[0];

const FinanceSavings = () => {
  const { householdId } = useHousehold();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useFinanceRealtime(householdId);
  const { data: goals, isLoading } = useFinanceSavingsGoals(householdId);
  const { data: contributions } = useSavingsContributions(householdId);
  const { data: members } = useHouseholdMembers(householdId);
  const memberById = new Map((members || []).map((m) => [m.userId, m]));
  const contribByGoal = new Map<string, typeof contributions>();
  (contributions || []).forEach((c) => {
    if (!c.savings_goal_id) return;
    const arr = contribByGoal.get(c.savings_goal_id) || [];
    arr.push(c);
    contribByGoal.set(c.savings_goal_id, arr);
  });
  const sumContrib = (goalId: string) =>
    (contribByGoal.get(goalId) || []).reduce((s, c) => s + Number(c.amount), 0);
  const createGoal = useCreateSavingsGoal(householdId);
  const updateGoal = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const createTxn = useCreateTransaction(householdId);
  const [showAdd, setShowAdd] = useState(false);
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ goal: FinanceSavingsGoal; focusDate: boolean } | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState<boolean>(() =>
    typeof window !== "undefined" && sessionStorage.getItem("savings-nudge-dismissed") === "1"
  );

  const activeGoals = (goals || []).filter((g) => g.status === "active");
  const completedGoals = (goals || []).filter((g) => g.status === "completed");

  // Inline "Add" on a savings goal card now creates a real
  // finance_transactions row (type='savings', linked to the goal) instead
  // of mutating the goal's `current_amount` directly. This keeps the
  // savings timeline, member contribution breakdown and transaction
  // history all consistent with a single source of truth: the linked
  // transaction list. The progress bar reads `linkedSum` below, so the
  // bar updates as soon as the optimistic transaction lands in cache.
  const handleAddFunds = (goalId: string, _currentAmount: number) => {
    const addAmount = Number(addAmounts[goalId]);
    if (!addAmount || addAmount <= 0) return;
    if (!householdId || !user?.id) return;
    const goal = goals?.find((g) => g.id === goalId);
    createTxn.mutate(
      {
        type: "savings",
        amount: addAmount,
        category: "sip",
        savings_goal_id: goalId,
        paid_by: user.id,
        description: goal ? `Contribution to ${goal.name}` : "Savings contribution",
        transaction_date: format(new Date(), "yyyy-MM-dd"),
      },
      {
        onSuccess: () => {
          // Refresh derived caches so the timeline, member breakdown,
          // and goal progress all pick up the new row.
          queryClient.invalidateQueries({ queryKey: ["savings-contributions", householdId] });
          queryClient.invalidateQueries({ queryKey: ["finance-savings-goals", householdId] });
          queryClient.invalidateQueries({ queryKey: ["finance-summary", householdId] });
        },
      },
    );
    setAddAmounts((prev) => ({ ...prev, [goalId]: "" }));
  };

  // Compute on-track signal per goal (Cases A/B/C from F-16).
  const computeSignal = (goal: FinanceSavingsGoal): Signal => {
    const linked = contribByGoal.get(goal.id) || [];
    const linkedTxnCount = linked.length;
    const totalSaved = linked.reduce((s, c) => s + Number(c.amount), 0);
    const today = new Date();
    const ageDays = differenceInDays(today, new Date(goal.created_at));

    // Case C: brand new + barely any data
    if (ageDays < 30 && linkedTxnCount < 2) return { kind: "none" };

    // Case B: no target date
    if (!goal.target_date) return { kind: "needs_date" };

    // Case A
    if (totalSaved >= Number(goal.target_amount)) return { kind: "reached" };

    const goalCreatedAt = new Date(goal.created_at);
    const monthsActive = Math.max(
      (today.getFullYear() - goalCreatedAt.getFullYear()) * 12 +
        (today.getMonth() - goalCreatedAt.getMonth()),
      1,
    );
    const monthlyRate = totalSaved / monthsActive;
    const remaining = Number(goal.target_amount) - totalSaved;
    const monthsToGoal = monthlyRate > 0 ? Math.ceil(remaining / monthlyRate) : null;

    const targetDate = new Date(goal.target_date);
    const monthsRemaining = Math.max(
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
        (targetDate.getMonth() - today.getMonth()),
      0,
    );
    const safeMonthsRem = Math.max(monthsRemaining, 1);
    const shortfall = Math.ceil(remaining / safeMonthsRem - monthlyRate);

    if (monthlyRate === 0 || monthsToGoal === null) {
      return { kind: "review", shortfall };
    }
    if (monthsToGoal <= monthsRemaining) {
      const expected = addMonths(today, monthsToGoal);
      return { kind: "ontrack", expectedBy: format(expected, "MMM yyyy") };
    }
    if (monthsToGoal <= monthsRemaining * 1.5) {
      return { kind: "behind", shortfall };
    }
    return { kind: "review", shortfall };
  };

  const signalsByGoal = useMemo(() => {
    const map = new Map<string, Signal>();
    for (const g of activeGoals) map.set(g.id, computeSignal(g));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoals, contributions]);

  const redGoalIds = activeGoals.filter((g) => signalsByGoal.get(g.id)?.kind === "review").map((g) => g.id);
  const showNudge = !nudgeDismissed && redGoalIds.length > 0;

  // ── Portfolio overview math ────────────────────────────────────
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

  const monthlyContribTotal = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contributions || []) {
      const d = new Date(c.transaction_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map.set(key, (map.get(key) || 0) + Number(c.amount || 0));
    }
    return map;
  }, [contributions]);

  const thisMonthContribTotal = monthlyContribTotal.get(currentMonthKey) || 0;

  // Per-goal monthly buckets — used for the sparkline and "last month" copy.
  const monthlyByGoal = useMemo(() => {
    const out = new Map<string, Map<string, number>>();
    for (const c of contributions || []) {
      if (!c.savings_goal_id) continue;
      const d = new Date(c.transaction_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const inner = out.get(c.savings_goal_id) || new Map<string, number>();
      inner.set(key, (inner.get(key) || 0) + Number(c.amount || 0));
      out.set(c.savings_goal_id, inner);
    }
    return out;
  }, [contributions]);

  // Cap each goal's contribution to its target so overage doesn't inflate totals.
  const totalSavedCapped =
    activeGoals.reduce((sum, g) => {
      const linked = sumContrib(g.id);
      const effective = Math.max(Number(g.current_amount), linked);
      return sum + Math.min(effective, Number(g.target_amount));
    }, 0) +
    completedGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);

  const onTrackCount = activeGoals.filter((g) => signalsByGoal.get(g.id)?.kind === "ontrack").length;
  const behindCount = activeGoals.filter((g) => {
    const k = signalsByGoal.get(g.id)?.kind;
    return k === "behind" || k === "review";
  }).length;
  const doneCount =
    completedGoals.length +
    activeGoals.filter((g) => signalsByGoal.get(g.id)?.kind === "reached").length;

  const dismissNudge = () => {
    sessionStorage.setItem("savings-nudge-dismissed", "1");
    setNudgeDismissed(true);
  };
  const scrollToFirstRed = () => {
    const id = redGoalIds[0];
    if (id) document.getElementById(`goal-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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

        {showNudge && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm flex-1">A few goals could use some attention.</p>
              <Button size="sm" variant="outline" onClick={scrollToFirstRed}>Review</Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={dismissNudge} aria-label="Dismiss">
                <X className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && (activeGoals.length > 0 || completedGoals.length > 0) && (
          <div className="rounded-xl p-4 bg-[hsl(165_42%_92%)]">
            <p className="text-[11px] text-muted-foreground">Total saved across all goals</p>
            <p className="text-2xl font-semibold tabular-nums mt-0.5">
              <PrivateValue value={totalSavedCapped} />
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <span className="text-muted-foreground">
                Goals on track: <span className="font-semibold text-foreground">{onTrackCount}</span>
              </span>
              <span className="text-muted-foreground">
                Behind: <span className="font-semibold text-foreground">{behindCount}</span>
              </span>
              <span className="text-muted-foreground">
                Done: <span className="font-semibold text-foreground">{doneCount}</span>
              </span>
            </div>
            <p className="text-[11px] mt-2 text-muted-foreground">
              This month's contributions:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                <PrivateValue value={thisMonthContribTotal} />
              </span>
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => <Card key={i}><CardContent className="p-4 h-28" /></Card>)}
          </div>
        ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No savings goals yet"
            description="Whether it's a vacation, emergency fund, or a big purchase — setting a goal makes it real."
            encouragement="Start with something small and build from there"
            action={{ label: "Create Your First Goal", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => {
              const linkedSum = sumContrib(goal.id);
              // Single source of truth for progress: the sum of linked
              // savings transactions. Direct edits to `current_amount`
              // (legacy / manual fixes via the goal dialog) are still
              // honoured as a floor so existing data isn't lost.
              const effectiveAmount = Math.max(Number(goal.current_amount), linkedSum);
              const signal = signalsByGoal.get(goal.id) || { kind: "none" };
              const isReached = signal.kind === "reached";
              const pct = isReached
                ? 100
                : Number(goal.target_amount) > 0
                  ? Math.min(100, (effectiveAmount / Number(goal.target_amount)) * 100)
                  : 0;
              const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;
              const allContribs = contribByGoal.get(goal.id) || [];

              // Per-member breakdown for this goal
              const memberTotals: Record<string, number> = {};
              for (const c of allContribs) {
                if (!c.paid_by) continue;
                memberTotals[c.paid_by] = (memberTotals[c.paid_by] || 0) + Number(c.amount);
              }
              const memberRows = Object.entries(memberTotals)
                .map(([uid, amt]) => ({ uid, amount: amt, member: memberById.get(uid) }))
                .sort((a, b) => b.amount - a.amount);
              const totalContribs = memberRows.reduce((s, r) => s + r.amount, 0);
              const showMemberBreakdown = memberRows.length >= 2;

              return (
                <Card key={goal.id} id={`goal-${goal.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold"><PrivateText value={goal.name} /></p>
                          {signal.kind === "reached" && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">Goal reached 🎉</span>
                          )}
                          {signal.kind === "ontrack" && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">On track · Expected by {signal.expectedBy}</span>
                          )}
                          {signal.kind === "behind" && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">Slightly behind · Consider reviewing contributions</span>
                          )}
                          {signal.kind === "review" && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">You might want to review this goal</span>
                          )}
                        </div>
                        {goal.target_date && (
                          <p className={cn(
                            "text-[11px] mt-0.5",
                            !isReached && daysLeft !== null && daysLeft < 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {isReached ? "Goal reached 🎉" : formatTimeLeft(daysLeft)}
                            {" · "}{format(new Date(goal.target_date), "dd/MM/yyyy")}
                          </p>
                        )}
                        {(signal.kind === "behind" || signal.kind === "review") && signal.shortfall > 0 && (
                          <p className="text-[11px] mt-0.5 text-muted-foreground">
                            Needed to stay on track: <PrivateValue value={signal.shortfall} /> more/month
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditTarget({ goal, focusDate: false })}
                          style={{ minHeight: "28px" }}
                          aria-label="Edit goal"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: goal.id, name: goal.name })}
                          style={{ minHeight: "28px" }}
                          aria-label="Delete goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Progress
                        value={pct}
                        className={cn("h-2", isReached && "[&>*]:bg-[hsl(var(--success))]")}
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span><PrivateValue value={Math.min(effectiveAmount, Number(goal.target_amount))} /> saved</span>
                        <span className="font-medium">
                          {isReached
                            ? "Goal reached"
                            : <>{Math.round(pct)}% of <PrivateValue value={Number(goal.target_amount)} /></>}
                        </span>
                      </div>
                    </div>

                    {(() => {
                      // 6-month contribution sparkline
                      const goalMonthly = monthlyByGoal.get(goal.id) || new Map<string, number>();
                      const sparkMonths: { key: string; label: string; value: number }[] = [];
                      for (let i = 5; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const key = `${d.getFullYear()}-${d.getMonth()}`;
                        sparkMonths.push({ key, label: format(d, "MMM"), value: goalMonthly.get(key) || 0 });
                      }
                      const monthsWithData = sparkMonths.filter((s) => s.value > 0).length;
                      if (monthsWithData < 2) return null;
                      const max = Math.max(...sparkMonths.map((s) => s.value), 1);
                      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;
                      const lastMonthVal = goalMonthly.get(lastMonthKey) || 0;
                      return (
                        <div className="space-y-1">
                          <div className="flex items-end gap-1 h-10">
                            {sparkMonths.map((s) => (
                              <div key={s.key} className="flex-1 flex flex-col items-center justify-end h-full" title={`${s.label}: ${formatINR(s.value)}`}>
                                <div
                                  className={cn(
                                    "w-full rounded-sm",
                                    s.value > 0 ? "bg-primary/70" : "bg-muted"
                                  )}
                                  style={{ height: `${s.value > 0 ? Math.max((s.value / max) * 100, 8) : 4}%` }}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1 px-0.5">
                            {sparkMonths.map((s) => (
                              <div key={s.key} className="flex-1 text-center text-[9px] text-muted-foreground">{s.label[0]}</div>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {lastMonthVal > 0
                              ? <><PrivateValue value={lastMonthVal} /> added last month</>
                              : "No contributions last month"}
                          </p>
                        </div>
                      );
                    })()}

                    {signal.kind === "needs_date" && (
                      <button
                        type="button"
                        onClick={() => setEditTarget({ goal, focusDate: true })}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Set a target date to see if you're on track →
                      </button>
                    )}

                    {showMemberBreakdown && (
                      <div className="border-t pt-2 space-y-1.5">
                        <p className="text-[11px] font-medium text-muted-foreground">Contributions</p>
                        {memberRows.map((mr) => {
                          const name = mr.member ? mr.member.displayName : "Member";
                          const pctMember = totalContribs > 0 ? (mr.amount / totalContribs) * 100 : 0;
                          return (
                            <div key={mr.uid} className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[10px] font-semibold shrink-0">
                                {initialsOf(name)}
                              </span>
                              <span className="text-[11px] flex-1 min-w-0 truncate">{firstName(name)}</span>
                              <span className="text-[11px] font-medium tabular-nums"><PrivateValue value={mr.amount} /></span>
                              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${pctMember}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{Math.round(pctMember)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {goal.target_date && (() => {
                      // Build month buckets from goal creation → current month (cap last 12).
                      const now = new Date();
                      const created = new Date(goal.created_at);
                      const totalMonths =
                        (now.getFullYear() - created.getFullYear()) * 12 +
                        (now.getMonth() - created.getMonth()) + 1;
                      const span = Math.max(1, Math.min(12, totalMonths));
                      const months: { y: number; m: number; key: string; label: string; isCurrent: boolean }[] = [];
                      for (let i = span - 1; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        months.push({
                          y: d.getFullYear(),
                          m: d.getMonth(),
                          key: `${d.getFullYear()}-${d.getMonth()}`,
                          label: format(d, "MMM")[0],
                          isCurrent: i === 0,
                        });
                      }
                      const hitSet = new Set<string>();
                      for (const c of allContribs) {
                        const d = new Date(c.transaction_date);
                        hitSet.add(`${d.getFullYear()}-${d.getMonth()}`);
                      }
                      const hits = months.filter((mo) => hitSet.has(mo.key)).length;
                      // Trailing streak ending at current month
                      let streak = 0;
                      for (let i = months.length - 1; i >= 0; i--) {
                        if (hitSet.has(months[i].key)) streak++;
                        else break;
                      }
                      return (
                        <div className="border-t pt-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-medium text-muted-foreground">Consistency</p>
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              {hits} / {months.length} {months.length === 1 ? "month" : "months"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {months.map((mo) => {
                              const isHit = hitSet.has(mo.key);
                              return (
                                <div
                                  key={mo.key}
                                  title={`${format(new Date(mo.y, mo.m, 1), "MMM yyyy")} · ${isHit ? "Contributed" : "No contribution"}`}
                                  className={cn(
                                    "flex-1 h-6 rounded-sm flex items-center justify-center text-[9px] font-semibold",
                                    isHit ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                    mo.isCurrent && "ring-1 ring-primary/60",
                                  )}
                                >
                                  {mo.label}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {hits === 0
                              ? "No contributions yet"
                              : `Contributed in ${hits} of the last ${months.length} ${months.length === 1 ? "month" : "months"}`}
                            {streak >= 2 && ` · ${streak}-month streak`}
                          </p>
                        </div>
                      );
                    })()}

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
                        disabled={updateGoal.isPending}
                      >
                        {updateGoal.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
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
                        <span className="text-sm line-through text-muted-foreground"><PrivateText value={goal.name} /></span>
                      </div>
                      <span className="text-xs font-medium text-[hsl(var(--success))]"><PrivateValue value={Number(goal.target_amount)} /></span>
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

      <SavingsGoalDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        goal={editTarget?.goal ?? null}
        autoFocusDate={editTarget?.focusDate}
        onSave={(data) => {
          if (editTarget) {
            updateGoal.mutate({ id: editTarget.goal.id, ...data });
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete savings goal?"
        description={`This will permanently remove "${deleteTarget?.name}" and its progress.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteGoal.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};

export default FinanceSavings;
