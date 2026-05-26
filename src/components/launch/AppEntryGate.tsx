import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SplashScreen } from "./SplashScreen";
import { Onboarding } from "./Onboarding";
import { useFeatureTourGate } from "@/hooks/useFeatureTourGate";

type LaunchPhase = "splash" | "decided";

export const AppEntryGate = () => {
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<LaunchPhase>("splash");
  const { shouldShow, resolved } = useFeatureTourGate();

  const onSplashComplete = useCallback(() => setPhase("decided"), []);

  if (phase === "splash" || loading || !resolved) {
    return <SplashScreen onComplete={onSplashComplete} />;
  }

  // Authenticated → dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // First-time visitor (or freshly installed PWA) → onboarding
  if (shouldShow) {
    return <Onboarding />;
  }

  // Returning unauthenticated → auth
  return <Navigate to="/auth" replace />;
};
