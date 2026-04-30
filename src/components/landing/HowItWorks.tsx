const steps = [
  { number: "1", title: "Create your household", description: "Simple setup in under a minute." },
  { number: "2", title: "Invite family members", description: "Share an invite code or link." },
  { number: "3", title: "Start organizing", description: "AI suggestions begin immediately." },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-semibold text-center mb-16 text-foreground">
          How it works
        </h2>

        <div className="max-w-md mx-auto space-y-10">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-6 items-start">
              <span className="text-2xl font-semibold text-muted-foreground/40 leading-none mt-0.5">
                {step.number}
              </span>
              <div>
                <h3 className="text-base font-medium mb-1 text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
