import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const FinalCTA = () => {
  return (
    <section className="py-32 bg-landing-bg relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-landing-accent rounded-full blur-[150px] animate-glow-pulse" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-8">
          Ready to Transform Your Household?
        </h2>

        <Link to="/auth">
          <Button
            size="lg"
            className="text-xl px-12 py-8 bg-landing-accent text-white hover:bg-landing-accent/90 shadow-2xl hover:shadow-landing-accent/50 transition-all hover:scale-105 animate-glow-pulse"
          >
            Get Started Free
          </Button>
        </Link>

        <p className="text-landing-text-muted mt-6">
          No credit card required
        </p>
      </div>
    </section>
  );
};
