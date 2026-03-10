import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { PendingInvitationBanner } from "@/components/household/PendingInvitationBanner";
import { useHousehold } from "@/hooks/useHousehold";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageLoadingGrid } from "@/components/ui/page-loading";
import { Household } from "@/types/database";
import { useEnabledProducts, isProductEnabled, ProductName } from "@/hooks/useEnabledProducts";
import { OnboardingProgressIndicator } from "@/components/onboarding/OnboardingProgressIndicator";
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
  { product: "tasks", icon: CheckSquare, label: "Tasks", description: "Manage to-dos", path: "/tasks", tintClass: "module-tint-tasks" },
  { product: "meals", icon: UtensilsCrossed, label: "Meals", description: "Plan weekly meals", path: "/meals", tintClass: "module-tint-meals" },
  { product: "grocery", icon: ShoppingCart, label: "Grocery", description: "Pantry & shopping", path: "/grocery", tintClass: "module-tint-grocery" },
  { product: "calendar", icon: Calendar, label: "Calendar", description: "Events & schedules", path: "/calendar", tintClass: "module-tint-calendar" },
  { product: "habits", icon: Leaf, label: "Habits", description: "Track daily habits", path: "/habits", tintClass: "module-tint-habits" },
  { product: "finance", icon: Wallet, label: "Finance", description: "Budget & expenses", path: "/finance", tintClass: "module-tint-finance" },
];

const dashboardTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to FamilyDesk! Your central hub for managing household activities.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: ".module-grid",
    content: "These are your enabled modules. Tap any to get started.",
    placement: "bottom",
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

  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("dashboard");
  const [runOnboarding, setRunOnboarding] = useState(false);

  useEffect(() => {
    if (tourChecked && shouldShowTour && householdId) {
      setTimeout(() => setRunOnboarding(true), 500);
    }
  }, [tourChecked, shouldShowTour, householdId]);

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
  const handleOnboardingComplete = () => {
    setRunOnboarding(false);
    markTourComplete();
  };

  const visibleModules = moduleDefinitions.filter((m) =>
    isProductEnabled(enabledProducts, m.product)
  );

  // Derive subtle context cues per module
  const getModuleHint = (product: ProductName): string | null => {
    if (!dashStats) return null;
    switch (product) {
      case "tasks":
        return dashStats.pendingTasksCount > 0 ? `${dashStats.pendingTasksCount} pending` : null;
      case "meals":
        return dashStats.todayMeals?.length > 0 ? `${dashStats.todayMeals.length} today` : null;
      case "grocery":
        return dashStats.pantryItemsCount > 0 ? `${dashStats.pantryItemsCount} items` : null;
      default:
        return null;
    }
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

  return (
    <div className="page-container">
      <Header onStartOnboarding={handleStartOnboarding} />
      {tourChecked && (
        <OnboardingTour
          run={runOnboarding}
          onComplete={handleOnboardingComplete}
          steps={dashboardTourSteps}
          featureName="dashboard"
        />
      )}
      <main className="page-content animate-fade-in">
        <PendingInvitationBanner />

        {!onboardingCompleted && progressData && progressData.percentage < 100 && (
          <Card className="mb-4 border-primary/15">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                <OnboardingProgressIndicator
                  percentage={progressData.percentage}
                  size="small"
                  showLabel={false}
                />
                <div className="flex-1">
                  <h3 className="font-medium text-sm">Complete your setup</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {progressData.percentage}% complete
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/onboarding/preferences")}
                size="sm"
                className="w-full sm:w-auto"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-5">
          <h1 className="page-heading">{household.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Your household at a glance</p>
        </div>

        {/* Module grid with context cues */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 module-grid">
          {visibleModules.map(({ product, icon: Icon, label, description, path, tintClass }) => {
            const hint = getModuleHint(product);
            return (
              <Link key={product} to={path} className="block group">
                <Card className="h-full transition-all duration-200 hover:shadow-md group-hover:scale-[1.02] group-active:scale-[0.98]" style={{ minHeight: "var(--module-card-min-h)" }}>
                  <CardContent className="flex flex-col items-center justify-center text-center p-4 gap-2 h-full relative">
                    <div className={`rounded-xl p-3 ${tintClass}`}>
                      <Icon style={{ width: "var(--module-icon-size)", height: "var(--module-icon-size)" }} />
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

export default Index;
