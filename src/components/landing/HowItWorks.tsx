import { Users, UserPlus, Sparkles } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Users,
    title: "Create Your Household",
    description: "Simple setup in minutes",
  },
  {
    number: "02",
    icon: UserPlus,
    title: "Invite Family Members",
    description: "Share invite codes seamlessly",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Start Organizing Together",
    description: "AI-powered suggestions begin",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-landing-bg">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-20">
          How It Works
        </h2>

        <div className="max-w-5xl mx-auto space-y-16">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col md:flex-row items-center gap-8 md:gap-16 group"
            >
              <div className="flex-shrink-0">
                <div className="relative">
                  <span className="text-[120px] font-bold text-transparent bg-clip-text bg-gradient-to-br from-landing-accent/20 to-landing-accent/5 leading-none">
                    {step.number}
                  </span>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-2xl bg-landing-accent/20 flex items-center justify-center group-hover:bg-landing-accent/30 transition-all group-hover:scale-110">
                    <step.icon className="w-10 h-10 text-landing-accent" strokeWidth={1.5} />
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl font-bold mb-3">{step.title}</h3>
                <p className="text-xl text-landing-text-muted">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
