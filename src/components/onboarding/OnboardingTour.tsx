import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
  steps?: Step[];
}

const defaultSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Family Desk! Let's take a quick tour to help you get started with managing your household in India.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: ".dashboard-overview",
    content: "This is your dashboard where you can see an overview of all your household activities - tasks, meals, and upcoming events.",
    placement: "bottom",
  },
  {
    target: ".tasks-card",
    content: "Manage household tasks here. Assign them to family members, set priorities, and track completion.",
    placement: "top",
  },
  {
    target: ".meals-card",
    content: "Plan your meals with AI-powered suggestions featuring Indian cuisine. Get recipe recommendations based on your preferences!",
    placement: "top",
  },
  {
    target: ".grocery-card",
    content: "Keep track of your grocery shopping list and pantry items. Perfect for Indian household management.",
    placement: "top",
  },
  {
    target: ".calendar-card",
    content: "View all your tasks and meal plans in a calendar view. Never miss important dates and festivals!",
    placement: "top",
  },
  {
    target: ".user-menu",
    content: "Access your profile, settings, and household management from here. You can also restart this tour anytime from the Help menu.",
    placement: "bottom",
  },
];

export const OnboardingTour = ({ run, onComplete, steps }: OnboardingTourProps) => {
  const tourSteps = steps || defaultSteps;
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, index, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      // Mark onboarding as completed
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id);
      }
      onComplete();
    }

    if (type === "step:after") {
      setStepIndex(index + 1);
    }
  };

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--background))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          arrowColor: "hsl(var(--background))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "8px",
          padding: "20px",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "6px",
          padding: "8px 16px",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
};
