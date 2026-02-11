const benefits = [
  { title: "Save time", description: "Automate planning and lists." },
  { title: "Stay aligned", description: "Everyone on the same page." },
  { title: "Reduce stress", description: "Nothing falls through the cracks." },
];

export const Benefits = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
          {benefits.map((benefit, index) => (
            <div key={index}>
              <h3 className="text-base font-medium mb-1 text-foreground">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
