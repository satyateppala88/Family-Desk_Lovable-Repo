import { CalendarDays } from "lucide-react";
import { PhoneFrame } from "../PhoneFrame";

const events = [
  { time: "9:00", title: "School drop-off", member: "Aarav", color: "bg-blue-500" },
  { time: "11:30", title: "Doctor — Mom", member: "Priya", color: "bg-rose-500" },
  { time: "5:30", title: "Football class", member: "Aarav", color: "bg-emerald-500" },
  { time: "8:00", title: "Anniversary dinner", member: "Family", color: "bg-amber-500" },
];

export const CalendarScreen = ({ active }: { active: boolean }) => (
  <PhoneFrame surfaceClassName="bg-background">
    <div className="flex h-full flex-col px-3 pb-3">
      <div className="flex items-center gap-2 pt-1">
        <div className="h-7 w-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
          <CalendarDays className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground leading-none">Tuesday</p>
          <p className="text-xs font-semibold leading-tight">Family Calendar</p>
        </div>
      </div>

      <div className="mt-2 flex gap-1">
        {[
          { n: "All", c: "bg-foreground/85 text-background" },
          { n: "Aarav", c: "bg-blue-500/15 text-blue-700" },
          { n: "Priya", c: "bg-rose-500/15 text-rose-700" },
          { n: "Mom", c: "bg-amber-500/15 text-amber-700" },
        ].map((p) => (
          <span key={p.n} className={`text-[9px] rounded-full px-2 py-0.5 ${p.c}`}>
            {p.n}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-1.5">
        {events.map((e, i) => (
          <div
            key={e.title}
            className={`flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2 ${
              active ? "animate-slide-in-right" : "opacity-0"
            }`}
            style={{ animationDelay: `${100 + i * 110}ms`, animationFillMode: "forwards" }}
          >
            <div className={`h-8 w-1 rounded-full ${e.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium leading-tight">{e.title}</p>
              <p className="text-[9px] text-muted-foreground">{e.member}</p>
            </div>
            <span className="text-[9px] font-semibold text-muted-foreground tabular-nums">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  </PhoneFrame>
);