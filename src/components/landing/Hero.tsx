import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="min-h-[85vh] flex items-center justify-center">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-semibold mb-6 tracking-tight text-foreground leading-[1.1]">
          Household management,
          <br />
          simplified.
        </h1>
        
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Tasks, meals, groceries, and habits — all in one calm, focused space for your family.
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
