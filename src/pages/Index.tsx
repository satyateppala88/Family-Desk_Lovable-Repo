import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingProgressIndicator } from "@/components/onboarding/OnboardingProgressIndicator";
import { ResetOnboardingButton } from "@/components/development/ResetOnboardingButton";
import { useHousehold } from "@/hooks/useHousehold";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useAuth } from "@/contexts/AuthContext";
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

const Index = () => {
  const navigate = useNavigate();
  const { householdId, isLoading, onboardingCompleted } = useHousehold();
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [runOnboarding, setRunOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats(householdId);
  const { data: enabledProducts } = useEnabledProducts(householdId);
  const { data: progressData } = useOnboardingProgress(householdId);

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

  useEffect(() => {
    const checkOnboarding = async () => {
      if (user && !isLoading && householdId) {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();
        
        if (data && !data.onboarding_completed) {
          setTimeout(() => setRunOnboarding(true), 500);
        }
        setOnboardingChecked(true);
      }
    };
    checkOnboarding();
  }, [user, isLoading, householdId]);

  const handleStartOnboarding = () => {
    setRunOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setRunOnboarding(false);
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
      {onboardingChecked && (
        <OnboardingTour run={runOnboarding} onComplete={handleOnboardingComplete} />
      )}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
        {/* Development Reset Button - Only in development */}
        <ResetOnboardingButton />
        
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
        
        <div className="mb-8 sm:mb-10 dashboard-overview">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3">Welcome to {household.name}</h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Manage your household tasks, meals, and groceries all in one place
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 dashboard-overview">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </>
          ) : (
            <>
              {isProductEnabled(enabledProducts, "tasks") && (
                <DashboardTaskWidget 
                  tasks={dashboardStats?.tasks || []} 
                  pendingCount={dashboardStats?.pendingTasksCount || 0}
                />
              )}
              {isProductEnabled(enabledProducts, "meals") && (
                <DashboardMealWidget todayMeals={dashboardStats?.todayMeals || []} />
              )}
              {isProductEnabled(enabledProducts, "grocery") && (
                <DashboardGroceryWidget pantryItemsCount={dashboardStats?.pantryItemsCount || 0} />
              )}
              {isProductEnabled(enabledProducts, "calendar") && (
                <DashboardCalendarWidget />
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
