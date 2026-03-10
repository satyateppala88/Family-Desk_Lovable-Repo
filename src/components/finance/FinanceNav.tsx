import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/finance", label: "Overview" },
  { path: "/finance/transactions", label: "Transactions" },
  { path: "/finance/budget", label: "Budget" },
  { path: "/finance/savings", label: "Savings" },
  { path: "/finance/chat", label: "AI Advisor" },
  { path: "/finance/review", label: "Monthly Review" },
];

export const FinanceNav = () => {
  const location = useLocation();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
            location.pathname === item.path
              ? "bg-secondary text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};
