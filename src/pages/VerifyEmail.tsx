import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { FamilyDeskLogo } from "@/components/brand/FamilyDeskLogo";

type VerificationStatus = "loading" | "success" | "error" | "expired";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("No verification token provided.");
        return;
      }

      try {
        const response = await supabase.functions.invoke("verify-email-token", {
          body: { token, origin: window.location.origin },
        });

        if (response.error) {
          throw new Error(response.error.message || "Verification failed");
        }

        if (response.data?.success) {
          setStatus("success");
          // Redirect to household setup after 3 seconds
          setTimeout(() => {
            navigate("/household-setup");
          }, 3000);
        } else {
          throw new Error(response.data?.error || "Verification failed");
        }
      } catch (error: any) {
        console.error("Verification error:", error);
        if (error.message?.includes("expired")) {
          setStatus("expired");
          setErrorMessage(error.message);
        } else {
          setStatus("error");
          setErrorMessage(error.message || "An error occurred during verification.");
        }
      }
    };

    verifyToken();
  }, [token, navigate]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <>
            <div className="flex justify-center mb-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Verifying your email...</CardTitle>
            <CardDescription className="mt-2">
              Please wait while we confirm your email address.
            </CardDescription>
          </>
        );

      case "success":
        return (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl text-primary">Email Verified!</CardTitle>
            <CardDescription className="mt-2">
              Your email has been successfully verified. Redirecting you to set up your household...
            </CardDescription>
            <div className="mt-6">
              <Button onClick={() => navigate("/household-setup")}>
                Continue to Household Setup
              </Button>
            </div>
          </>
        );

      case "expired":
        return (
          <>
            <div className="flex justify-center mb-4">
              <Mail className="h-16 w-16 text-accent" />
            </div>
            <CardTitle className="text-2xl text-accent">Link Expired</CardTitle>
            <CardDescription className="mt-2">
              {errorMessage || "This verification link has expired."}
            </CardDescription>
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Please sign in and request a new verification email.
              </p>
              <Button onClick={() => navigate("/auth")}>
                Go to Sign In
              </Button>
            </div>
          </>
        );

      case "error":
      default:
        return (
          <>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Verification Failed</CardTitle>
            <CardDescription className="mt-2">
              {errorMessage || "We couldn't verify your email address."}
            </CardDescription>
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                If you're having trouble, please try signing in or contact support.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  Go to Sign In
                </Button>
                <Button asChild>
                  <Link to="/request-access">Request Help</Link>
                </Button>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md text-center bg-white">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <FamilyDeskLogo size="lg" />
          </div>
          {renderContent()}
        </CardHeader>
        <CardContent>
          {status !== "loading" && (
            <p className="text-xs text-muted-foreground">
              Having issues?{" "}
              <a href="mailto:support@familydesk.in" className="text-primary hover:underline">
                Contact Support
              </a>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
