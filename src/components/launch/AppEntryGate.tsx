import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getHasSeenIntro } from "@/lib/launchStorage";
import { SplashScreen } from "./SplashScreen";
import { OnboardingIntro } from "./OnboardingIntro";

type LaunchPhase = "splash" | "decided";

export const AppEntryGate = () => {
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<LaunchPhase>("splash");

  const onSplashComplete = useCallback(() => setPhase("decided"), []);

  if (phase === "splash" || loading) {
    return <SplashScreen onComplete={onSplashComplete} />;
  }

  // Authenticated → dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // First-time visitor → onboarding
  if (!getHasSeenIntro()) {
    return <OnboardingIntro />;
  }

  // Returning unauthenticated → auth
  return <Navigate to="/auth" replace />;
};
