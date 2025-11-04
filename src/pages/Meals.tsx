import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

const Meals = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold mb-4">Meal Planning</h1>
        <p className="text-muted-foreground">Meal planning coming in Phase 3</p>
      </main>
      <MobileNav />
    </div>
  );
};

export default Meals;
