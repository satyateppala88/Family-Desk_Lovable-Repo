import { Link, useLocation } from "react-router-dom";
import { Home, CheckSquare, UtensilsCrossed, ShoppingCart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/hooks/useHousehold";
import { useEnabledProducts, isProductEnabled, ProductName } from "@/hooks/useEnabledProducts";

const allNavItems = [
  { path: "/dashboard", icon: Home, label: "Home", product: null },
  { path: "/tasks", icon: CheckSquare, label: "Tasks", product: "tasks" as ProductName },
  { path: "/meals", icon: UtensilsCrossed, label: "Meals", product: "meals" as ProductName },
  { path: "/grocery", icon: ShoppingCart, label: "Grocery", product: "grocery" as ProductName },
  { path: "/calendar", icon: Calendar, label: "Calendar", product: "calendar" as ProductName },
];

export const MobileNav = () => {
  const location = useLocation();
  const { householdId } = useHousehold();
  const { data: enabledProducts } = useEnabledProducts(householdId);

  const navItems = allNavItems.filter((item) => {
    if (!item.product) return true; // Always show Home
    return isProductEnabled(enabledProducts, item.product);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200",
                isActive
                  ? "text-accent font-semibold"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon className={cn("w-6 h-6 mb-1", isActive && "scale-110")} />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
