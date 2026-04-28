import { Utensils, Sparkles } from "lucide-react";
import { PhoneFrame } from "../PhoneFrame";

const days = [
  { label: "Yesterday", b: "Poha", l: "Dal-Chawal", d: "Veg Pulao" },
  { label: "Today", b: "Idli + Sambar", l: "Rajma-Rice", d: "Roti + Sabzi" },
  { label: "Tomorrow", b: "Upma", l: "Sambhar Rice", d: "Pasta" },
];

export const MealsScreen = ({ active }: { active: boolean }) => (
  <PhoneFrame surfaceClassName="bg-background">
    <div className="flex h-full flex-col px-3 pb-3">
      <div className="flex items-center gap-2 pt-1">
        <div className="h-7 w-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
          <Utensils className="h-4 w-4 text-orange-600" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground leading-none">This week</p>
          <p className="text-xs font-semibold leading-tight">Meal Plan</p>
        </div>
      </div>

      <div
        className={`mt-3 inline-flex items-center gap-1 self-start rounded-full bg-orange-500/10 px-2 py-1 ${
          active ? "animate-pulse" : ""
        }`}
      >
        <Sparkles className="h-3 w-3 text-orange-600" />
        <span className="text-[9px] font-medium text-orange-600">Generate next week with AI</span>
      </div>

      <div className="mt-2 space-y-1.5">
        {days.map((d, i) => (
          <div
            key={d.label}
            className={`rounded-xl border border-border/60 bg-card p-2 ${
              active ? "animate-fade-in" : "opacity-0"
            }`}
            style={{ animationDelay: `${100 + i * 90}ms`, animationFillMode: "forwards" }}
          >
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">{d.label}</p>
            <div className="mt-1 grid grid-cols-3 gap-1">
              <div className="rounded-md bg-orange-500/5 px-1.5 py-1">
                <p className="text-[8px] text-muted-foreground">B</p>
                <p className="text-[10px] font-medium leading-tight truncate">{d.b}</p>
              </div>
              <div className="rounded-md bg-amber-500/5 px-1.5 py-1">
                <p className="text-[8px] text-muted-foreground">L</p>
                <p className="text-[10px] font-medium leading-tight truncate">{d.l}</p>
              </div>
              <div className="rounded-md bg-rose-500/5 px-1.5 py-1">
                <p className="text-[8px] text-muted-foreground">D</p>
                <p className="text-[10px] font-medium leading-tight truncate">{d.d}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </PhoneFrame>
);