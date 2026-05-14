import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  CheckSquare,
  Sparkles,
  Wallet,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreSheet } from "@/components/layout/MoreSheet";

const PRIMARY = [
  { to: "/dashboard", label: "Home", icon: Home, match: ["/dashboard"], primary: false },
  { to: "/taskmaster/today", label: "Tasks", icon: CheckSquare, match: ["/taskmaster", "/tasks"], primary: false },
  { to: "/ai", label: "Ask AI", icon: Sparkles, match: ["/ai"], primary: true },
  { to: "/finance", label: "Finance", icon: Wallet, match: ["/finance"], primary: false },
];

const MORE_MATCH = ["/meals", "/grocery", "/habits", "/calendar"];

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
      {/* Mobile: floating pill */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-4 left-4 right-4 z-40"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul
          className="mx-auto flex items-stretch justify-around max-w-[600px] h-[60px] rounded-[20px] px-1"
          style={{
            backgroundColor: "#0F6E56",
            boxShadow: "0 4px 20px rgba(15,110,86,0.30)",
          }}
        >
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = matches(location.pathname, item.match);
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  className={cn(
                    "relative h-full min-h-touch flex flex-col items-center justify-center gap-[3px] rounded-[16px] py-2 transition-transform duration-150 ease-out active:scale-[0.92]",
                    active ? "text-white" : "text-white/45"
                  )}
                >
                  <Icon
                    className={cn(item.primary ? "h-6 w-6" : "h-5 w-5")}
                  />
                  <span className="text-[10px] font-medium tracking-[0.01em] leading-none">
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "relative w-full h-full min-h-touch flex flex-col items-center justify-center gap-[3px] rounded-[16px] py-2 transition-transform duration-150 ease-out active:scale-[0.92]",
                moreActive ? "text-white" : "text-white/45"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-[0.01em] leading-none">
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Tablet: flush full-width bar */}
      <nav
        aria-label="Primary"
        className="hidden md:flex lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px]"
        style={{
          backgroundColor: "#0F6E56",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <ul className="flex w-full items-stretch justify-around">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = matches(location.pathname, item.match);
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  className={cn(
                    "h-full min-h-touch flex flex-col items-center justify-center gap-1 py-2",
                    active ? "text-white" : "text-white/55"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium tracking-[0.01em] leading-none">
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "w-full h-full min-h-touch flex flex-col items-center justify-center gap-1 py-2",
                moreActive ? "text-white" : "text-white/55"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[11px] font-medium tracking-[0.01em] leading-none">
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
};
