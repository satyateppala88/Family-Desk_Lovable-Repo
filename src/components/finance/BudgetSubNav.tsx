import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/finance/budget", label: "Monthly", end: true },
  { to: "/finance/budget/annual", label: "Annual" },
  { to: "/finance/budget/categories", label: "Categories" },
];

export const BudgetSubNav = () => {
  const { search } = useLocation();
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 w-fit">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={`${t.to}${t.to.startsWith("/finance/budget") && !t.to.includes("categories") ? search : ""}`}
          end={t.end as boolean | undefined}
          className={({ isActive }) =>
            cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
};