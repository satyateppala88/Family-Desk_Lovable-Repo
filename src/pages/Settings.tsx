import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";
import { Settings as SettingsIcon, RefreshCw, Copy, Users, UserPlus, Key, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsHouseholdAdmin } from "@/hooks/useIsHouseholdAdmin";
import { usePendingInvitations } from "@/hooks/usePendingInvitations";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { InviteMemberDialog } from "@/components/household/InviteMemberDialog";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import { EditHouseholdBasicsDialog } from "@/components/settings/EditHouseholdBasicsDialog";
import { EditDietaryPreferencesDialog } from "@/components/settings/EditDietaryPreferencesDialog";
import { EditCookingPreferencesDialog } from "@/components/settings/EditCookingPreferencesDialog";
import { EditRoutinePreferencesDialog } from "@/components/settings/EditRoutinePreferencesDialog";
import { EditBudgetPreferencesDialog } from "@/components/settings/EditBudgetPreferencesDialog";
import { supabase } from "@/lib/supabase";
import { HowToUseSection } from "@/components/settings/HowToUseSection";
import { WhatsNewSection } from "@/components/settings/WhatsNewSection";
import { TermsSection, PrivacySection } from "@/components/settings/LegalDocsSection";

export const Settings = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const navigate = useNavigate();
  const { isAdmin } = useIsHouseholdAdmin(householdId);
  const { data: pendingInvitations } = usePendingInvitations(householdId);
  const { preferences, isLoading: preferencesLoading, updatePreferences, isUpdating } = useHouseholdPreferences(householdId);

  const { data: household, isLoading: householdLoading } = useQuery({
    queryKey: ["household-details", householdId],
    queryFn: async () => {
      if (!householdId) return null;
      const { data } = await supabase
        .from("households")
        .select("invite_code, name")
        .eq("id", householdId)
        .single();
      return data;
    },
    enabled: !!householdId,
  });

  const loading = preferencesLoading || householdLoading;

  const copyInviteCode = () => {
    if (household?.invite_code) {
      navigator.clipboard.writeText(household.invite_code);
      toast.success("Invite code copied!");
    }
  };

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
        <main className="page-content">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="page-content">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <h1 className="page-heading">Household Preferences</h1>
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
            <div className="grid gap-4 stagger-fade-in">
              {/* Household Management Section */}
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Household Management
                  </CardTitle>
                  <CardDescription>Invite members and manage your household</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-background rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Household Name
                        </p>
                        <p className="text-lg font-semibold">{household?.name || "Your Household"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-background rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Invite Code
                        </p>
                        <p className="text-2xl font-mono font-bold tracking-wider">
                          {household?.invite_code || "------"}
                        </p>
                      </div>
                      <Button
                        onClick={copyInviteCode}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this code with family members to invite them to your household
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {householdId && (
                        <InviteMemberDialog 
                          householdId={householdId} 
                          trigger={
                            <Button variant="default" className="w-full">
                              <Mail className="h-4 w-4 mr-2" />
                              Invite Member
                            </Button>
                          }
                        />
                      )}
                      <Button
                        onClick={() => navigate("/invitations")}
                        variant="outline"
                        className="w-full relative"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invitations
                        {pendingInvitations && pendingInvitations.length > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                            {pendingInvitations.length}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        onClick={() => navigate("/members")}
                        variant="outline"
                        className="w-full"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Members
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Household Basics</CardTitle>
                    <CardDescription>Basic information about your household</CardDescription>
                  </div>
                  <EditHouseholdBasicsDialog
                    preferences={preferences}
                    onSave={updatePreferences}
                    isUpdating={isUpdating}
                  />
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Dietary Preferences</CardTitle>
                    <CardDescription>Your dietary needs and restrictions</CardDescription>
                  </div>
                  <EditDietaryPreferencesDialog
                    preferences={preferences}
                    onSave={updatePreferences}
                    isUpdating={isUpdating}
                  />
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Cooking & Meal Planning</CardTitle>
                    <CardDescription>Your cooking habits and preferences</CardDescription>
                  </div>
                  <EditCookingPreferencesDialog
                    preferences={preferences}
                    onSave={updatePreferences}
                    isUpdating={isUpdating}
                  />
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Household Routine & Priorities</CardTitle>
                    <CardDescription>Your daily schedule and concerns</CardDescription>
                  </div>
                  <EditRoutinePreferencesDialog
                    preferences={preferences}
                    onSave={updatePreferences}
                    isUpdating={isUpdating}
                  />
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Budget & Shopping</CardTitle>
                    <CardDescription>Your budget and shopping preferences</CardDescription>
                  </div>
                  <EditBudgetPreferencesDialog
                    preferences={preferences}
                    onSave={updatePreferences}
                    isUpdating={isUpdating}
                  />
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

          <HowToUseSection />
          <WhatsNewSection />
          <TermsSection />
          <PrivacySection />
        </div>
      </main>
    </>
  );
};
