import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
import { FamilyDeskLogo } from "@/components/brand/FamilyDeskLogo";

interface HeaderProps {
  onStartOnboarding?: () => void;
}

export const Header = (_props: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { householdId } = useHousehold();
  const { isAdmin } = useIsHouseholdAdmin(householdId);
  const { data: pendingInvitations = [] } = usePendingInvitations(householdId);
  const pendingCount = isAdmin ? pendingInvitations.length : 0;
  const { isPlatformAdmin } = useIsPlatformAdmin();

  // Pull avatar_url from profile so Header reflects user uploads everywhere
  const { data: profile } = useQuery({
    queryKey: ["profile-avatar", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
  const avatarUrl = (profile as any)?.avatar_url || null;
  const profileDisplayName = (profile as any)?.display_name || null;

  const isHomePage = location.pathname === "/dashboard" || location.pathname === "/";

  // Resolve the "parent" route for the back button so users move up one level
  // (e.g. /finance/transactions → /finance) instead of always jumping home.
  // Used as a safe fallback when there's no in-app browser history.
  const getParentRoute = (path: string): string => {
    // Taskmaster: project detail → projects list; other sub-pages → taskmaster hub
    if (/^\/taskmaster\/projects\/[^/]+/.test(path)) return "/taskmaster/projects";
    if (path.startsWith("/taskmaster/")) return "/taskmaster";
    // Finance sub-pages → finance hub
    if (path.startsWith("/finance/")) return "/finance";
    // Grocery sub-pages → grocery hub
    if (path.startsWith("/grocery/")) return "/grocery";
    // Meals sub-pages → meals hub
    if (path.startsWith("/meals/")) return "/meals";
    // Calendar sub-pages → calendar hub
    if (path.startsWith("/calendar/")) return "/calendar";
    // Habits sub-pages → habits hub
    if (path.startsWith("/habits/")) return "/habits";
    // Settings sub-pages (e.g. /settings/notifications) → settings hub
    if (path.startsWith("/settings/")) return "/settings";
    // Household sub-pages (e.g. /household/products) → settings hub
    if (path.startsWith("/household/")) return "/settings";
    // Onboarding sub-pages → dashboard
    if (path.startsWith("/onboarding/")) return "/dashboard";
    // Admin sub-pages → access requests (default admin landing)
    if (path.startsWith("/admin/")) return "/admin/access-requests";
    // Everything else (top-level module pages, settings, etc.) → dashboard
    return "/dashboard";
  };

  const parentRoute = getParentRoute(location.pathname);

  // Soft back: prefer browser history when the user navigated here from
  // within the app; otherwise fall back to the resolved parent route so
  // direct loads / refreshes still go somewhere sensible.
  const handleBack = () => {
    const hasInAppHistory =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      // history.state.idx is set by react-router; >0 means we have a prior entry
      ((window.history.state && (window.history.state as any).idx > 0) ||
        document.referrer.startsWith(window.location.origin));

    if (hasInAppHistory) {
      navigate(-1);
    } else {
      navigate(parentRoute);
    }
  };

  const getInitials = () => {
    const source =
      profileDisplayName ||
      user?.user_metadata?.display_name ||
      user?.email?.split("@")[0] ||
      "";
    if (!source) return "U";
    return source
      .split(/[\s._-]+/)
      .filter(Boolean)
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
    <header
      className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/60"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
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
              onClick={handleBack}
              className="flex items-center gap-1 p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              aria-label="Back"
              style={{ minHeight: "var(--touch-target)" }}
            >
              <ChevronLeft className="h-5 w-5" />
              <Home className="h-4 w-4 hidden sm:block" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 min-w-0"
            aria-label="FamilyDesk home"
          >
            {isHomePage ? (
              <FamilyDeskLogo size="sm" showTagline={false} />
            ) : (
              <span className="text-[18px] font-medium text-fd-ink tracking-tight truncate">
                {pageTitle || "FamilyDesk"}
              </span>
            )}
          </button>
        </div>

        {/* Right: Avatar / Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative flex items-center gap-2 rounded-full p-0.5 hover:bg-accent transition-colors user-menu"
              style={{ minHeight: "var(--touch-target)" }}
            >
              <Avatar className="h-8 w-8 ring-2 ring-border/50 transition-all hover:ring-primary/30">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
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
            <DropdownMenuItem onClick={() => navigate("/how-to-use")}>
              How to use
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/finance/report")}>
              Monthly Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/whats-new")}>
              What's new
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/welcome")}>
              Replay welcome tour
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
