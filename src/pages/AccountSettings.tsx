import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Globe, ArrowLeft, Bell, Download } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

import { PhoneVerificationSection } from "@/components/settings/PhoneVerificationSection";
import { NotificationPreferencesSection } from "@/components/settings/NotificationPreferencesSection";
import { AvatarUploader } from "@/components/avatar/AvatarUploader";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(user?.email || "");

  // Load current avatar
  const { data: profile } = useQuery({
    queryKey: ["profile-avatar", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const avatarUrl = (profile as any)?.avatar_url || null;

  const handleAvatarChange = async (publicUrl: string | null) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["profile-avatar", user.id] });
  };
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-my-data`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `familydesk-export-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        title: 'Export failed',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Header />
      <main className="container max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-24">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <User className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <Bell className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <Lock className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Security</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <Globe className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile photo</Label>
                  <AvatarUploader
                    scope={{ kind: "user", userId: user?.id || "" }}
                    currentUrl={avatarUrl}
                    fallbackInitials={
                      (displayName || (profile as any)?.display_name || user?.email || "U")
                        .toString()
                        .slice(0, 2)
                    }
                    size="lg"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <PhoneVerificationSection />
          <NotificationPreferencesSection />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>
                Manage your account and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Delete Account</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-sm text-destructive">
                      This permanently deletes your account and all data. Cannot be undone.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        disabled={deleting}
                        onClick={async () => {
                          setDeleting(true);
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const res = await supabase.functions.invoke('delete-account', {
                              headers: { Authorization: `Bearer ${session?.access_token}` },
                            });
                            if (res.error) throw res.error;
                            await supabase.auth.signOut();
                            window.location.href = '/';
                          } catch (e: any) {
                            toast({
                              title: 'Deletion failed',
                              description: e?.message ?? 'Please try again or contact support.',
                              variant: 'destructive',
                            });
                            setDeleting(false);
                          }
                        }}
                      >
                        {deleting ? 'Deleting...' : 'Yes, delete my account'}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={deleting}
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Household Preferences</CardTitle>
              <CardDescription>
                Manage your household preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To update your household preferences, visit the Settings page.
              </p>
              <Button onClick={() => window.location.href = '/settings'}>
                Go to Household Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </main>
      <Footer />
      
    </>
  );
};

export default AccountSettings;
