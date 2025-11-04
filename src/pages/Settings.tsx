import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";
import { HouseholdPreferences } from "@/types/database";
import { Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Settings = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<HouseholdPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!householdId) return;

      try {
        const { data, error } = await supabase
          .from("household_preferences")
          .select("*")
          .eq("household_id", householdId)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        setPreferences(data as HouseholdPreferences);
      } catch (error: any) {
        toast.error("Failed to load preferences: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [householdId]);

  const handleRerunOnboarding = () => {
    navigate("/onboarding/preferences");
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "Not set";
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "None";
    }
    if (typeof value === "string") {
      return value.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }
    return String(value);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8 px-4">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <Footer />
        <MobileNav />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto py-6 sm:py-8 px-4 sm:px-6 min-h-screen pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Household Preferences</h1>
            </div>
            <Button onClick={handleRerunOnboarding} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Update Preferences</span>
              <span className="sm:hidden">Update</span>
            </Button>
          </div>

          {!preferences ? (
            <Card>
              <CardHeader>
                <CardTitle>No Preferences Set</CardTitle>
                <CardDescription>
                  You haven't completed the onboarding process yet. Click the button below to set up your preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleRerunOnboarding}>
                  Complete Onboarding
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Household Basics</CardTitle>
                  <CardDescription>Basic information about your household</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Adults</p>
                      <p className="text-lg">{preferences.family_size_adults}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Children</p>
                      <p className="text-lg">{preferences.family_size_children}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Household Type</p>
                    <p className="text-lg">{formatValue(preferences.household_type)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dietary Preferences</CardTitle>
                  <CardDescription>Your dietary needs and restrictions</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Diet Type</p>
                    <p className="text-lg">{formatValue(preferences.diet_type)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Food Allergies</p>
                    <p className="text-lg">{formatValue(preferences.food_allergies)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Religious Restrictions</p>
                    <p className="text-lg">{formatValue(preferences.religious_restrictions)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Spice Level</p>
                    <p className="text-lg">{formatValue(preferences.spice_level)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Regional Cuisines</p>
                    <p className="text-lg">{formatValue(preferences.regional_cuisines)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cooking & Meal Planning</CardTitle>
                  <CardDescription>Your cooking habits and preferences</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cooking Skill Level</p>
                    <p className="text-lg">{formatValue(preferences.cooking_skill_level)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Weekday Cooking Time</p>
                    <p className="text-lg">{formatValue(preferences.weekday_cooking_time)} minutes</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Preferred Meal Types</p>
                    <p className="text-lg">{formatValue(preferences.preferred_meal_types)}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pantry Size</p>
                      <p className="text-lg">{formatValue(preferences.pantry_size)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Shopping Frequency</p>
                      <p className="text-lg">{formatValue(preferences.shopping_frequency)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Household Routine & Priorities</CardTitle>
                  <CardDescription>Your daily schedule and concerns</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Household Concerns</p>
                    <p className="text-lg">{formatValue(preferences.household_concerns)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Work Schedule</p>
                    <p className="text-lg">{formatValue(preferences.work_schedule)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Preferred Task Time</p>
                    <p className="text-lg">{formatValue(preferences.preferred_task_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Festival Importance</p>
                    <p className="text-lg">{formatValue(preferences.festival_importance)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget & Shopping</CardTitle>
                  <CardDescription>Your budget and shopping preferences</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Grocery Budget</p>
                    <p className="text-lg">{formatValue(preferences.monthly_grocery_budget)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Shopping Locations</p>
                    <p className="text-lg">{formatValue(preferences.shopping_locations)}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Organic Preference</p>
                      <p className="text-lg">{formatValue(preferences.organic_preference)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Budget Consciousness</p>
                      <p className="text-lg">{formatValue(preferences.budget_consciousness)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(preferences.updated_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    These preferences help our AI provide personalized meal suggestions and task recommendations tailored to your household needs.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
};
