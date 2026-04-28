import { useEffect, useState } from "react";
import { ShoppingBasket, Plus } from "lucide-react";
import { PhoneFrame } from "../PhoneFrame";

const baseItems = [
  { name: "Toor dal", qty: "1 kg", cat: "Pantry" },
  { name: "Milk", qty: "2 L", cat: "Dairy" },
  { name: "Tomatoes", qty: "500 g", cat: "Veggies" },
  { name: "Atta", qty: "5 kg", cat: "Pantry" },
];

export const GroceryScreen = ({ active }: { active: boolean }) => {
  const [showNew, setShowNew] = useState(false);
  useEffect(() => {
    if (!active) return setShowNew(false);
    const t = setTimeout(() => setShowNew(true), 700);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <PhoneFrame surfaceClassName="bg-background">
      <div className="flex h-full flex-col px-3 pb-3">
        <div className="flex items-center gap-2 pt-1">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <ShoppingBasket className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground leading-none">Pantry</p>
            <p className="text-xs font-semibold leading-tight">Shopping list</p>
          </div>
          <span className="text-[9px] font-semibold rounded-full bg-emerald-500/10 text-emerald-700 px-2 py-0.5">
            {baseItems.length + (showNew ? 1 : 0)}
          </span>
        </div>

        <div className="mt-2 flex gap-1 overflow-hidden">
          {["All", "Pantry", "Dairy", "Veggies", "Snacks"].map((c, i) => (
            <span
              key={c}
              className={`text-[9px] rounded-full px-2 py-0.5 ${
                i === 0 ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"
              }`}
            >
              {c}
            </span>
          ))}
        </div>

        <div className="mt-2 space-y-1">
          {showNew && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-1.5 animate-fade-in">
              <Plus className="h-3 w-3 text-emerald-600" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium leading-tight">Coriander</p>
                <p className="text-[8px] text-emerald-700">Auto-added from meal plan</p>
              </div>
              <span className="text-[9px] text-muted-foreground">1 bunch</span>
            </div>
          )}
          {baseItems.map((it) => (
            <div key={it.name} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-1.5">
              <div className="h-3 w-3 rounded border-2 border-muted-foreground/40" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium leading-tight">{it.name}</p>
                <p className="text-[8px] text-muted-foreground">{it.cat}</p>
              </div>
              <span className="text-[9px] text-muted-foreground">{it.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
};