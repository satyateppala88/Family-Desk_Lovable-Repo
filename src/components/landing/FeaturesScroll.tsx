import { CheckSquare, UtensilsCrossed, ShoppingCart, Calendar, Target, Package } from "lucide-react";

const features = [
  { icon: CheckSquare, title: "Tasks", description: "Assign and track household chores together." },
  { icon: UtensilsCrossed, title: "Meals", description: "AI-powered meal planning and recipe suggestions." },
  { icon: ShoppingCart, title: "Groceries", description: "Auto-generated shopping lists from your meal plans." },
  { icon: Calendar, title: "Calendar", description: "Shared family calendar for events and schedules." },
  { icon: Target, title: "Habits", description: "Build healthy routines with streaks and scores." },
  { icon: Package, title: "Pantry", description: "Track inventory, expiry dates, and low stock." },
];

export const FeaturesScroll = () => {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-semibold text-center mb-4 text-foreground">
          Everything in one place
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">
          Six focused modules for modern family life.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-4">
              <feature.icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div>
                <h3 className="text-base font-medium mb-1 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
