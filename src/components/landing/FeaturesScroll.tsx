import { CheckSquare, UtensilsCrossed, ShoppingCart, Calendar } from "lucide-react";

const features = [
  {
    icon: CheckSquare,
    title: "Collaborative Tasks",
    description: "Assign, track, and complete household tasks together. Never miss a chore again.",
  },
  {
    icon: UtensilsCrossed,
    title: "AI-Powered Recipes",
    description: "Get personalized Indian recipe suggestions. Smart meal planning for your family.",
  },
  {
    icon: ShoppingCart,
    title: "Auto Grocery Lists",
    description: "Automatically generated shopping lists from your meal plans. Shop smarter.",
  },
  {
    icon: Calendar,
    title: "Shared Calendar",
    description: "Keep everyone synchronized. Manage events, schedules, and activities together.",
  },
];

export const FeaturesScroll = () => {
  return (
    <section id="features" className="py-24 bg-landing-bg-secondary">
      <div className="container mx-auto px-4 mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Everything Your Household Needs
        </h2>
        <p className="text-xl text-landing-text-muted text-center max-w-2xl mx-auto">
          Powerful features designed for modern Indian families
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-8 px-4 md:px-8 pb-8 min-w-max">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative w-80 md:w-96 p-8 rounded-2xl bg-landing-bg border border-white/10 hover:border-landing-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-landing-accent/20"
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-landing-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 mb-6 rounded-xl bg-landing-accent/20 flex items-center justify-center group-hover:bg-landing-accent/30 transition-colors">
                  <feature.icon className="w-8 h-8 text-landing-accent" strokeWidth={1.5} />
                </div>
                
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-landing-text-muted leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};
