import { useState, useEffect } from "react";
import { Phone, CheckCircle2, Loader2, MessageCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { supabase } from "@/integrations/supabase/client";

export function PhoneVerificationSection() {
  const [phoneInput, setPhoneInput] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  
  const {
    phoneNumber,
    isVerified,
    isSendingOtp,
    isVerifyingOtp,
    otpSent,
    resendCooldown,
    error,
    sendOtp,
    verifyOtp,
    setVerifiedState,
    reset,
  } = usePhoneVerification();

  // Load initial verification status from profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_number, phone_verified")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.phone_number) {
          setPhoneInput(profile.phone_number);
          setVerifiedState(profile.phone_number, profile.phone_verified || false);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfile();
  }, [setVerifiedState]);

  const handleSendOtp = async () => {
    if (!phoneInput.trim()) return;
    await sendOtp(phoneInput.trim());
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    const success = await verifyOtp(otpValue);
    if (success) {
      setOtpValue("");
    }
  };

  const handleChangeNumber = () => {
    reset();
    setOtpValue("");
  };

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otpValue.length === 6 && otpSent && !isVerifyingOtp) {
      handleVerifyOtp();
    }
  }, [otpValue]);

  if (initialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-500" />
          WhatsApp Verification
        </CardTitle>
        <CardDescription>
          Verify your phone number to receive notifications via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verified State */}
        {isVerified && (
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">
                  Phone Verified
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {phoneNumber}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangeNumber}
            >
              Change Number
            </Button>
          </div>
        )}

        {/* Phone Input State */}
        {!isVerified && !otpSent && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0">
                  <Phone className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-sm text-muted-foreground">+91</span>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phoneInput.replace(/^\+?91/, "")}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhoneInput(value.length === 10 ? `+91${value}` : value);
                  }}
                  className="rounded-l-none"
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send a verification code to this WhatsApp number
              </p>
            </div>

            <Button
              onClick={handleSendOtp}
              disabled={phoneInput.replace(/\D/g, "").length < 10 || isSendingOtp}
              className="w-full"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Verification Code
                </>
              )}
            </Button>
          </div>
        )}

        {/* OTP Input State */}
        {!isVerified && otpSent && (
          <div className="space-y-4">
            <Alert>
              <MessageCircle className="h-4 w-4" />
              <AlertDescription>
                We've sent a 6-digit code to <strong>{phoneNumber}</strong> on WhatsApp.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Enter Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={isVerifyingOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {isVerifyingOtp && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeNumber}
              >
                Change Number
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendOtp}
                disabled={resendCooldown > 0 || isSendingOtp}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
