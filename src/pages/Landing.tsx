import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { FeaturesScroll } from "@/components/landing/FeaturesScroll";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Benefits } from "@/components/landing/Benefits";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/layout/Footer";

const Landing = () => {
  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      <LandingNav />
      <Hero />
      <FeaturesScroll />
      <HowItWorks />
      <Benefits />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Landing;
