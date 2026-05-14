import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, RefreshCw } from "lucide-react";
import { FamilyDeskLogo } from "@/components/brand/FamilyDeskLogo";
import { isProductionHost } from "@/lib/env";

type AuthState = "form" | "verification-pending";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("form");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const [tab, setTab] = useState<"signin" | "signup">(defaultTab as "signin" | "signup");

  const resetFormFields = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setTermsAccepted(false);
    setShowPassword(false);
    setSignInError(null);
    setForgotMessage(null);
  };

  const handleTabChange = (next: string) => {
    if (next !== tab) {
      resetFormFields();
      setTab(next as "signin" | "signup");
    }
  };

  const sendVerificationEmail = async (userId: string, userEmail: string, userName?: string) => {
    try {
      const response = await supabase.functions.invoke("send-verification-email", {
        body: {
          userId,
          email: userEmail,
          displayName: userName,
          origin: window.location.origin,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send verification email");
      }

      if (response.data?.remainingSeconds) {
        setResendCooldown(response.data.remainingSeconds);
        startCooldownTimer(response.data.remainingSeconds);
        throw new Error(response.data.error);
      }

      return true;
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  };

  const startCooldownTimer = (seconds: number) => {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !pendingUserId) return;

    setLoading(true);
    try {
      await sendVerificationEmail(pendingUserId, email, displayName);
      startCooldownTimer(60);
      toast({
        title: "Email Sent",
        description: "A new verification email has been sent to your inbox.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      toast({
        variant: "destructive",
        title: "Terms Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Record terms acceptance
        await supabase
          .from("profiles")
          .update({ 
            terms_accepted_at: new Date().toISOString(),
            region: 'IN',
            preferred_language: 'en'
          })
          .eq("id", data.user.id);

        // Send custom verification email
        setPendingUserId(data.user.id);
        await sendVerificationEmail(data.user.id, email, displayName);

        // Show verification pending state
        setAuthState("verification-pending");
        startCooldownTimer(60);
        
        toast({
          title: "Check your email!",
          description: "We've sent you a verification link to confirm your email address.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setForgotMessage(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setSignInError("Incorrect email or password. Please try again.");
        return;
      }

      // Check if email is verified via our custom token flow.
      // Source of truth is profiles.email_verified_at (auth.users.email_confirmed_at
      // is auto-set on signup since we send our own branded verification email).
      // Only enforced in production — test/preview environments allow unverified sign-in.
      if (data.user && isProductionHost()) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("email_verified_at, display_name")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profileRow?.email_verified_at) {
          setPendingUserId(data.user.id);
          setDisplayName(profileRow?.display_name || data.user.user_metadata?.display_name || "");
          setAuthState("verification-pending");
          await supabase.auth.signOut();

          toast({
            title: "Email Not Verified",
            description: "Please verify your email address to continue.",
            variant: "destructive",
          });
          return;
        }
      }

      // Check if user has a household
      const { data: memberData } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();

      if (!memberData?.household_id) {
        toast({
          title: "Welcome!",
          description: "Let's set up your household.",
        });
        navigate("/household-setup");
        return;
      }

      // Always land on the dashboard. Users with incomplete setup see a
      // dismissible "Continue Setup" banner there — no forced redirect.
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setSignInError(null);
    setForgotMessage(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setSignInError("Enter your email above first, then tap Forgot password.");
      return;
    }
    setForgotLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch (err) {
      // Swallow — never reveal whether the address exists.
      console.error("resetPasswordForEmail error:", err);
    } finally {
      setForgotLoading(false);
      setForgotMessage("If this email is registered, you'll receive a reset link shortly.");
    }
  };

  // Render verification pending state
  if (authState === "verification-pending") {
    return (
      <div className="min-h-[100svh] flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 py-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription className="mt-2">
              We've sent a verification link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in your email to verify your account and get started with Family Desk.
            </p>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Didn't receive the email?
              </p>
              <Button
                variant="outline"
                onClick={handleResendVerification}
                disabled={loading || resendCooldown > 0}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend verification email
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setAuthState("form");
                  setPendingUserId(null);
                }}
                className="text-sm"
              >
                ← Back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 py-6">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <FamilyDeskLogo size="lg" />
          </div>
          <CardDescription>
            Manage your household with ease
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (signInError) setSignInError(null);
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                      className="text-xs text-primary hover:underline disabled:opacity-60"
                    >
                      {forgotLoading ? "Sending…" : "Forgot password?"}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (signInError) setSignInError(null);
                      }}
                      required
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                {signInError && (
                  <p className="text-sm text-destructive" role="alert">{signInError}</p>
                )}
                {forgotMessage && (
                  <p className="text-sm text-muted-foreground" role="status">{forgotMessage}</p>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Display Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    className="mt-0.5 shrink-0"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I accept the{" "}
                    <Link to="/terms" className="underline hover:text-foreground" target="_blank">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="underline hover:text-foreground" target="_blank">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={loading || !termsAccepted}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
                
              </form>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
