import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  CheckSquare, 
  UtensilsCrossed, 
  ShoppingCart, 
  Calendar,
  ListTodo,
  Folder,
  LayoutDashboard,
  ChevronUp,
  Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/hooks/useHousehold";
import { useEnabledProducts, isProductEnabled, ProductName } from "@/hooks/useEnabledProducts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const allNavItems = [
  { path: "/dashboard", icon: Home, label: "Home", product: null },
  { path: "/tasks", icon: CheckSquare, label: "Tasks", product: "tasks" as ProductName, hasSubmenu: true },
  { path: "/meals", icon: UtensilsCrossed, label: "Meals", product: "meals" as ProductName },
  { path: "/grocery", icon: ShoppingCart, label: "Grocery", product: "grocery" as ProductName },
  { path: "/calendar", icon: Calendar, label: "Calendar", product: "calendar" as ProductName },
];

const taskmasterSubmenu = [
  { path: "/taskmaster/today", icon: Sun, label: "Today" },
  { path: "/taskmaster/my-tasks", icon: ListTodo, label: "My Tasks" },
  { path: "/taskmaster/tasks", icon: CheckSquare, label: "All Tasks" },
  { path: "/taskmaster/projects", icon: Folder, label: "Projects" },
  { path: "/taskmaster/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

export const MobileNav = () => {
  const location = useLocation();
  const { householdId } = useHousehold();
  const { data: enabledProducts } = useEnabledProducts(householdId);
  const [tasksMenuOpen, setTasksMenuOpen] = useState(false);

  const navItems = allNavItems.filter((item) => {
    if (!item.product) return true;
    return isProductEnabled(enabledProducts, item.product);
  });

  const isTaskmasterRoute = location.pathname.startsWith("/taskmaster") || location.pathname === "/tasks";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label, hasSubmenu }) => {
          const isActive = hasSubmenu 
            ? isTaskmasterRoute
            : location.pathname === path;

          if (hasSubmenu) {
            return (
              <DropdownMenu key={path} open={tasksMenuOpen} onOpenChange={setTasksMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200",
                      isActive
                        ? "text-accent font-semibold"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <div className="relative">
                      <Icon className={cn("w-6 h-6 mb-1", isActive && "scale-110")} />
                      <ChevronUp className="w-3 h-3 absolute -top-1 -right-2" />
                    </div>
                    <span className="text-xs">{label}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="w-48 mb-2">
                  {taskmasterSubmenu.map((subItem) => (
                    <DropdownMenuItem key={subItem.path} asChild>
                      <Link
                        to={subItem.path}
                        className={cn(
                          "flex items-center gap-2",
                          location.pathname === subItem.path && "font-semibold"
                        )}
                        onClick={() => setTasksMenuOpen(false)}
                      >
                        <subItem.icon className="w-4 h-4" />
                        {subItem.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

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
