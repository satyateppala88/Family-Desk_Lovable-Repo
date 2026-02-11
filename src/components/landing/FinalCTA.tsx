import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const FinalCTA = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-landing-bg via-landing-bg-secondary to-[hsl(193_40%_94%)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-landing-accent rounded-full blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-landing-highlight rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 text-landing-text">
          Join the Waitlist
        </h2>
        <p className="text-xl text-landing-text-muted mb-8 max-w-2xl mx-auto">
          Family Desk is currently in private beta. Request early access to be among the first to transform your household management.
        </p>

        <Link to="/request-access">
          <Button
            size="lg"
            className="text-xl px-10 py-6 bg-landing-accent text-white hover:bg-landing-accent/90 shadow-lg hover:shadow-xl hover:shadow-landing-accent/40 transition-all hover:scale-105"
          >
            Request Early Access
          </Button>
        </Link>

        <p className="text-landing-text-muted mt-6 text-lg">
          Limited spots available • Approval within 1-2 business days
        </p>
      </div>
    </section>
  );
};
