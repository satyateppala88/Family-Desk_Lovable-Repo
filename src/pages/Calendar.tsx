import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

const Calendar = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold mb-4">Calendar</h1>
        <p className="text-muted-foreground">Calendar and important dates coming in Phase 5</p>
      </main>
      <MobileNav />
    </div>
  );
};

export default Calendar;
