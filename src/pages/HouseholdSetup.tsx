import { useState, useEffect, useRef } from "react";
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
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { FamilyDeskLogo } from "@/components/brand/FamilyDeskLogo";

const HouseholdSetup = () => {
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [verifiedHousehold, setVerifiedHousehold] = useState<{ id: string; name: string } | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [joiningHousehold, setJoiningHousehold] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{ householdName: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const joinButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Validate session on mount to detect stale JWT tokens
  useEffect(() => {
    const validateSession = async () => {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error || !currentUser) {
        toast({
          title: "Session Expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        navigate("/auth");
      }
    };
    validateSession();
  }, [navigate, toast]);

  // On mount, check if the user already has a pending join request — if so,
  // show the pending state directly so they don't re-submit.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("household_invitations")
        .select("household_id, status, households!inner(name)")
        .eq("invitee_user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const name = (data as any).households?.name ?? "your household";
        setPendingRequest({ householdName: name });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = householdName.trim();
    if (!trimmed) {
      setCreateError("Please enter a household name");
      return;
    }
    setCreateError(null);
    setLoading(true);

    try {
      console.log("=== Starting household creation via edge function ===");
      
      // Call the edge function to create household
      const { data, error } = await supabase.functions.invoke('create-household', {
        body: { householdName: trimmed },
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
        description: "Failed to create household. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!inviteCode || inviteCode.length !== 6) {
      setVerifyError("Please enter a valid 6-digit invite code");
      return;
    }

    setVerifyError(null);
    setVerifyingCode(true);
    try {
      const { data, error } = await supabase
        .from("households")
        .select("id, name")
        .eq("invite_code", inviteCode)
        .single();

      if (error || !data) {
        setVerifiedHousehold(null);
        setVerifyError("Invalid invite code. Please check with your household admin.");
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
      setVerifyError("Invalid invite code. Please check with your household admin.");
    } finally {
      setVerifyingCode(false);
    }
  };

  // Focus the join CTA the moment the household is verified so the user
  // sees it's the obvious next step rather than thinking they're done.
  useEffect(() => {
    if (verifiedHousehold && joinButtonRef.current) {
      joinButtonRef.current.focus();
    }
  }, [verifiedHousehold]);

  const handleJoinHousehold = async () => {
    if (!verifiedHousehold || !user) return;

    setJoinError(null);
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
          invitation_type: 'join_request',
        });

      if (inviteError) {
        // Duplicate request (unique household_id+invitee_user_id) → treat as success.
        const isDuplicate =
          (inviteError as any).code === "23505" ||
          /duplicate key|unique/i.test(inviteError.message ?? "");
        if (!isDuplicate) {
          console.error("Join insert error:", inviteError);
          setJoinError(
            "We couldn't send your request. Please check your invite code and try again."
          );
          return;
        }
      }

      toast({
        title: "Request sent!",
        description: `Your request to join ${verifiedHousehold.name} has been sent to the admin.`,
      });

      setPendingRequest({ householdName: verifiedHousehold.name });
    } catch (error: any) {
      console.error("Join error:", error);
      setJoinError(error.message || "Failed to send join request");
    } finally {
      setJoiningHousehold(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!user) return;
    setCheckingStatus(true);
    try {
      const { data: memberData } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (memberData?.household_id) {
        queryClient.invalidateQueries({ queryKey: ["household"] });
        navigate("/onboarding/preferences");
        return;
      }
      toast({
        title: "Still pending",
        description: "Your request hasn't been approved yet. We'll email you once it is.",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (pendingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Request sent</CardTitle>
            <CardDescription className="mt-2">
              We've asked the admin of <strong>{pendingRequest.householdName}</strong> to add you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You'll get an email the moment they approve. You can wait here or come back later.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCheckStatus}
              disabled={checkingStatus}
            >
              {checkingStatus ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check status
                </>
              )}
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <FamilyDeskLogo size="lg" />
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
                  onChange={(e) => {
                    setHouseholdName(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                />
                {createError && (
                  <p className="text-sm text-destructive" role="alert">{createError}</p>
                )}
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
                    onChange={(e) => {
                      setInviteCode(e.target.value.replace(/\D/g, ''));
                      if (verifyError) setVerifyError(null);
                    }}
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
                {verifyError && (
                  <p className="text-sm text-destructive" role="alert">{verifyError}</p>
                )}
              </div>

              {verifiedHousehold && (
                <div className="p-4 border rounded-lg bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Household found — request to join</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We'll send a request to the household admin. You'll get an email when they approve.
                  </p>
                  <p className="font-semibold text-lg">{verifiedHousehold.name}</p>
                  <Button 
                    ref={joinButtonRef}
                    className="w-full" 
                    onClick={handleJoinHousehold}
                    disabled={joiningHousehold}
                  >
                    {joiningHousehold ? "Sending Request..." : `Request to join ${verifiedHousehold.name}`}
                  </Button>
                  {joinError && (
                    <p className="text-sm text-destructive" role="alert">{joinError}</p>
                  )}
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
