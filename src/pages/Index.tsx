import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { PendingInvitationBanner } from "@/components/household/PendingInvitationBanner";
import { useHousehold } from "@/hooks/useHousehold";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoadingGrid } from "@/components/ui/page-loading";
import { Household } from "@/types/database";
import { useEnabledProducts, isProductEnabled, ProductName } from "@/hooks/useEnabledProducts";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import { MODULE_SETUP_KEYS } from "@/lib/moduleSetup";
import { OnboardingProgressIndicator } from "@/components/onboarding/OnboardingProgressIndicator";
import { FestivalBanner } from "@/components/dashboard/FestivalBanner";
import { TodaySnapshot } from "@/components/dashboard/TodaySnapshot";
import { QuickActionsRow } from "@/components/dashboard/QuickActionsRow";
import { DidYouKnowCard } from "@/components/dashboard/DidYouKnowCard";
import { InstallAppButton } from "@/components/install/InstallAppButton";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";
import { format } from "date-fns";
import { usePermissionPrimer } from "@/hooks/usePermissionPrimer";
import { PermissionPrimerDialog } from "@/components/permissions/PermissionPrimerDialog";
import { hasAskedPermission, isPermissionRemindActive } from "@/lib/launchStorage";
import {
  CheckSquare,
  UtensilsCrossed,
  ShoppingCart,
  Calendar,
  Leaf,
  Wallet,
} from "lucide-react";
import type { Step } from "react-joyride";

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

const dashboardTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to FamilyDesk — your family's hub. Tap a tile below to dive in.",
    placement: "center",
    disableBeacon: true,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { householdId, isLoading, onboardingCompleted } = useHousehold();
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const { data: enabledProducts } = useEnabledProducts(householdId);
  const { data: progressData } = useOnboardingProgress(householdId);
  const { data: dashStats } = useDashboardStats(householdId);
  const { moduleSubtitles } = useDashboardSnapshot(householdId);
  const { preferences } = useHouseholdPreferences(householdId);
  const completedModuleSetups =
    ((preferences as any)?.completed_module_setups as Record<string, boolean> | undefined) ?? {};
  // Banner progress is driven by which enabled modules have been set up,
  // so the percentage and the hide-when-complete logic agree.
  const moduleSetupTotal = (enabledProducts ?? []).length;
  const moduleSetupDone = (enabledProducts ?? []).reduce((n, p) => {
    const key = MODULE_SETUP_KEYS[p as ProductName];
    return key && completedModuleSetups[key] ? n + 1 : n;
  }, 0);
  const moduleSetupPct =
    moduleSetupTotal > 0
      ? Math.round((moduleSetupDone / moduleSetupTotal) * 100)
      : 0;
  const allModuleSetupsDone =
    moduleSetupTotal > 0 && moduleSetupDone === moduleSetupTotal;
  const showSetupBanner = !onboardingCompleted && !allModuleSetupsDone;

  const queryClient = useQueryClient();
  const { data: completedTours, isLoading: toursLoading } = useQuery({
    queryKey: ["completed-tours", user?.id],
    queryFn: async () => {
      if (!user?.id) return {} as Record<string, unknown>;
      const { data, error } = await supabase
        .from("profiles")
        .select("completed_tours")
        .eq("id", user.id)
        .single();
      if (error) return {} as Record<string, unknown>;
      return ((data?.completed_tours as Record<string, unknown>) || {});
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const toursChecked = !!user?.id && !toursLoading && completedTours !== undefined;
  const welcomeAlreadyDone = !!completedTours && (completedTours as any).dashboard_welcome === true;
  const shouldShowWelcome = toursChecked && !welcomeAlreadyDone;
  const [runOnboarding, setRunOnboarding] = useState(false);
  const { ensurePermission, primerProps } = usePermissionPrimer();
  const welcomeVisible = runOnboarding || shouldShowWelcome;

  useEffect(() => {
    if (shouldShowWelcome && householdId) {
      const t = setTimeout(() => setRunOnboarding(true), 500);
      return () => clearTimeout(t);
    }
  }, [shouldShowWelcome, householdId]);

  // Contextual notifications primer: only after the welcome modal is gone.
  useEffect(() => {
    if (!householdId || !toursChecked) return;
    if (welcomeVisible) return;
    if (hasAskedPermission("notifications")) return;
    if (isPermissionRemindActive("notifications")) return;
    const t = setTimeout(() => {
      void ensurePermission("notifications", "dashboard-first-load");
    }, 500);
    return () => clearTimeout(t);
  }, [householdId, toursChecked, welcomeVisible, ensurePermission]);

  useEffect(() => {
    if (!isLoading && !householdId && user) {
      navigate("/household-setup");
    }
  }, [isLoading, householdId, user, navigate]);

  useEffect(() => {
    const fetchHousehold = async () => {
      if (householdId) {
        const { data } = await supabase
          .from("households")
          .select("*")
          .eq("id", householdId)
          .single();
        if (data) setHousehold(data);
      }
    };
    fetchHousehold();
  }, [householdId]);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = async () => {
    setRunOnboarding(false);
    if (!user?.id) return;
    // Patch-merge the completion into completed_tours via the existing RPC,
    // which uses jsonb || to avoid clobbering sibling tour keys.
    const { error } = await supabase.rpc("update_completed_tour", {
      _key: "dashboard_welcome",
    });
    if (error) {
      console.error("Failed to mark dashboard_welcome complete:", error);
      return;
    }
    queryClient.setQueryData(
      ["completed-tours", user.id],
      { ...(completedTours || {}), dashboard_welcome: true }
    );
  };

  const visibleModules = moduleDefinitions.filter((m) =>
    isProductEnabled(enabledProducts, m.product)
  );

  const getModuleHint = (product: ProductName): string | null => {
    return moduleSubtitles?.[product] ?? null;
  };

  if (isLoading || !household) {
    return (
      <div className="page-container">
        <Header onStartOnboarding={handleStartOnboarding} />
        <main className="page-content">
          <PageLoadingGrid columns={2} cards={6} />
        </main>
      </div>
    );
  }

  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "";
  const greetingPrefix = getGreetingPrefix();

  return (
    <div className="page-container">
      <Header onStartOnboarding={handleStartOnboarding} />
      {toursChecked && (
        <OnboardingTour
          run={runOnboarding}
          onComplete={handleOnboardingComplete}
          steps={dashboardTourSteps}
          featureName="dashboard_welcome"
        />
      )}
      <main className="page-content animate-fade-in">
        <PendingInvitationBanner />

        <FestivalBanner />

        {!welcomeVisible && <PermissionPrimerDialog {...primerProps} />}

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
            {household.name} · {format(new Date(), "EEEE, d MMM")}
          </p>
        </div>

        {/* Today's snapshot — live status cards */}
        {householdId && <TodaySnapshot householdId={householdId} />}

        {/* Rotating discovery tip */}
        <DidYouKnowCard />

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
