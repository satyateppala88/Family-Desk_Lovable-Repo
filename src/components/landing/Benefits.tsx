import { Clock, Lightbulb, HeartHandshake, Zap, Trophy } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Save Time",
    description: "Automate meal planning and grocery lists",
  },
  {
    icon: HeartHandshake,
    title: "Stay Organized",
    description: "Keep everyone on the same page",
  },
  {
    icon: Lightbulb,
    title: "Reduce Stress",
    description: "Never forget important tasks again",
  },
  {
    icon: Zap,
    title: "AI-Powered",
    description: "Smart suggestions tailored to you",
  },
  {
    icon: Trophy,
    title: "Family Engagement",
    description: "Gamified habits with streaks & leaderboards",
  },
];

export const Benefits = () => {
  return (
    <section className="py-24 bg-landing-bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-20 text-landing-text">
          Why Choose Family Desk?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-white border border-landing-accent/20 hover:border-landing-accent transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="w-14 h-14 mb-6 rounded-xl bg-landing-highlight/20 flex items-center justify-center group-hover:bg-landing-highlight/30 transition-colors">
                <benefit.icon className="w-7 h-7 text-landing-highlight" strokeWidth={1.5} />
              </div>
              
              <h3 className="text-2xl font-bold mb-3 text-landing-text">{benefit.title}</h3>
              <p className="text-landing-text-muted text-lg">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
