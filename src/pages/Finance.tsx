import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";
import { useHousehold } from "@/hooks/useHousehold";
import { useFinanceMonthlySummary } from "@/hooks/useFinance";
import { formatINR } from "@/lib/formatINR";
import { format } from "date-fns";
import {
  ArrowLeftRight,
  Target,
  PiggyBank,
  Bot,
  BarChart3,
  RefreshCw,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Shield,
} from "lucide-react";

const financeModules = [
  { path: "/finance/transactions", icon: ArrowLeftRight, label: "Transactions", description: "Track income & expenses", tintClass: "module-tint-finance" },
  { path: "/finance/subscriptions", icon: RefreshCw, label: "Subscriptions", description: "Recurring & AMCs", tintClass: "module-tint-finance" },
  { path: "/finance/budget", icon: Target, label: "Budget", description: "Plan your spending", tintClass: "module-tint-finance" },
  { path: "/finance/savings", icon: PiggyBank, label: "Savings", description: "Goals & progress", tintClass: "module-tint-finance" },
  { path: "/finance/cards", icon: CreditCard, label: "Cards", description: "Card optimizer", tintClass: "module-tint-finance" },
  { path: "/finance/chat", icon: Bot, label: "AI Advisor", description: "Ask about finances", tintClass: "module-tint-finance" },
  { path: "/finance/review", icon: BarChart3, label: "Monthly Review", description: "Insights & trends", tintClass: "module-tint-finance" },
];

const Finance = () => {
  const { householdId } = useHousehold();
  const { data: summary, isLoading } = useFinanceMonthlySummary(householdId);

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
      <main className="page-content space-y-4 animate-fade-in">
        <div>
          <h1 className="page-heading">Finance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(), "MMMM yyyy")}</p>
        </div>

        {/* Privacy cue */}
        <div className="trust-badge" role="status">
          <Shield className="h-3 w-3" aria-hidden="true" />
          <span>Your financial data stays private to your household</span>
        </div>

        {/* Quick summary row */}
        <div className="grid gap-3 grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Income
              </div>
              <p className="text-lg font-bold">{formatINR(summary?.income || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" /> Spent
              </div>
              <p className="text-lg font-bold">{formatINR(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {financeModules.map(({ path, icon: Icon, label, description, tintClass }) => (
            <Link key={path} to={path} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
              <Card className="h-full transition-all duration-200 hover:shadow-md group-hover:scale-[1.02] group-active:scale-[0.98]" style={{ minHeight: "var(--module-card-min-h)" }}>
                <CardContent className="flex flex-col items-center justify-center text-center p-4 gap-2 h-full">
                  <div className={`rounded-xl p-3 ${tintClass}`}>
                    <Icon style={{ width: "var(--module-icon-size)", height: "var(--module-icon-size)" }} aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight hidden sm:block">
                    {description}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Finance;
