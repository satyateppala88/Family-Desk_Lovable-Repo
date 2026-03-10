import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHousehold } from "@/hooks/useHousehold";
import { useIsHouseholdAdmin } from "@/hooks/useIsHouseholdAdmin";
import { usePendingInvitations } from "@/hooks/usePendingInvitations";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";

interface HeaderProps {
  onStartOnboarding?: () => void;
}

export const Header = ({ onStartOnboarding }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { householdId } = useHousehold();
  const { isAdmin } = useIsHouseholdAdmin(householdId);
  const { data: pendingInvitations = [] } = usePendingInvitations(householdId);
  const pendingCount = isAdmin ? pendingInvitations.length : 0;
  const { isPlatformAdmin } = useIsPlatformAdmin();

  const isHomePage = location.pathname === "/dashboard" || location.pathname === "/";

  const getInitials = () => {
    if (!user?.user_metadata?.display_name) return "U";
    return user.user_metadata.display_name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Derive the current module name from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith("/tasks")) return "Tasks";
    if (path.startsWith("/meals")) return "Meals";
    if (path.startsWith("/grocery")) return "Grocery";
    if (path.startsWith("/calendar")) return "Calendar";
    if (path.startsWith("/habits")) return "Habits";
    if (path.startsWith("/finance")) return "Finance";
    if (path.startsWith("/settings")) return "Settings";
    if (path.startsWith("/account-settings")) return "Account";
    if (path.startsWith("/members")) return "Members";
    if (path.startsWith("/invitations")) return "Invitations";
    if (path.startsWith("/taskmaster")) return "Taskmaster";
    return null;
  };

  const pageTitle = getPageTitle();

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/60">
      <div
        className="w-full mx-auto flex h-14 items-center justify-between gap-3"
        style={{
          maxWidth: "var(--content-max-width)",
          paddingLeft: "var(--page-padding-x)",
          paddingRight: "var(--page-padding-x)",
        }}
      >
        {/* Left: Back + Brand / Page title */}
        <div className="flex items-center gap-0.5 min-w-0">
          {!isHomePage ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              aria-label="Back to home"
              style={{ minHeight: "var(--touch-target)" }}
            >
              <ChevronLeft className="h-5 w-5" />
              <Home className="h-4 w-4 hidden sm:block" />
            </button>
          ) : null}

          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-lg font-semibold text-foreground tracking-tight cursor-pointer truncate"
              onClick={() => navigate("/dashboard")}
            >
              {isHomePage ? "FamilyDesk" : pageTitle || "FamilyDesk"}
            </span>
          </div>
        </div>

        {/* Right: Avatar / Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative flex items-center gap-2 rounded-full p-0.5 hover:bg-accent transition-colors user-menu"
              style={{ minHeight: "var(--touch-target)" }}
            >
              <Avatar className="h-8 w-8 ring-2 ring-border/50 transition-all hover:ring-primary/30">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.user_metadata?.display_name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/account-settings")}>
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              Household Settings
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/members")}>
                  Manage Members
                </DropdownMenuItem>
                {pendingCount > 0 && (
                  <DropdownMenuItem onClick={() => navigate("/invitations")}>
                    Pending Invitations
                    <span className="ml-auto text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  </DropdownMenuItem>
                )}
              </>
            )}
            {isPlatformAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/access-requests")}>
                  Admin Panel
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onStartOnboarding}>
              User Guide
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/terms")}>
              Terms of Service
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/privacy")}>
              Privacy Policy
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
