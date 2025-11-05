import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import type { Step } from "react-joyride";

const Grocery = () => {
  const [runOnboarding, setRunOnboarding] = useState(false);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = () => setRunOnboarding(false);

  const groceryTourSteps: Step[] = [
    {
      target: "body",
      content: "Welcome to Grocery Management! This feature is coming soon in Phase 4.",
      placement: "center",
    },
    {
      target: "main",
      content: "Here you'll be able to create shopping lists, track pantry items, and get smart grocery suggestions based on your meal plans.",
      placement: "center",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onStartOnboarding={handleStartOnboarding} />
      <main className="container px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold mb-4">Grocery Lists</h1>
        <p className="text-muted-foreground">Grocery management coming in Phase 4</p>
      </main>
      <Footer />
      <MobileNav />
      <OnboardingTour 
        run={runOnboarding} 
        onComplete={handleOnboardingComplete} 
        steps={groceryTourSteps}
      />
    </div>
  );
};

export default Grocery;
