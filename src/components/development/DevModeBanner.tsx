import { useDevMode } from "@/contexts/DevModeContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FlaskConical, RefreshCw, LogOut, LayoutDashboard, CheckSquare, Utensils, ShoppingCart, Calendar, Target } from "lucide-react";

export const DevModeBanner = () => {
  const { isDevMode, isDevEnvironment, isLoading, resetTestData, disableDevMode } = useDevMode();

  // Only show in dev environment when dev mode is active
  if (!isDevEnvironment || !isDevMode) {
    return null;
  }

  const quickLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/tasks", label: "Tasks", icon: CheckSquare },
    { to: "/meals", label: "Meals", icon: Utensils },
    { to: "/grocery", label: "Grocery", icon: ShoppingCart },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/habits", label: "Habits", icon: Target },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-purple-600 text-white px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          <span className="font-semibold text-sm">DEV MODE</span>
          <span className="text-purple-200 text-xs hidden sm:inline">| testuser@familydesk.dev</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {quickLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-purple-700 h-7 px-2 text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                <span className="hidden md:inline">{label}</span>
              </Button>
            </Link>
          ))}

          <div className="h-4 w-px bg-purple-400 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={resetTestData}
            disabled={isLoading}
            className="text-white hover:bg-purple-700 h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Reset
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={disableDevMode}
            className="text-white hover:bg-purple-700 h-7 px-2 text-xs"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
};
