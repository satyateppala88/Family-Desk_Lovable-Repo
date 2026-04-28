import { useEffect, useState } from "react";
import { Check, Sparkles, ListTodo } from "lucide-react";
import { PhoneFrame } from "../PhoneFrame";

const tasks = [
  { title: "Pay electricity bill", note: "Due today · ₹2,340", priority: "High" },
  { title: "Pick up Aarav from class", note: "5:30 PM", priority: "High" },
  { title: "Order new water filter", note: "From Amazon", priority: "Med" },
];

export const TasksScreen = ({ active }: { active: boolean }) => {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!active) return;
    setChecked(false);
    const t = setTimeout(() => setChecked(true), 900);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <PhoneFrame surfaceClassName="bg-background">
      <div className="flex h-full flex-col px-3 pb-3">
        <div className="flex items-center gap-2 pt-1">
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <ListTodo className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground leading-none">Today's plan</p>
            <p className="text-xs font-semibold leading-tight">Tuesday, Apr 28</p>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-1 self-start rounded-full bg-primary/10 px-2 py-0.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[9px] font-medium text-primary">AI ranked your day</span>
        </div>

        <div className="mt-2 space-y-1.5">
          {tasks.map((t, i) => {
            const isChecked = i === 0 && checked;
            return (
              <div
                key={t.title}
                className={`flex items-start gap-2 rounded-xl border border-border/60 bg-card p-2 transition-all ${
                  isChecked ? "opacity-60" : ""
                }`}
              >
                <div
                  className={`mt-0.5 h-4 w-4 rounded-md border-2 flex items-center justify-center transition-all ${
                    isChecked
                      ? "bg-primary border-primary scale-110"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium leading-tight ${isChecked ? "line-through" : ""}`}>
                    {t.title}
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{t.note}</p>
                </div>
                <span className="text-[8px] font-semibold rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                  {t.priority}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </PhoneFrame>
  );
};