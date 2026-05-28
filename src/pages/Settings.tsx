import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";
import { Settings as SettingsIcon, RefreshCw, Copy, Users, UserPlus, Key, Mail, Bell, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsHouseholdAdmin } from "@/hooks/useIsHouseholdAdmin";
import { usePendingInvitations } from "@/hooks/usePendingInvitations";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { InviteMemberDialog } from "@/components/household/InviteMemberDialog";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import { EditHouseholdBasicsDialog } from "@/components/settings/EditHouseholdBasicsDialog";
import { supabase } from "@/integrations/supabase/client";
import { TermsSection, PrivacySection } from "@/components/settings/LegalDocsSection";
import { PrivacySecuritySection } from "@/components/settings/PrivacySecuritySection";
import { AppMaintenanceSection } from "@/components/settings/AppMaintenanceSection";
import { ModulePreferencesSection } from "@/components/settings/ModulePreferencesSection";
import { SetupProgressCard } from "@/components/settings/SetupProgressCard";
import { AvatarUploader } from "@/components/avatar/AvatarUploader";
import { useQueryClient } from "@tanstack/react-query";
import { InstallAppButton } from "@/components/install/InstallAppButton";

export const Settings = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useIsHouseholdAdmin(householdId);
  const { data: pendingInvitations } = usePendingInvitations(householdId);
  const { preferences, isLoading: preferencesLoading, updatePreferences, isUpdating } = useHouseholdPreferences(householdId);

  const { data: household, isLoading: householdLoading } = useQuery({
    queryKey: ["household-details", householdId],
    queryFn: async () => {
      if (!householdId) return null;
      const { data } = await supabase
        .from("households")
        .select("invite_code, name, avatar_url")
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
              <div className="fd-eyebrow mb-0.5">SETTINGS</div>
              <h1 className="fd-display text-[24px] text-fd-ink">Household Preferences</h1>
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
                    {householdId && isAdmin && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Household photo</p>
                        <AvatarUploader
                          scope={{ kind: "household", householdId }}
                          currentUrl={(household as any)?.avatar_url || null}
                          fallbackInitials={(household?.name || "FD").slice(0, 2)}
                          size="lg"
                          onChange={async (url) => {
                            const { error } = await supabase
                              .from("households")
                              .update({ avatar_url: url })
                              .eq("id", householdId);
                            if (error) throw error;
                            queryClient.invalidateQueries({ queryKey: ["household-details", householdId] });
                            queryClient.invalidateQueries({ queryKey: ["household", user?.id] });
                          }}
                        />
                      </div>
                    )}
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

              <SetupProgressCard />

              <ModulePreferencesSection />

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notifications
                    </CardTitle>
                    <CardDescription>
                      Choose which reminders you receive and review browser permission status.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/settings/notifications")}
                  >
                    Manage
                  </Button>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Permissions
                    </CardTitle>
                    <CardDescription>
                      Review microphone, camera, photos, and notifications access.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/settings/permissions")}
                  >
                    Manage
                  </Button>
                </CardHeader>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(preferences.updated_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Each module asks for its own preferences the first time you open it. You can edit them above anytime.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <PrivacySecuritySection />

          <AppMaintenanceSection />

          <TermsSection />
          <PrivacySection />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Install Family Desk</CardTitle>
              <CardDescription>
                Add Family Desk to your home screen for a faster, full-screen
                experience with offline support. Available on most modern
                browsers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InstallAppButton fullWidth />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};
