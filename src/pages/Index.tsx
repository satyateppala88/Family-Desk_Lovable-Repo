import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

import { PendingInvitationBanner } from "@/components/household/PendingInvitationBanner";
import { useHousehold } from "@/hooks/useHousehold";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
}[] = [
  { product: "tasks", icon: CheckSquare, label: "Tasks", description: "Manage to-dos", path: "/tasks" },
  { product: "meals", icon: UtensilsCrossed, label: "Meals", description: "Plan weekly meals", path: "/meals" },
  { product: "grocery", icon: ShoppingCart, label: "Grocery", description: "Pantry & shopping", path: "/grocery" },
  { product: "calendar", icon: Calendar, label: "Calendar", description: "Events & schedules", path: "/calendar" },
  { product: "habits", icon: Leaf, label: "Habits", description: "Track daily habits", path: "/habits" },
  { product: "finance", icon: Wallet, label: "Finance", description: "Budget & expenses", path: "/finance" },
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

  if (isLoading || !household) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onStartOnboarding={handleStartOnboarding} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onStartOnboarding={handleStartOnboarding} />
      {tourChecked && (
        <OnboardingTour
          run={runOnboarding}
          onComplete={handleOnboardingComplete}
          steps={dashboardTourSteps}
          featureName="dashboard"
        />
      )}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6">
        
        <PendingInvitationBanner />

        {!onboardingCompleted && progressData && progressData.percentage < 100 && (
          <Card className="mb-6 border border-border">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                <OnboardingProgressIndicator
                  percentage={progressData.percentage}
                  size="small"
                  showLabel={false}
                />
                <div>
                  <h3 className="font-medium text-sm">Complete your setup</h3>
                  <p className="text-xs text-muted-foreground">
                    {progressData.percentage}% complete
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/onboarding/preferences")}
                size="sm"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{household.name}</h1>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 module-grid">
          {visibleModules.map(({ product, icon: Icon, label, description, path }) => (
            <Link key={product} to={path} className="block">
              <Card className="h-full hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border border-border">
                <CardContent className="flex flex-col items-center justify-center text-center p-4 sm:p-6 gap-2">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight hidden sm:block">
                    {description}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
