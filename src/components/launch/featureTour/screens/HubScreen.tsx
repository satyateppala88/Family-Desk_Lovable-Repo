import { Home, ListTodo, Utensils, ShoppingBasket, CalendarDays, Sparkles, Wallet } from "lucide-react";
import { PhoneFrame } from "../PhoneFrame";

const tiles = [
  { icon: ListTodo, label: "Tasks", tone: "bg-primary/10 text-primary" },
  { icon: Utensils, label: "Meals", tone: "bg-orange-500/10 text-orange-600" },
  { icon: ShoppingBasket, label: "Grocery", tone: "bg-emerald-500/10 text-emerald-600" },
  { icon: CalendarDays, label: "Calendar", tone: "bg-blue-500/10 text-blue-600" },
  { icon: Sparkles, label: "Habits", tone: "bg-green-500/10 text-green-600" },
  { icon: Wallet, label: "Finance", tone: "bg-violet-500/10 text-violet-600" },
];

export const HubScreen = ({ active }: { active: boolean }) => (
  <PhoneFrame surfaceClassName="bg-[hsl(var(--background))]">
    <div className="flex h-full flex-col px-3 pb-3">
      <div className="flex items-center gap-2 pt-1">
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Home className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground leading-none">Good morning</p>
          <p className="text-xs font-semibold leading-tight">The Sharma Family</p>
        </div>
      </div>

      {/* Family Pulse banner */}
      <div className="mt-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-2.5">
        <p className="text-[9px] uppercase tracking-wide text-primary/80 font-semibold">Family Pulse</p>
        <p className="text-[11px] font-medium leading-snug mt-0.5">3 tasks today · groceries delivered · Aarav hit a 7-day streak 🎉</p>
      </div>

      {/* Module tiles */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className={`rounded-xl p-2 flex flex-col items-center gap-1 bg-card border border-border/60 ${
                active ? "animate-fade-in" : "opacity-0"
              }`}
              style={{ animationDelay: `${120 + i * 70}ms`, animationFillMode: "forwards" }}
            >
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${t.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-medium">{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  </PhoneFrame>
);