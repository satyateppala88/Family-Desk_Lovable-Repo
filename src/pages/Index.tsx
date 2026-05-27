import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { PendingInvitationBanner } from "@/components/household/PendingInvitationBanner";
import { useHousehold } from "@/hooks/useHousehold";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoadingGrid } from "@/components/ui/page-loading";
import { useEnabledProducts, isProductEnabled, ProductName } from "@/hooks/useEnabledProducts";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import { MODULE_SETUP_KEYS, isModuleSetupComplete } from "@/lib/moduleSetup";
import { OnboardingProgressIndicator } from "@/components/onboarding/OnboardingProgressIndicator";
import { TodaySnapshot } from "@/components/dashboard/TodaySnapshot";
import { QuickActionsRow } from "@/components/dashboard/QuickActionsRow";
import { WeeklyInsightCard } from "@/components/dashboard/WeeklyInsightCard";
import { DashboardNudge } from "@/components/dashboard/DashboardNudge";
import { NotificationsBlockedBanner } from "@/components/dashboard/NotificationsBlockedBanner";
import { InstallAppButton } from "@/components/install/InstallAppButton";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";
import { format } from "date-fns";
import { usePermissionPrimer } from "@/hooks/usePermissionPrimer";
import { PermissionPrimerDialog } from "@/components/permissions/PermissionPrimerDialog";
import { hasAskedPermission, isPermissionRemindActive } from "@/lib/launchStorage";
import { toast } from "sonner";
import {
  CheckSquare,
  UtensilsCrossed,
  ShoppingCart,
  Calendar,
  Leaf,
  Wallet,
} from "lucide-react";

const moduleDefinitions: {
  product: ProductName;
  icon: React.ElementType;
  label: string;
  description: string;
  path: string;
  tintClass: string;
}[] = [
  { product: "tasks", icon: CheckSquare, label: "Tasks", description: "Family to-dos", path: "/taskmaster/today", tintClass: "module-tint-tasks" },
  { product: "meals", icon: UtensilsCrossed, label: "Meals", description: "Weekly meal plans", path: "/meals", tintClass: "module-tint-meals" },
  { product: "grocery", icon: ShoppingCart, label: "Grocery", description: "Pantry & shopping", path: "/grocery", tintClass: "module-tint-grocery" },
  { product: "calendar", icon: Calendar, label: "Calendar", description: "Family schedule", path: "/calendar", tintClass: "module-tint-calendar" },
  { product: "habits", icon: Leaf, label: "Habits", description: "Daily routines", path: "/habits", tintClass: "module-tint-habits" },
  { product: "finance", icon: Wallet, label: "Finance", description: "Budget & savings", path: "/finance", tintClass: "module-tint-finance" },
];

