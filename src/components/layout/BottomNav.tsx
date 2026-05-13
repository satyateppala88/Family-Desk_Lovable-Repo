import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  ListChecks,
  Wallet,
  Sparkles,
  MoreHorizontal,
  Calendar as CalendarIcon,
  UtensilsCrossed,
  ShoppingCart,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const PRIMARY = [
  { to: "/dashboard", label: "Home", icon: Home, match: ["/dashboard", "/"] },
  { to: "/taskmaster/today", label: "Tasks", icon: ListChecks, match: ["/taskmaster", "/tasks"] },
  { to: "/finance", label: "Finance", icon: Wallet, match: ["/finance"] },
  { to: "/habits", label: "Habits", icon: Sparkles, match: ["/habits"] },
];

const MORE_LINKS = [
  { to: "/calendar", label: "Calendar", icon: CalendarIcon },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/grocery", label: "Grocery", icon: ShoppingCart },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const HIDDEN_PREFIXES = [
  "/auth",
  "/landing",
  "/welcome",
  "/terms",
  "/privacy",
  "/verify-email",
  "/request-access",
  "/install",
  "/admin",
  "/household-setup",
  "/onboarding",
  "/reset-password",
];

export const BottomNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const onHidden =
    HIDDEN_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
  if (onHidden) return null;

  const isActive = (matches: string[]) =>
    matches.some((m) => location.pathname === m || location.pathname.startsWith(m + "/"));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex items-stretch justify-around max-w-[600px] h-16">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.match);
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  className={cn(
                    "h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {MORE_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                >
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};