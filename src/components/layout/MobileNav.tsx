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
  Sun,
  Leaf
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
  { path: "/habits", icon: Leaf, label: "Habits", product: "habits" as ProductName },
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
  
  const settingsRoutes = ["/settings", "/members", "/invitations", "/account-settings", "/household"];
  const isSettingsRoute = settingsRoutes.some(route => location.pathname.startsWith(route));

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border z-50">
      <div className="flex items-center h-14 px-1">
        {navItems.map(({ path, icon: Icon, label, hasSubmenu }) => {
          const isActive = hasSubmenu 
            ? isTaskmasterRoute
            : path === "/dashboard"
              ? location.pathname === path || isSettingsRoute
              : location.pathname === path;

          if (hasSubmenu) {
            return (
              <DropdownMenu key={path} open={tasksMenuOpen} onOpenChange={setTasksMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center justify-center min-w-[64px] flex-1 h-full transition-colors duration-150 px-2",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px]">{label}</span>
                    {isActive && <span className="w-1 h-1 rounded-full bg-foreground mt-0.5" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="w-44 mb-2">
                  {taskmasterSubmenu.map((subItem) => (
                    <DropdownMenuItem key={subItem.path} asChild>
                      <Link
                        to={subItem.path}
                        className={cn(
                          "flex items-center gap-2",
                          location.pathname === subItem.path && "font-medium"
                        )}
                        onClick={() => setTasksMenuOpen(false)}
                      >
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
                "flex flex-col items-center justify-center min-w-[64px] flex-1 h-full transition-colors duration-150 px-2",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-foreground mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
