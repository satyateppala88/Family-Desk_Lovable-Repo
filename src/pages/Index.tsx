import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingProgressIndicator } from "@/components/onboarding/OnboardingProgressIndicator";
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
import { useEnabledProducts, isProductEnabled } from "@/hooks/useEnabledProducts";
import { ArrowRight } from "lucide-react";
import type { Step } from "react-joyride";

const dashboardTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Family Desk! Your central hub for managing household activities.",
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
  {
    target: ".user-menu",
    content: "Access settings, household management, and this guide anytime from the menu.",
    placement: "bottom",
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
  
  // Feature-specific tour
  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("dashboard");
  const [runOnboarding, setRunOnboarding] = useState(false);

  // Start tour automatically if user hasn't seen it
  useEffect(() => {
    if (tourChecked && shouldShowTour && householdId) {
      setTimeout(() => setRunOnboarding(true), 500);
    }
  }, [tourChecked, shouldShowTour, householdId]);

  // Safety net: redirect users without a household to setup
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

  const handleStartOnboarding = () => {
    setRunOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setRunOnboarding(false);
    markTourComplete();
  };

  if (isLoading || !household) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onStartOnboarding={handleStartOnboarding} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
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
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-20">
        {/* Development Reset Button - Only in development */}
        <ResetOnboardingButton />
        
        {/* Pending Invitation Banner - Show if user has been invited to another household */}
        <PendingInvitationBanner />
        
        {/* Onboarding Progress Card - Only show if not completed */}
        {!onboardingCompleted && progressData && progressData.percentage < 100 && (
          <Card className="mb-6 border-warning/50 bg-gradient-to-r from-warning/5 to-accent/5">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <OnboardingProgressIndicator 
                  percentage={progressData.percentage} 
                  size="small"
                  showLabel={false}
                />
                <div>
                  <h3 className="font-semibold text-base sm:text-lg">Complete Your Household Setup</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {progressData.percentage}% complete - Help us personalize your experience
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate("/onboarding/preferences")}
                className="w-full sm:w-auto"
              >
                Continue Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
        
        <div className="mb-4 sm:mb-6 dashboard-overview">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Welcome to {household.name}</h1>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
            Manage your household tasks, meals, and groceries all in one place
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 dashboard-overview">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
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
