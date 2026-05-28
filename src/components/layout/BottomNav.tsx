import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MoreSheet } from "@/components/layout/MoreSheet";

/* Quiet Precision icon set — inline SVG, stroke-width 2, currentColor */
const IconHome = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2 10L12 3l10 7v10a1 1 0 01-1 1H3a1 1 0 01-1-1V10z" />
    <polyline points="9,21 9,12 15,12 15,21" />
  </svg>
);
const IconTasks = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <polyline points="7.5,12 10.5,15 16.5,9" />
  </svg>
);
const IconAI = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);
const IconFinance = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none" />
    <path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2" />
  </svg>
);
const IconMore = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="16" x2="20" y2="16" />
  </svg>
);

const PRIMARY = [
  { to: "/dashboard", label: "Home", icon: IconHome, match: ["/dashboard"] },
  { to: "/taskmaster/today", label: "Tasks", icon: IconTasks, match: ["/taskmaster", "/tasks"] },
  { to: "/ai", label: "Ask AI", icon: IconAI, match: ["/ai"] },
  { to: "/finance", label: "Finance", icon: IconFinance, match: ["/finance"] },
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

  const NAV_BG = "#0D0D0B";
  const ACTIVE = "#3DB87A";
  const INACTIVE = "rgba(255,255,255,0.35)";
  const INACTIVE_LABEL = "rgba(255,255,255,0.28)";

  return (
    <>
      {/* Mobile: floating pill */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-4 left-4 right-4 z-40"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul
          className="mx-auto flex items-stretch justify-around max-w-[600px] h-[60px] rounded-[40px] px-1 pt-2 pb-[20px]"
          style={{
            backgroundColor: NAV_BG,
            boxShadow: "0 4px 20px rgba(0,0,0,0.30)",
          }}
        >
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = matches(location.pathname, item.match);
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  className="relative h-full min-h-touch flex flex-col items-center justify-center gap-[3px] rounded-[16px] py-2"
                  style={{ color: active ? ACTIVE : INACTIVE }}
                >
                  <Icon width={20} height={20} />
                  <span
                    className="text-[9px] font-medium tracking-[0.01em] leading-none uppercase"
                    style={{ color: active ? ACTIVE : INACTIVE_LABEL }}
                  >
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
              className="relative w-full h-full min-h-touch flex flex-col items-center justify-center gap-[3px] rounded-[16px] py-2"
              style={{ color: moreActive ? ACTIVE : INACTIVE }}
            >
              <IconMore width={20} height={20} />
              <span
                className="text-[9px] font-medium tracking-[0.01em] leading-none uppercase"
                style={{ color: moreActive ? ACTIVE : INACTIVE_LABEL }}
              >
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
          backgroundColor: NAV_BG,
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
                  className="h-full min-h-touch flex flex-col items-center justify-center gap-1 py-2"
                  style={{ color: active ? ACTIVE : INACTIVE }}
                >
                  <Icon width={20} height={20} />
                  <span
                    className="text-[9px] font-medium tracking-[0.01em] leading-none uppercase"
                    style={{ color: active ? ACTIVE : INACTIVE_LABEL }}
                  >
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
              className="w-full h-full min-h-touch flex flex-col items-center justify-center gap-1 py-2"
              style={{ color: moreActive ? ACTIVE : INACTIVE }}
            >
              <IconMore width={20} height={20} />
              <span
                className="text-[9px] font-medium tracking-[0.01em] leading-none uppercase"
                style={{ color: moreActive ? ACTIVE : INACTIVE_LABEL }}
              >
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
