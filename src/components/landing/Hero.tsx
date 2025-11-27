import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export const Hero = () => {
  const scrollToFeatures = () => {
    const element = document.getElementById("features");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-landing-bg">
      {/* Warm gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg-secondary to-[hsl(40_70%_94%)] opacity-70" />
      
      {/* Soft warm accents */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-landing-accent rounded-full blur-[150px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-landing-highlight rounded-full blur-[150px] animate-float-delayed" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight animate-fade-in text-landing-text">
          Manage Your Household
          <br />
          <span className="text-landing-accent">With Elegance</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-landing-text-muted mb-12 max-w-2xl mx-auto animate-fade-in-delayed">
          AI-powered organization for modern Indian families
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-more-delayed">
          <Link to="/request-access">
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-landing-accent text-white hover:bg-landing-accent/90 shadow-lg hover:shadow-xl hover:shadow-landing-accent/30 transition-all hover:scale-105"
            >
              Request Early Access
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8 py-6 border-2 border-landing-accent/30 text-landing-text bg-white/50 hover:bg-white hover:border-landing-accent transition-all"
            onClick={scrollToFeatures}
          >
            Learn More
          </Button>
        </div>

        <button
          onClick={scrollToFeatures}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 text-landing-accent hover:text-landing-text transition-all animate-bounce"
          aria-label="Scroll to explore"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </div>
    </section>
  );
};
