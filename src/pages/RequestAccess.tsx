import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RequestAccess = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("access_requests")
        .insert({
          full_name: fullName,
          email: email,
          reason: reason,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Submitted",
            description: "You've already requested access with this email.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        // Send confirmation email (fire and forget - don't block on email failure)
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-access-request-confirmation`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, fullName }),
            }
          );
          
          if (!response.ok) {
            console.warn("Failed to send confirmation email:", await response.text());
          }
        } catch (emailError) {
          console.warn("Email sending failed:", emailError);
          // Don't throw - form submission was successful
        }
        
        setSubmitted(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-landing-bg p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Request Submitted!</CardTitle>
            <CardDescription>
              Thank you for your interest in Family Desk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                We've received your access request. Our team will review it and get back to you via email within 1-2 business days.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate("/")} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-landing-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Request Early Access</CardTitle>
          <CardDescription>
            Family Desk is currently in private beta. Fill out this form to request access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Why do you want to join? (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Tell us a bit about your household and why Family Desk would be useful for you..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Request Access"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/auth")}
              disabled={loading}
            >
              Already approved? Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestAccess;
