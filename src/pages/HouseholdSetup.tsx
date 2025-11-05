import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import logoImg from "@/assets/logo-family-hub-v4.png";

const HouseholdSetup = () => {
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [verifiedHousehold, setVerifiedHousehold] = useState<{ id: string; name: string } | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [joiningHousehold, setJoiningHousehold] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("=== Starting household creation via edge function ===");
      
      // Call the edge function to create household
      const { data, error } = await supabase.functions.invoke('create-household', {
        body: { householdName },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data || !data.success) {
        console.error("Edge function returned unsuccessful:", data);
        throw new Error(data?.error || "Failed to create household");
      }

      console.log("Household created successfully via edge function:", data.household);

    toast({
      title: "Household created!",
      description: `Welcome to ${householdName}. Let's set up your preferences.`,
    });

    // Invalidate household query cache to ensure fresh data on next page
    queryClient.invalidateQueries({ queryKey: ["household"] });

    navigate("/onboarding/preferences");
    } catch (error: any) {
      console.error("Complete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create household",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!inviteCode || inviteCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit invite code",
        variant: "destructive",
      });
      return;
    }

    setVerifyingCode(true);
    try {
      const { data, error } = await supabase
        .from("households")
        .select("id, name")
        .eq("invite_code", inviteCode)
        .single();

      if (error || !data) {
        toast({
          title: "Invalid code",
          description: "No household found with this invite code",
          variant: "destructive",
        });
        setVerifiedHousehold(null);
        return;
      }

      setVerifiedHousehold(data);
      toast({
        title: "Household found!",
        description: `Ready to join ${data.name}`,
      });
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: "Failed to verify invite code",
        variant: "destructive",
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!verifiedHousehold || !user) return;

    setJoiningHousehold(true);
    try {
      const { error: inviteError } = await supabase
        .from("household_invitations")
        .insert({
          household_id: verifiedHousehold.id,
          invitee_user_id: user.id,
          invitee_email: user.email!,
          invitee_name: user.user_metadata?.display_name || user.email?.split('@')[0],
          requested_role: 'member',
          status: 'pending',
        });

      if (inviteError) throw inviteError;

      toast({
        title: "Request sent!",
        description: `Your request to join ${verifiedHousehold.name} has been sent to the admin.`,
      });

      navigate("/");
    } catch (error: any) {
      console.error("Join error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send join request",
        variant: "destructive",
      });
    } finally {
      setJoiningHousehold(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logoImg} 
              alt="HomeMate Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>
        <CardTitle className="text-2xl">Set Up Your Household</CardTitle>
        <CardDescription>
          Create a new household or join an existing one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="join">Join Existing</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <form onSubmit={handleCreateHousehold} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">Household Name</Label>
                <Input
                  id="household-name"
                  type="text"
                  placeholder="Smith Family, Apartment 4B, etc."
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Household"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">6-Digit Invite Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-code"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, ''))}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || inviteCode.length !== 6}
                  >
                    {verifyingCode ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>

              {verifiedHousehold && (
                <div className="p-4 border rounded-lg bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Household Found</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You're about to request to join:
                  </p>
                  <p className="font-semibold text-lg">{verifiedHousehold.name}</p>
                  <Button 
                    className="w-full" 
                    onClick={handleJoinHousehold}
                    disabled={joiningHousehold}
                  >
                    {joiningHousehold ? "Sending Request..." : "Send Join Request"}
                  </Button>
                </div>
              )}

              {!verifiedHousehold && (
                <p className="text-xs text-muted-foreground text-center">
                  Ask your household admin for the 6-digit invite code
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      </Card>
    </div>
  );
};

export default HouseholdSetup;
