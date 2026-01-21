import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
      if (!email.trim()) throw new Error("Email is required");
      if (!user) throw new Error("Not authenticated");

      // Check if invitation already exists
      const { data: existing } = await supabase
        .from("household_invitations")
        .select("id, status")
        .eq("household_id", householdId)
        .eq("invitee_email", email.toLowerCase())
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
          invitee_email: email.toLowerCase(),
          invitee_name: displayName.trim() || null,
          requested_role: role,
          invitation_type: "admin_invite",
          invited_by: user.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success("Invitation sent successfully!");
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add someone to your household
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
