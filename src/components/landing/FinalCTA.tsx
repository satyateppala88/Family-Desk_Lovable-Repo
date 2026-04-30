import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const FinalCTA = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">
          Ready to get organized?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Join families already using FamilyDesk to simplify their daily life.
        </p>

        <Link to="/auth">
          <Button size="lg" className="text-base px-8">
            Get Started
          </Button>
        </Link>
      </div>
    </section>
  );
};
