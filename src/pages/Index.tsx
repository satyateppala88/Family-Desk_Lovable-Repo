import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  CheckSquare, 
  Calendar as CalendarIcon, 
  ShoppingCart, 
  ChefHat 
} from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Household } from "@/types/database";

const Index = () => {
  const { householdId, isLoading } = useHousehold();
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [runOnboarding, setRunOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

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
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-10 dashboard-overview">
          <h1 className="text-4xl font-bold mb-3">Welcome to {household.name}</h1>
          <p className="text-lg text-muted-foreground">
            Manage your household tasks, meals, and groceries all in one place
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 dashboard-overview">
          <Link to="/tasks" className="block hover:scale-[1.02] transition-transform tasks-card">
            <Card className="h-full border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CheckSquare className="h-8 w-8 text-primary" />
                  Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage and track household tasks
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/meals" className="block hover:scale-[1.02] transition-transform meals-card">
            <Card className="h-full border-l-4 border-l-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <ChefHat className="h-8 w-8 text-accent" />
                  Meals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Plan meals with AI-powered Indian recipes
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/grocery" className="block hover:scale-[1.02] transition-transform grocery-card">
            <Card className="h-full border-l-4 border-l-[hsl(145,65%,45%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <ShoppingCart className="h-8 w-8" style={{ color: "hsl(145, 65%, 45%)" }} />
                  Grocery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create and manage shopping lists
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/calendar" className="block hover:scale-[1.02] transition-transform calendar-card">
            <Card className="h-full border-l-4 border-l-[hsl(215,75%,55%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CalendarIcon className="h-8 w-8" style={{ color: "hsl(215, 75%, 55%)" }} />
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View events and schedules
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
};

export default Index;
