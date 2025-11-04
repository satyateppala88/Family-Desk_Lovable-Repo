import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";

const Grocery = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="container px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold mb-4">Grocery Lists</h1>
        <p className="text-muted-foreground">Grocery management coming in Phase 4</p>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
};

export default Grocery;
