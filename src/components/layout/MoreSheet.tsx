import { NavLink } from "react-router-dom";
import { Calendar, UtensilsCrossed, ShoppingCart, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const ROWS = [
  { to: "/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/grocery", label: "Grocery", icon: ShoppingCart },
  { to: "/calendar", label: "Calendar", icon: Calendar },
];

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const MoreSheet = ({ open, onOpenChange }: MoreSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="mt-2 -mx-6">
          {ROWS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-4 px-6 py-4 border-b border-border hover:bg-accent transition-colors"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </NavLink>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
