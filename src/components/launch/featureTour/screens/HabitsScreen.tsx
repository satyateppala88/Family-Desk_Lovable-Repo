import { useEffect, useState } from "react";
import { Sparkles, Flame } from "lucide-react";
import { PhoneFrame } from "../PhoneFrame";

const habits = [
  { name: "Morning walk", streak: 7, done: true },
  { name: "Read 10 pages", streak: 3, done: false },
  { name: "Family dinner", streak: 12, done: true },
  { name: "No screens after 9", streak: 2, done: false },
];

export const HabitsScreen = ({ active }: { active: boolean }) => {
  const [showPoints, setShowPoints] = useState(false);
  useEffect(() => {
    if (!active) return setShowPoints(false);
    const t = setTimeout(() => setShowPoints(true), 800);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <PhoneFrame surfaceClassName="bg-background">
      <div className="flex h-full flex-col px-3 pb-3">
        <div className="flex items-center gap-2 pt-1">
          <div className="h-7 w-7 rounded-lg bg-green-500/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground leading-none">Today</p>
            <p className="text-xs font-semibold leading-tight">Habits · 145 pts</p>
          </div>
          {showPoints && (
            <span className="text-[9px] font-bold rounded-full bg-green-500 text-white px-1.5 py-0.5 animate-fade-in">
              +10
            </span>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          {habits.map((h, i) => (
            <div
              key={h.name}
              className={`flex items-center gap-2 rounded-xl border border-border/60 bg-card p-2 ${
                active ? "animate-fade-in" : "opacity-0"
              }`}
              style={{ animationDelay: `${100 + i * 90}ms`, animationFillMode: "forwards" }}
            >
              <div
                className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all ${
                  h.done ? "border-green-500 bg-green-500/15" : "border-muted-foreground/30"
                }`}
              >
                {h.done && <div className="h-3 w-3 rounded-full bg-green-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium leading-tight">{h.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Flame className="h-2.5 w-2.5 text-orange-500" />
                  <span className="text-[9px] text-muted-foreground">{h.streak}-day streak</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
};