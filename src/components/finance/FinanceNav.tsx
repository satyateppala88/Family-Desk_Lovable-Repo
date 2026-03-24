import { LayoutDashboard, ArrowLeftRight, Target, PiggyBank, Bot, BarChart3, RefreshCw } from "lucide-react";
import { SubNav, type SubNavItem } from "@/components/ui/sub-nav";

const navItems: SubNavItem[] = [
  { path: "/finance", label: "Overview", icon: LayoutDashboard },
  { path: "/finance/transactions", label: "Txns", icon: ArrowLeftRight },
  { path: "/finance/subscriptions", label: "Subs", icon: RefreshCw },
  { path: "/finance/budget", label: "Budget", icon: Target },
  { path: "/finance/savings", label: "Savings", icon: PiggyBank },
  { path: "/finance/chat", label: "AI", icon: Bot },
  { path: "/finance/review", label: "Review", icon: BarChart3 },
];

export const FinanceNav = () => {
  return <SubNav items={navItems} />;
};
