import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { useHousehold } from "@/hooks/useHousehold";
import { useFinanceMonthlySummary, useFinanceRealtime } from "@/hooks/finance";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useFinanceSavingsGoals } from "@/hooks/finance";
import { useUserCards } from "@/hooks/useUserCards";
import { formatINR } from "@/lib/formatINR";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { format, isPast, addDays, parse, addMonths } from "date-fns";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { MonthSwitcher } from "@/components/finance/MonthSwitcher";
import { MemberContributions } from "@/components/finance/MemberContributions";
import { ModuleNudgeBanner } from "@/components/discovery/ModuleNudgeBanner";
import { useState } from "react";
import { AIActionSheet } from "@/components/ai/AIActionSheet";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";

const Finance = () => {
  const { householdId } = useHousehold();
  useFinanceRealtime(householdId);
  const { month, label: monthLabel, isCurrent } = useSelectedMonth();
  const prevMonth = format(addMonths(parse(month + "-01", "yyyy-MM-dd", new Date()), -1), "yyyy-MM");
  const { data: summary, isLoading } = useFinanceMonthlySummary(householdId, month);
  const { data: prevSummary } = useFinanceMonthlySummary(householdId, prevMonth);
  const { data: subscriptions } = useSubscriptions(householdId);
  const { data: savingsGoals } = useFinanceSavingsGoals(householdId);
  const { data: userCards } = useUserCards(householdId);
  const [aiOpen, setAiOpen] = useState(false);

  // Compute contextual hints
  const dueSoonCount = subscriptions?.filter((s) => {
    if (!s.is_active || !s.next_due_date) return false;
    const d = new Date(s.next_due_date);
    return isPast(d) || d <= addDays(new Date(), 7);
  }).length ?? 0;

  const activeGoalsCount = savingsGoals?.filter((g) => g.status === "active").length ?? 0;
  const cardsCount = userCards?.length ?? 0;

  const getHint = (key: string): string | null => {
    switch (key) {
      case "transactions":
        return summary?.transactionCount ? `${summary.transactionCount} this month` : null;
      case "subscriptions":
        return dueSoonCount > 0 ? `${dueSoonCount} due soon` : null;
      case "savings":
        return activeGoalsCount > 0 ? `${activeGoalsCount} active goal${activeGoalsCount !== 1 ? "s" : ""}` : null;
      case "cards":
        return cardsCount > 0 ? `${cardsCount} card${cardsCount !== 1 ? "s" : ""}` : null;
      default:
        return null;
    }
  };

  const financeModules = [
    { path: "/finance/transactions", emoji: "🔄", label: "Transactions", description: "Track income & expenses", hintKey: "transactions" },
    { path: "/finance/subscriptions", emoji: "🔁", label: "Subscriptions", description: "Recurring & AMCs", hintKey: "subscriptions" },
    { path: "/finance/budget",        emoji: "🎯", label: "Budget",       description: "Plan your spending", hintKey: "" },
    { path: "/finance/savings",       emoji: "📈", label: "Savings",      description: "Goals & progress", hintKey: "savings" },
    { path: "/finance/cards",         emoji: "💳", label: "Cards",        description: "Card optimizer", hintKey: "cards" },
    { path: "/finance/chat",          emoji: "🤖", label: "AI Advisor",   description: "Ask about finances", hintKey: "" },
    { path: "/finance/review",        emoji: "📊", label: "Review",       description: "Insights & trends", hintKey: "" },
    { path: "/finance/trends",        emoji: "📉", label: "Trends",       description: "6-month comparison", hintKey: "" },
    { path: "/finance/report",        emoji: "🧾", label: "Monthly Report", description: "Shareable recap", hintKey: "" },
  ];

  const renderDelta = (current: number, prev: number, invert = false) => {
    if (prev === 0) return null;
    const pct = Math.round(((current - prev) / prev) * 100);
    if (pct === 0) return <span className="text-[10px] text-muted-foreground">— vs prev</span>;
    const up = pct > 0;
    // For income: up is good. For expenses: up is bad.
    const isGood = invert ? !up : up;
    const Icon = up ? ArrowUp : ArrowDown;
    return (
      <span className={`text-[10px] font-medium inline-flex items-center gap-0.5 ${isGood ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
        <Icon className="w-2.5 h-2.5" />
        {Math.abs(pct)}% vs prev
      </span>
    );
  };

  const income  = summary?.income   || 0;
  const expenses = summary?.expenses || 0;
  const saved   = income - expenses;

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4 animate-fade-in">
        {!isLoading && (summary?.transactionCount ?? 0) === 0 && (
          <ModuleNudgeBanner
            moduleKey="finance"
            text="Log your first expense in 10 seconds. By month-end, you'll have a full household spending report."
          />
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="fd-eyebrow mb-0.5">FINANCE</div>
            <h1 className="fd-display text-[24px] text-fd-ink">{monthLabel}</h1>
            {!isCurrent && <p className="text-[11px] text-fd-slate-2 mt-1">Viewing past month</p>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiOpen(true)}
            className="gap-1.5 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Analyse this month</span>
            <span className="sm:hidden">Analyse</span>
          </Button>
        </div>

        <MonthSwitcher />

        {/* Privacy cue */}
        <div className="trust-badge" role="status">
          <Shield className="h-3 w-3" aria-hidden="true" />
          <span>Your financial data stays private to your household</span>
        </div>

        {/* Hero spend card */}
        <div className="fd-icard p-5">
          <div className="fd-icard-glow" />
          <div className="text-[10px] uppercase tracking-[0.1em] fd-mono text-white/30">Total Spent</div>
          {isLoading && !summary ? (
            <Skeleton className="h-8 w-32 mt-2 mb-3 bg-white/10" />
          ) : (
            <div className="fd-display text-[36px] text-white mt-1 mb-3">
              <PrivateValue value={expenses} />
            </div>
          )}
          <div className="grid grid-cols-[1fr_1px_1fr_1px_1fr] items-center">
            <div className="pr-3">
              <div className="text-[9px] uppercase tracking-[0.09em] fd-mono text-white/30">Income</div>
              <div className="fd-mono text-[13px] font-semibold text-fd-sage-glow mt-0.5">
                <PrivateValue value={income} />
              </div>
              {prevSummary && <div className="mt-1">{renderDelta(income, prevSummary.income, false)}</div>}
            </div>
            <div className="h-8 bg-white/10" />
            <div className="px-3">
              <div className="text-[9px] uppercase tracking-[0.09em] fd-mono text-white/30">Saved</div>
              <div className={`fd-mono text-[13px] font-semibold mt-0.5 ${saved >= 0 ? "text-white" : "text-[hsl(var(--destructive))]"}`}>
                <PrivateValue value={saved} />
              </div>
            </div>
            <div className="h-8 bg-white/10" />
            <div className="pl-3">
              <div className="text-[9px] uppercase tracking-[0.09em] fd-mono text-white/30">Spend Δ</div>
              <div className="mt-1">
                {prevSummary
                  ? renderDelta(expenses, prevSummary.expenses, true)
                  : <span className="text-[10px] text-white/40">—</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Member contributions (hidden for single-member households) */}
        <MemberContributions householdId={householdId} month={month} />

        {/* Module grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {financeModules.map(({ path, emoji, label, description, hintKey }) => {
            const hint = getHint(hintKey);
            return (
              <Link key={path} to={path} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[14px]">
                <div className="fd-mc h-full flex flex-col gap-1">
                  <span className="text-[18px] leading-none" aria-hidden="true">{emoji}</span>
                  <div className="text-[13px] font-semibold text-fd-ink mt-1">{label}</div>
                  {hint ? (
                    <div className="text-[11px] font-semibold text-fd-sage">{hint}</div>
                  ) : (
                    <div className="text-[11px] text-fd-slate-2">{description}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <AIActionSheet
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        initialPrompt="Analyse my household's spending for this month. Highlight the top 3 categories, any unusual spikes, and one actionable suggestion to reduce spend."
      />
    </div>
  );
};

export default Finance;
