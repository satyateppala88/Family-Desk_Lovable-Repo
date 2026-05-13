import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  CheckSquare,
  Wallet,
  Leaf,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreSheet } from "@/components/layout/MoreSheet";

const PRIMARY = [
  { to: "/dashboard", label: "Home", icon: Home, match: ["/dashboard"] },
  { to: "/taskmaster/today", label: "Tasks", icon: CheckSquare, match: ["/taskmaster", "/tasks"] },
  { to: "/finance", label: "Finance", icon: Wallet, match: ["/finance"] },
  { to: "/habits", label: "Habits", icon: Leaf, match: ["/habits"] },
];

const MORE_MATCH = ["/meals", "/grocery", "/calendar"];

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

const matches = (pathname: string, list: string[]) =>
  list.some((m) => pathname === m || pathname.startsWith(m + "/"));

export const BottomNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  if (matches(location.pathname, HIDDEN_PREFIXES)) return null;

  const moreActive = matches(location.pathname, MORE_MATCH);

  return (
    <>
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex items-stretch justify-around max-w-[600px] h-16">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = matches(location.pathname, item.match);
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  className={cn(
                    "relative h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute top-0 h-[3px] w-8 bg-primary rounded-b-full" />
                  )}
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
              className={cn(
                "relative w-full h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {moreActive && (
                <span className="absolute top-0 h-[3px] w-8 bg-primary rounded-b-full" />
              )}
              <MoreHorizontal className={cn("h-5 w-5", moreActive && "stroke-[2.5]")} />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
};
