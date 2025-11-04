import { Link, useLocation } from "react-router-dom";
import { Home, CheckSquare, UtensilsCrossed, ShoppingCart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/meals", icon: UtensilsCrossed, label: "Meals" },
  { path: "/grocery", icon: ShoppingCart, label: "Grocery" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
];

export const MobileNav = () => {
  const location = useLocation();

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
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
