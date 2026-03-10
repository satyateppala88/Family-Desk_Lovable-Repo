import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="w-full mx-auto flex h-14 items-center justify-between" style={{ maxWidth: 'var(--content-max-width)', paddingLeft: 'var(--page-padding-x)', paddingRight: 'var(--page-padding-x)' }}>
        <div className="flex items-center gap-1">
          {!isHomePage && (
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to home"
              style={{ minHeight: 'var(--touch-target)' }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <span
            className="text-lg font-semibold text-foreground tracking-tight cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            FamilyDesk
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative">
              <Avatar className="h-8 w-8 cursor-pointer hover:opacity-70 transition-opacity">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
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
                    Pending Invitations ({pendingCount})
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
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
