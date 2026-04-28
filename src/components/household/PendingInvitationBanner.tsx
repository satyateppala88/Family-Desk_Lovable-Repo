import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const PendingInvitationBanner = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["my-pending-invitations", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];

      const { data, error } = await supabase
        .from("household_invitations")
        .select(`
          *,
          households:household_id (name)
        `)
        .eq("invitee_email", user.email.toLowerCase())
        .eq("status", "pending")
        .eq("invitation_type", "admin_invite");

      if (error) {
        console.warn("Failed to fetch invitations:", error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.email,
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitation: any) => {
      // Add user to household members
      const { error: memberError } = await supabase
        .from("household_members")
        .insert({
          household_id: invitation.household_id,
          user_id: user!.id,
          role: invitation.requested_role,
        });

      if (memberError) throw memberError;

      // Update invitation status
      const { error: invError } = await supabase
        .from("household_invitations")
        .update({
          status: "approved",
          invitee_user_id: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (invError) throw invError;

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (accessToken) {
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-household-member-welcome`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                householdId: invitation.household_id,
                householdName: invitation.households?.name || "your household",
                role: invitation.requested_role,
                origin: window.location.origin,
              }),
            }
          );
        } catch (emailError) {
          console.warn("Failed to send household welcome email:", emailError);
        }
      }

      // Send notification to the inviter
      if (invitation.invited_by) {
        if (accessToken) {
          // Get current user's display name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user!.id)
            .single();

          const memberName = profile?.display_name || user!.email?.split("@")[0] || "A member";

          try {
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation-response`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  memberName,
                  action: "accepted",
                  householdName: invitation.households?.name || "the household",
                  invitedByUserId: invitation.invited_by,
                }),
              }
            );
          } catch (emailError) {
            console.warn("Failed to send invitation response email:", emailError);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["household"] });
      toast.success("You've joined the household!");
      // Reload to update household context
      window.location.reload();
    },
    onError: (error: any) => {
      toast.error("Failed to accept: " + error.message);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (invitation: any) => {
      const { error } = await supabase
        .from("household_invitations")
        .update({
          status: "rejected",
          invitee_user_id: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (error) throw error;

      // Send notification to the inviter
      if (invitation.invited_by) {
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;

        if (accessToken) {
          // Get current user's display name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user!.id)
            .single();

          const memberName = profile?.display_name || user!.email?.split("@")[0] || "A member";

          try {
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation-response`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  memberName,
                  action: "declined",
                  householdName: invitation.households?.name || "the household",
                  invitedByUserId: invitation.invited_by,
                }),
              }
            );
          } catch (emailError) {
            console.warn("Failed to send invitation response email:", emailError);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-invitations"] });
      toast.success("Invitation declined");
    },
    onError: (error: any) => {
      toast.error("Failed to decline: " + error.message);
    },
  });

  if (isLoading || !invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {invitations.map((invitation: any) => (
        <Card key={invitation.id} className="border-primary/50 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">
                  You've been invited to join "{invitation.households?.name}"
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">
                    {invitation.requested_role === "admin" ? "Admin" : "Member"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Invited {new Date(invitation.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => acceptMutation.mutate(invitation)}
                disabled={acceptMutation.isPending || declineMutation.isPending}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => declineMutation.mutate(invitation)}
                disabled={acceptMutation.isPending || declineMutation.isPending}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                {declineMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Decline
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
