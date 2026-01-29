import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhoneVerificationState {
  phoneNumber: string;
  isVerified: boolean;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  otpSent: boolean;
  resendCooldown: number;
  error: string | null;
}

export function usePhoneVerification() {
  const { toast } = useToast();
  const [state, setState] = useState<PhoneVerificationState>({
    phoneNumber: "",
    isVerified: false,
    isSendingOtp: false,
    isVerifyingOtp: false,
    otpSent: false,
    resendCooldown: 0,
    error: null,
  });

  // Start cooldown timer
  const startCooldown = useCallback(() => {
    setState(prev => ({ ...prev, resendCooldown: 60 }));
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.resendCooldown <= 1) {
          clearInterval(interval);
          return { ...prev, resendCooldown: 0 };
        }
        return { ...prev, resendCooldown: prev.resendCooldown - 1 };
      });
    }, 1000);
  }, []);

  // Send OTP
  const sendOtp = useCallback(async (phoneNumber: string) => {
    setState(prev => ({ ...prev, isSendingOtp: true, error: null }));

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("whatsapp-send-otp", {
        body: { phoneNumber },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send OTP");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setState(prev => ({
        ...prev,
        phoneNumber,
        otpSent: true,
        isSendingOtp: false,
      }));

      startCooldown();

      toast({
        title: "OTP Sent!",
        description: "Check your WhatsApp for the verification code.",
      });

      return true;
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      setState(prev => ({
        ...prev,
        isSendingOtp: false,
        error: error.message || "Failed to send OTP",
      }));

      toast({
        title: "Failed to send OTP",
        description: error.message || "Please check your phone number and try again.",
        variant: "destructive",
      });

      return false;
    }
  }, [startCooldown, toast]);

  // Verify OTP
  const verifyOtp = useCallback(async (otp: string) => {
    if (!state.phoneNumber) {
      setState(prev => ({ ...prev, error: "Phone number not set" }));
      return false;
    }

    setState(prev => ({ ...prev, isVerifyingOtp: true, error: null }));

    try {
      const response = await supabase.functions.invoke("whatsapp-verify-otp", {
        body: { phoneNumber: state.phoneNumber, otp },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to verify OTP");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setState(prev => ({
        ...prev,
        isVerified: true,
        isVerifyingOtp: false,
        otpSent: false,
      }));

      toast({
        title: "Phone Verified!",
        description: "Your WhatsApp number has been verified successfully.",
      });

      return true;
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      setState(prev => ({
        ...prev,
        isVerifyingOtp: false,
        error: error.message || "Failed to verify OTP",
      }));

      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP. Please try again.",
        variant: "destructive",
      });

      return false;
    }
  }, [state.phoneNumber, toast]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      phoneNumber: "",
      isVerified: false,
      isSendingOtp: false,
      isVerifyingOtp: false,
      otpSent: false,
      resendCooldown: 0,
      error: null,
    });
  }, []);

  // Set initial verified state (from profile)
  const setVerifiedState = useCallback((phoneNumber: string, isVerified: boolean) => {
    setState(prev => ({
      ...prev,
      phoneNumber,
      isVerified,
    }));
  }, []);

  return {
    ...state,
    sendOtp,
    verifyOtp,
    reset,
    setVerifiedState,
  };
}
