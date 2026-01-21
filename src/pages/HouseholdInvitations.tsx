import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHousehold } from "@/hooks/useHousehold";
import { useIsHouseholdAdmin } from "@/hooks/useIsHouseholdAdmin";
import { usePendingInvitations, getInvitationTypeLabel } from "@/hooks/usePendingInvitations";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, UserPlus, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteMemberDialog } from "@/components/household/InviteMemberDialog";

const HouseholdInvitations = () => {
  const { householdId } = useHousehold();
  const { isAdmin, isLoading: adminLoading } = useIsHouseholdAdmin(householdId);
  const { data: invitations, isLoading: invitationsLoading } = usePendingInvitations(householdId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const approveMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const invitation = invitations?.find(inv => inv.id === invitationId);
      if (!invitation) throw new Error("Invitation not found");

      // Add user to household_members
      const { error: memberError } = await supabase
        .from("household_members")
        .insert({
          household_id: invitation.household_id,
          user_id: invitation.invitee_user_id,
          role: invitation.requested_role,
        });

      if (memberError) throw memberError;

      // Update invitation status
      const { error: invError } = await supabase
        .from("household_invitations")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      if (invError) throw invError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success("Invitation approved!");
    },
    onError: (error: any) => {
      toast.error("Failed to approve: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("household_invitations")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success("Invitation rejected");
    },
    onError: (error: any) => {
      toast.error("Failed to reject: " + error.message);
    },
  });

  if (adminLoading || invitationsLoading) {
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
              <CardDescription>Only household admins can manage invitations.</CardDescription>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Manage Invitations</h1>
            </div>
            {householdId && (
              <InviteMemberDialog 
                householdId={householdId} 
                trigger={
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                }
              />
            )}
          </div>

          {!invitations || invitations.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Pending Invitations</CardTitle>
                <CardDescription>
                  Invite family members directly by email, or they can request to join using your household invite code.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={() => navigate("/settings")} variant="outline">
                  Back to Settings
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation: any) => (
                <Card key={invitation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">
                          {invitation.invitee_name || "New Member"}
                        </CardTitle>
                        <CardDescription className="truncate">{invitation.invitee_email}</CardDescription>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge variant="outline">
                          {getInvitationTypeLabel(invitation.invitation_type)}
                        </Badge>
                        <Badge variant="secondary">
                          {invitation.requested_role === "admin" ? "Admin" : "Member"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {invitation.invitation_type === "join_request" ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => approveMutation.mutate(invitation.id)}
                          disabled={approveMutation.isPending}
                          size="sm"
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => rejectMutation.mutate(invitation.id)}
                          disabled={rejectMutation.isPending}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-warning text-warning">
                          Awaiting Response
                        </Badge>
                        <Button
                          onClick={() => rejectMutation.mutate(invitation.id)}
                          disabled={rejectMutation.isPending}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel Invite
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                      {invitation.invitation_type === "admin_invite" ? "Invited" : "Requested"}: {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
};

export default HouseholdInvitations;
