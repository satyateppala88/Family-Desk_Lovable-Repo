import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, UserPlus, Loader2 } from "lucide-react";

interface InviteMemberDialogProps {
  householdId: string;
  trigger?: React.ReactNode;
}

export const InviteMemberDialog = ({ householdId, trigger }: InviteMemberDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) throw new Error("Email is required");
      // Basic shape check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new Error("Please enter a valid email address");
      }
      if (!user) throw new Error("Not authenticated");

      // Check if invitation already exists
      const { data: existing } = await supabase
        .from("household_invitations")
        .select("id, status")
        .eq("household_id", householdId)
        .eq("invitee_email", normalizedEmail)
        .eq("status", "pending")
        .single();

      if (existing) {
        throw new Error("An invitation is already pending for this email");
      }

      // Create the invitation - the user will be linked when they accept
      const { error: insertError } = await supabase
        .from("household_invitations")
        .insert({
          household_id: householdId,
          invitee_email: normalizedEmail,
          invitee_name: displayName.trim() || null,
          requested_role: role,
          invitation_type: "admin_invite",
          invited_by: user.id,
        });

      if (insertError) throw insertError;

      // Get household name and inviter's profile for the email
      const [householdResult, profileResult] = await Promise.all([
        supabase.from("households").select("name").eq("id", householdId).single(),
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
      ]);

      const householdName = householdResult.data?.name || "the household";
      const inviterName = profileResult.data?.display_name || user.email?.split("@")[0] || "Someone";

      // Send invitation email
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (accessToken) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-household-invitation`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                inviteeEmail: normalizedEmail,
                inviteeName: displayName.trim() || undefined,
                inviterName,
                householdName,
                householdId,
                role,
              }),
            }
          );

          if (!response.ok) {
            console.warn("Failed to send invitation email:", await response.text());
          }
        } catch (emailError) {
          console.warn("Email sending failed:", emailError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success("Invitation sent successfully! An email has been sent to the invitee.");
      setOpen(false);
      setEmail("");
      setDisplayName("");
      setRole("member");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="contents">
          {trigger}
        </span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      )}
      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New Member
          </span>
        }
        description="Send an invitation to add someone to your household"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !email.trim()}
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="family.member@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (optional)</Label>
            <Input
              id="displayName"
              placeholder="e.g., Mom, Dad, Grandma"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This helps you identify them before they complete their profile
            </p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="member" id="role-member" />
                <Label htmlFor="role-member" className="font-normal cursor-pointer">
                  Member - Can view and manage household items
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="role-admin" />
                <Label htmlFor="role-admin" className="font-normal cursor-pointer">
                  Admin - Full access including member management
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};
