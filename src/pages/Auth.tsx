import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, RefreshCw, FlaskConical } from "lucide-react";
import logoImg from "@/assets/logo-family-desk-primary.png";
import { useDevAuth } from "@/hooks/useDevAuth";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginAsTestUser, isLoading: devLoading, isDevEnvironment } = useDevAuth();

  const handleDevLogin = async () => {
    const result = await loginAsTestUser();
    if (result.success) {
      toast({
        title: "Dev Mode Active",
        description: "Logged in as test user",
      });
      navigate("/dashboard");
    } else {
      toast({
        title: "Dev Login Failed",
        description: result.error,
        variant: "destructive",
      });
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
      // Check if email is approved for signup
      const { data: isApproved, error: checkError } = await supabase.rpc(
        "is_email_approved",
        { user_email: email }
      );

      if (checkError) throw checkError;

      if (!isApproved) {
        toast({
          title: "Access Not Approved",
          description: "Your email hasn't been approved yet. Please request access first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

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
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        // User exists but email not verified - show verification pending
        setPendingUserId(data.user.id);
        setDisplayName(data.user.user_metadata?.display_name || "");
        setAuthState("verification-pending");
        
        toast({
          title: "Email Not Verified",
          description: "Please verify your email address to continue.",
          variant: "destructive",
        });
        return;
      }

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

  // Render verification pending state
  if (authState === "verification-pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logoImg} 
              alt="Family Desk Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>
          <CardTitle className="text-3xl">Family Desk</CardTitle>
          <CardDescription>
            Manage your household with ease
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
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
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
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
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                
                <div className="text-center text-sm mt-4">
                  <span className="text-muted-foreground">Don't have access? </span>
                  <Link to="/request-access" className="text-primary hover:underline">
                    Request early access
                  </Link>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {/* Dev Mode Quick Login - Only visible in development */}
          {isDevEnvironment && (
            <Card className="mt-4 border-purple-300 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">Dev Mode</h3>
                      <p className="text-xs text-purple-700 dark:text-purple-300">Quick login as test user</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDevLogin}
                    disabled={devLoading || loading}
                    variant="outline"
                    size="sm"
                    className="border-purple-400 text-purple-700 hover:bg-purple-100 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900"
                  >
                    {devLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <FlaskConical className="mr-2 h-4 w-4" />
                        Login as Test User
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
