import { useEffect, useState } from "react";
import { Wallet, Sparkles } from "lucide-react";
import { PhoneFrame } from "../PhoneFrame";

export const FinanceAiScreen = ({ active }: { active: boolean }) => {
  const [phase, setPhase] = useState<"typing" | "done">("typing");
  useEffect(() => {
    if (!active) return setPhase("typing");
    const t = setTimeout(() => setPhase("done"), 1100);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <PhoneFrame surfaceClassName="bg-background">
      <div className="flex h-full flex-col px-3 pb-3">
        <div className="flex items-center gap-2 pt-1">
          <div className="h-7 w-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground leading-none">April</p>
            <p className="text-xs font-semibold leading-tight">Finance</p>
          </div>
        </div>

        {/* Snapshot */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card border border-border/60 p-2">
            <p className="text-[9px] text-muted-foreground">Spent</p>
            <p className="text-xs font-bold tabular-nums">₹68,420</p>
          </div>
          <div className="rounded-xl bg-card border border-border/60 p-2">
            <p className="text-[9px] text-muted-foreground">Saved</p>
            <p className="text-xs font-bold text-green-600 tabular-nums">₹22,100</p>
          </div>
        </div>

        {/* Bar mini-chart */}
        <div className="mt-2 flex items-end gap-1 h-12 rounded-xl border border-border/60 bg-card p-2">
          {[40, 65, 35, 80, 55, 70, 45].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-violet-500/60"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        {/* AI assistant bubble */}
        <div className="mt-3 flex items-start gap-1.5">
          <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
          <div className="flex-1 rounded-2xl rounded-tl-sm bg-primary/10 px-2.5 py-1.5">
            {phase === "typing" ? (
              <div className="flex gap-0.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "240ms" }} />
              </div>
            ) : (
              <p className="text-[10px] leading-snug animate-fade-in">
                You spent <strong>₹12,400</strong> on dining this month — 18% over budget. Want me to set a cap?
              </p>
            )}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
};