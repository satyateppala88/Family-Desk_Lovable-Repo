import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import type { Step } from "react-joyride";

const Calendar = () => {
  const [runOnboarding, setRunOnboarding] = useState(false);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = () => setRunOnboarding(false);

  const calendarTourSteps: Step[] = [
    {
      target: "body",
      content: "Welcome to Calendar! This feature is coming soon in Phase 5.",
      placement: "center",
    },
    {
      target: "main",
      content: "Here you'll be able to track important dates, festivals, family events, and integrate with your tasks and meal plans.",
      placement: "center",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onStartOnboarding={handleStartOnboarding} />
      <main className="container px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold mb-4">Calendar</h1>
        <p className="text-muted-foreground">Calendar and important dates coming in Phase 5</p>
      </main>
      <Footer />
      <MobileNav />
      <OnboardingTour 
        run={runOnboarding} 
        onComplete={handleOnboardingComplete} 
        steps={calendarTourSteps}
      />
    </div>
  );
};

export default Calendar;
