import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHousehold } from "@/hooks/useHousehold";
import { useIsHouseholdAdmin } from "@/hooks/useIsHouseholdAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";

const HouseholdMembers = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const { isAdmin, isLoading: adminLoading } = useIsHouseholdAdmin(householdId);
  const queryClient = useQueryClient();

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["household-members", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await supabase
        .from("household_members")
        .select(`
          *,
          profiles:user_id (display_name)
        `)
        .eq("household_id", householdId)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!householdId,
  });

  const { data: household } = useQuery({
    queryKey: ["household-info", householdId],
    queryFn: async () => {
      if (!householdId) return null;

      const { data, error } = await supabase
        .from("households")
        .select("created_by")
        .eq("id", householdId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!householdId,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from("household_members")
        .update({ role: newRole })
        .eq("household_id", householdId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      toast.success("Member role updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  if (adminLoading || membersLoading) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8 px-4 min-h-screen pb-24">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </main>
        <Footer />
        <MobileNav />
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8 px-4 min-h-screen pb-24">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Only household admins can manage members.</CardDescription>
            </CardHeader>
          </Card>
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
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Household Members</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Members & Roles</CardTitle>
              <CardDescription>
                Manage roles for each member of your household
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {members?.map((member: any) => {
                const isCreator = member.user_id === household?.created_by;
                const isCurrentUser = member.user_id === user?.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {member.profiles?.display_name || "Unknown User"}
                        {isCurrentUser && " (You)"}
                      </p>
                      <div className="flex gap-2 items-center">
                        <p className="text-sm text-muted-foreground">
                          Joined: {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                        {isCreator && (
                          <Badge variant="secondary">Creator</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCreator ? (
                        <Badge>Admin</Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) =>
                            updateRoleMutation.mutate({
                              userId: member.user_id,
                              newRole,
                            })
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
};

export default HouseholdMembers;
