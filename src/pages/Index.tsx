import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { ResetOnboardingButton } from "@/components/development/ResetOnboardingButton";
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
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { DashboardTaskWidget } from "@/components/dashboard/DashboardTaskWidget";
import { DashboardMealWidget } from "@/components/dashboard/DashboardMealWidget";
import { DashboardGroceryWidget } from "@/components/dashboard/DashboardGroceryWidget";
import { DashboardCalendarWidget } from "@/components/dashboard/DashboardCalendarWidget";
import { DashboardFinanceWidget } from "@/components/dashboard/DashboardFinanceWidget";
import { useEnabledProducts, isProductEnabled } from "@/hooks/useEnabledProducts";
import { OnboardingProgressIndicator } from "@/components/onboarding/OnboardingProgressIndicator";
import type { Step } from "react-joyride";

const dashboardTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to FamilyDesk! Your central hub for managing household activities.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: ".dashboard-overview",
    content: "This is your dashboard showing an overview of tasks, meals, calendar events, and pantry status.",
    placement: "bottom",
  },
  {
    target: "[data-tour='tasks-card']",
    content: "Quick view of pending tasks. Click to manage all your household tasks.",
    placement: "top",
  },
  {
    target: "[data-tour='meals-card']",
    content: "Today's meal plan at a glance. Get AI-powered meal suggestions based on your preferences.",
    placement: "top",
  },
  {
    target: "[data-tour='grocery-card']",
    content: "Track your pantry inventory and manage shopping lists.",
    placement: "top",
  },
  {
    target: "[data-tour='calendar-card']",
    content: "Upcoming events and deadlines from your connected calendars.",
    placement: "top",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { householdId, isLoading, onboardingCompleted } = useHousehold();
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats(householdId);
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

  if (isLoading || !household) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onStartOnboarding={handleStartOnboarding} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        </main>
        <MobileNav />
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
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 pb-20">
        <ResetOnboardingButton />
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
        
        <div className="mb-6 dashboard-overview">
          <h1 className="text-2xl font-semibold tracking-tight">{household.name}</h1>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 dashboard-overview">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}
            </>
          ) : (
            <>
              {isProductEnabled(enabledProducts, "tasks") && (
                <div data-tour="tasks-card">
                  <DashboardTaskWidget 
                    tasks={dashboardStats?.tasks || []} 
                    pendingCount={dashboardStats?.pendingTasksCount || 0}
                  />
                </div>
              )}
              {isProductEnabled(enabledProducts, "meals") && (
                <div data-tour="meals-card">
                  <DashboardMealWidget todayMeals={dashboardStats?.todayMeals || []} />
                </div>
              )}
              {isProductEnabled(enabledProducts, "grocery") && (
                <div data-tour="grocery-card">
                  <DashboardGroceryWidget pantryItemsCount={dashboardStats?.pantryItemsCount || 0} />
                </div>
              )}
              {isProductEnabled(enabledProducts, "calendar") && (
                <div data-tour="calendar-card">
                  <DashboardCalendarWidget />
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
};

export default Index;