const Index = () => {
  const navigate = useNavigate();
  const { householdId, isLoading, onboardingCompleted, householdName, error, refetch } = useHousehold();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: enabledProducts } = useEnabledProducts(householdId);
  const { data: progressData } = useOnboardingProgress(householdId);
  const { moduleSubtitles, dashStats } = useDashboardSnapshot(householdId);
  const { preferences, isLoading: preferencesLoading } = useHouseholdPreferences(householdId);
  // Banner progress is driven by which enabled modules have been set up,
  // so the percentage and the hide-when-complete logic agree.
  const moduleSetupProducts = (enabledProducts ?? []).filter((p) => !!MODULE_SETUP_KEYS[p as ProductName]);
  const moduleSetupTotal = moduleSetupProducts.length;
  const moduleSetupDone = moduleSetupProducts.reduce((n, p) => {
    const key = MODULE_SETUP_KEYS[p as ProductName];
    return key && isModuleSetupComplete(preferences, key) ? n + 1 : n;
  }, 0);
  const moduleSetupPct =
    moduleSetupTotal > 0
      ? Math.round((moduleSetupDone / moduleSetupTotal) * 100)
      : 0;
  const allModuleSetupsDone =
    moduleSetupTotal === 0 || moduleSetupDone === moduleSetupTotal;
  const showSetupBanner = !preferencesLoading && !onboardingCompleted && !allModuleSetupsDone;

  const { ensurePermission, primerProps } = usePermissionPrimer();

  // One-time welcome toast for brand-new accounts (created within the last 5 minutes).
  useEffect(() => {
    if (!user?.id || !user?.created_at) return;
    const isNewUser =
      Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000;
    if (!isNewUser) return;
    const key = `fd_welcome_toast_shown:${user.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sessionStorage unavailable — fall through, toast will just show once per mount */
    }
    const firstName =
      (user.user_metadata?.display_name as string | undefined)?.split(" ")[0] ||
      "there";
    toast(`Welcome to FamilyDesk, ${firstName}! 👋`, {
      description: "Your household is set up and ready.",
      duration: 4000,
      closeButton: true,
    });
  }, [user]);

  // Contextual notifications primer.
  useEffect(() => {
    if (!householdId) return;
    if (hasAskedPermission("notifications")) return;
    if (isPermissionRemindActive("notifications")) return;
    // If notifications are already OS-denied, don't fire the toast — the
    // NotificationsBlockedBanner below the header surfaces that quietly.
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      return;
    }
    const t = setTimeout(() => {
      void ensurePermission("notifications", "dashboard-first-load");
    }, 500);
    return () => clearTimeout(t);
  }, [householdId, ensurePermission]);

  useEffect(() => {
    if (!isLoading && !householdId && user) {
      navigate("/household-setup");
    }
  }, [isLoading, householdId, user, navigate]);

  const visibleModules = moduleDefinitions.filter((m) =>
    isProductEnabled(enabledProducts, m.product)
  );

  const getModuleHint = (product: ProductName): string | null => {
    return moduleSubtitles?.[product] ?? null;
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <Header />
        <main className="page-content">
          <PageLoadingGrid columns={2} cards={6} />
        </main>
      </div>
    );
  }

  if (error || (!householdId && user)) {
    return (
      <div className="page-container">
        <Header />
        <main className="page-content">
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-sm text-fd-ink-2">
                Having trouble loading your home.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["household"] });
                  refetch?.();
                }}
              >
                Tap to retry
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "";
  const greetingPrefix = getGreetingPrefix();

  return (
    <div className="page-container">
      <Header />
      <main className="page-content animate-fade-in">
        <NotificationsBlockedBanner />
        <PendingInvitationBanner />

        <PermissionPrimerDialog {...primerProps} />

        {showSetupBanner && (
          <Card className="mb-4 border-primary/15">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                <OnboardingProgressIndicator
                  percentage={moduleSetupPct}
                  size="small"
                  showLabel={false}
                />
                <div className="flex-1">
                  <h3 className="font-medium text-sm">Let's finish setting up</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {moduleSetupPct}% done — {moduleSetupDone} of {moduleSetupTotal} modules ready
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/onboarding/preferences")}
                size="sm"
                className="w-full sm:w-auto"
              >
                Continue Setup
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-5">
          <h1 className="font-display text-[26px] leading-tight text-fd-ink">
            {greetingPrefix}
            {firstName && (
              <>
                ,{" "}
                <span className="italic text-fd-green">{firstName}</span>
              </>
            )}
          </h1>
          <p className="text-[12px] text-fd-ink-3 mt-1">
            {householdName ?? ""} · {format(new Date(), "EEEE, d MMM")}
          </p>
        </div>

        {/* Zone 2 — single contextual nudge (festival / overdue / budget / tip) */}
        <DashboardNudge householdId={householdId} />

        {/* Today's snapshot — live status cards */}
        {householdId && <TodaySnapshot householdId={householdId} />}

        {/* Weekly AI-generated insight */}
        {householdId && <WeeklyInsightCard householdId={householdId} />}

        {/* PWA install CTA — auto-hides if already installed, unsupported,
            or running inside the Lovable preview iframe. */}
        <div className="mb-4">
          <InstallAppButton fullWidth label="Install FamilyDesk" />
        </div>

        {/* Quick actions */}
        {householdId && <QuickActionsRow householdId={householdId} />}

        {/* Module grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 module-grid">
          {visibleModules.map(({ product, icon: Icon, label, description, path, tintClass }) => {
            const hint = getModuleHint(product);
            return (
              <Link key={product} to={path} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
                <Card className="h-full transition-all duration-200 hover:shadow-md group-hover:scale-[1.02] group-active:scale-[0.98]" style={{ minHeight: "var(--module-card-min-h)" }}>
                  <CardContent className="flex flex-col items-center justify-center text-center p-4 gap-2 h-full relative">
                    <div className={`rounded-xl p-3 ${tintClass}`}>
                      <Icon style={{ width: "var(--module-icon-size)", height: "var(--module-icon-size)" }} aria-hidden="true" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {hint ? (
                      <span className="text-[10px] font-medium text-primary bg-primary/8 rounded-full px-2 py-0.5">{hint}</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground leading-tight hidden sm:block">
                        {description}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
};

function getGreetingPrefix(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default Index;
