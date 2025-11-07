import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, HelpCircle, FileText, Shield, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHousehold } from "@/hooks/useHousehold";
import { useIsHouseholdAdmin } from "@/hooks/useIsHouseholdAdmin";
import { usePendingInvitations } from "@/hooks/usePendingInvitations";
import logoImg from "@/assets/logo-family-hub-v4.png";

interface HeaderProps {
  onStartOnboarding?: () => void;
}

export const Header = ({ onStartOnboarding }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { householdId } = useHousehold();
  const { isAdmin } = useIsHouseholdAdmin(householdId);
  const { data: pendingInvitations = [] } = usePendingInvitations(householdId);
  const pendingCount = isAdmin ? pendingInvitations.length : 0;

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
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <img src={logoImg} alt="HomeMate Logo" className="h-12 w-12 object-contain" />
          <h1 className="text-xl font-bold text-primary">HomeMate</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative">
              <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity user-menu">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {pendingCount}
                </Badge>
              )}
            </div>
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
              <User className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Household Settings
            </DropdownMenuItem>
            {isAdmin && pendingCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/household/invitations")}>
                  <Bell className="mr-2 h-4 w-4" />
                  Pending Invitations
                  <Badge variant="destructive" className="ml-auto">
                    {pendingCount}
                  </Badge>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onStartOnboarding}>
              <HelpCircle className="mr-2 h-4 w-4" />
              User Guide
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/terms")}>
              <FileText className="mr-2 h-4 w-4" />
              Terms of Service
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/privacy")}>
              <Shield className="mr-2 h-4 w-4" />
              Privacy Policy
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
