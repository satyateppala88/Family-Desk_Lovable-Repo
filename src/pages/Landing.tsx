import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { FeaturesScroll } from "@/components/landing/FeaturesScroll";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Benefits } from "@/components/landing/Benefits";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/layout/Footer";

const Landing = () => {
  return (
    <div className="landing-page bg-landing-bg text-landing-text overflow-x-hidden">
      <LandingNav />
      <Hero />
      <FeaturesScroll />
      <HowItWorks />
      <Benefits />
      <div className="bg-landing-highlight py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">🇮🇳 Made for Indian Households</h2>
          <p className="text-lg text-white/90">Regional recipes • Local festivals • Indian family dynamics</p>
        </div>
      </div>
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Landing;
