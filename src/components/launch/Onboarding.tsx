import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Home,
  ListChecks,
  UtensilsCrossed,
  ShoppingCart,
  Calendar as CalendarIcon,
  Flame,
  Wallet,
  Sparkles,
  Check,
} from "lucide-react";
import { useFeatureTourGate } from "@/hooks/useFeatureTourGate";

/**
 * Three-screen first-launch onboarding.
 * Replaces the previous 7-screen FeatureTour. Visual spec mirrors
 * the FamilyDesk design system: DM Serif Display headline with a green
 * italic accent, DM Sans body, gradient top half + white bottom card.
 */

type ScreenDef = {
  id: string;
  bg: string; // top-section gradient
  counter: string;
  headline: ReactNode;
  body: string;
  mockup: ReactNode;
};

interface OnboardingProps {
  /** When provided, called instead of navigating to /auth (in-app replay). */
  onFinish?: () => void;
}

const HeadlineWithAccent = ({ first, accent }: { first: string; accent: string }) => (
  <h2
    className="font-serif text-[24px] leading-[1.15] mb-2 text-[#1A1A1A]"
    style={{ letterSpacing: "-0.02em" }}
  >
    {first}
    <br />
    <span className="italic text-[#0F6E56]">{accent}</span>
  </h2>
);

const PhoneMockup = ({ children }: { children: ReactNode }) => (
  <div
    className="w-[220px] bg-white rounded-[28px] overflow-hidden mb-7"
    style={{
      border: "1px solid rgba(0,0,0,0.08)",
      boxShadow: "0 4px 20px rgba(15,110,86,0.15), 0 1px 4px rgba(0,0,0,0.08)",
    }}
  >
    <div className="w-[60px] h-2 bg-[#1A1A1A] rounded-b-lg mx-auto mb-3" />
    <div className="px-3 pb-4">{children}</div>
  </div>
);

const MockHeader = ({
  iconBg,
  icon,
  title,
  subtitle,
}: {
  iconBg: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-center gap-2 mb-2.5">
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: iconBg }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold text-[#1A1A1A] leading-tight">{title}</div>
      <div className="text-[9px] text-[#8A8A8A] leading-tight">{subtitle}</div>
    </div>
  </div>
);

/* ---------- Screen 1: Hub ---------- */
const HubMock = () => {
  const cells: Array<{ label: string; icon: ReactNode }> = [
    { label: "Tasks", icon: <ListChecks className="w-3.5 h-3.5" style={{ color: "#0F6E56" }} /> },
    { label: "Meals", icon: <UtensilsCrossed className="w-3.5 h-3.5" style={{ color: "#BA7517" }} /> },
    { label: "Grocery", icon: <ShoppingCart className="w-3.5 h-3.5" style={{ color: "#185FA5" }} /> },
    { label: "Calendar", icon: <CalendarIcon className="w-3.5 h-3.5" style={{ color: "#5F5E5A" }} /> },
    { label: "Habits", icon: <Flame className="w-3.5 h-3.5" style={{ color: "#3B6D11" }} /> },
    { label: "Finance", icon: <Wallet className="w-3.5 h-3.5" style={{ color: "#993556" }} /> },
  ];
  return (
    <>
      <MockHeader
        iconBg="#E1F5EE"
        icon={<Home className="w-3.5 h-3.5" style={{ color: "#0F6E56" }} />}
        title="The Sharma Family"
        subtitle="Good morning · Wednesday"
      />
      <div className="rounded-lg p-2 mb-2" style={{ background: "#E1F5EE" }}>
        <div
          className="text-[8px] font-semibold uppercase mb-[3px] text-[#0F6E56]"
          style={{ letterSpacing: "0.08em" }}
        >
          Family pulse
        </div>
        <div className="text-[9px] leading-[1.4] text-[#085041]">
          3 tasks today · Aarav hit a 7-day streak 🎉
        </div>
      </div>
      <div className="grid grid-cols-3 gap-[5px]">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-[7px] py-[7px] px-[5px] text-center bg-[#F7F6F2]"
            style={{ border: "0.5px solid rgba(15,110,86,0.15)" }}
          >
            <div className="flex justify-center mb-[3px]">{c.icon}</div>
            <div className="text-[8px] font-medium text-[#4A4A4A]">{c.label}</div>
          </div>
        ))}
      </div>
    </>
  );
};

/* ---------- Screen 2: Tasks ---------- */
const TasksMock = () => {
  const tasks: Array<{ text: string; pri: string; priColor: string; done?: boolean }> = [
    { text: "Pay electricity bill", pri: "High", priColor: "#993C1D", done: true },
    { text: "Pick up Aarav from class", pri: "High", priColor: "#993C1D" },
    { text: "Order new water filter", pri: "Med", priColor: "#BA7517" },
    { text: "Book parent-teacher meeting", pri: "Low", priColor: "#8A8A8A" },
  ];
  return (
    <>
      <MockHeader
        iconBg="#E6F1FB"
        icon={<ListChecks className="w-3.5 h-3.5" style={{ color: "#185FA5" }} />}
        title="Today's plan"
        subtitle="Tuesday, Apr 28"
      />
      <div
        className="inline-flex items-center gap-[3px] rounded-full px-[7px] py-[3px] mb-[7px] text-[8px] font-semibold text-[#085041]"
        style={{ background: "#E1F5EE" }}
      >
        <Sparkles className="w-2.5 h-2.5" /> AI ranked your day
      </div>
      {tasks.map((t, i) => (
        <div
          key={t.text}
          className="flex items-center gap-1.5 py-1.5"
          style={{
            borderBottom: i === tasks.length - 1 ? "none" : "0.5px solid rgba(15,110,86,0.15)",
          }}
        >
          <div
            className="w-3.5 h-3.5 rounded-[4px] flex items-center justify-center shrink-0"
            style={
              t.done
                ? { background: "#0F6E56", borderColor: "#0F6E56" }
                : { border: "1.5px solid rgba(15,110,86,0.15)" }
            }
          >
            {t.done && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
          </div>
          <div
            className={`text-[9px] flex-1 ${t.done ? "line-through text-[#8A8A8A]" : "text-[#1A1A1A]"}`}
          >
            {t.text}
          </div>
          <div className="text-[8px] font-semibold" style={{ color: t.priColor }}>
            {t.pri}
          </div>
        </div>
      ))}
    </>
  );
};

/* ---------- Screen 3: Habits ---------- */
const HabitsMock = () => {
  const habits: Array<{ name: string; streak: string; done?: boolean }> = [
    { name: "Morning walk", streak: "🔥 7-day streak", done: true },
    { name: "Read 10 pages", streak: "🔥 3-day streak" },
    { name: "Family dinner", streak: "🔥 12-day streak", done: true },
    { name: "No screens after 9", streak: "🔥 2-day streak" },
  ];
  return (
    <>
      <MockHeader
        iconBg="#E1F5EE"
        icon={<Sparkles className="w-3.5 h-3.5" style={{ color: "#0F6E56" }} />}
        title="Habits · 145 pts"
        subtitle="Today · +10 pts earned"
      />
      {habits.map((h) => (
        <div
          key={h.name}
          className="flex items-center gap-1.5 bg-white rounded-[7px] px-[7px] py-1.5 mb-1"
          style={{ border: "0.5px solid rgba(15,110,86,0.15)" }}
        >
          <div
            className="w-4 h-4 rounded-full shrink-0"
            style={
              h.done
                ? { background: "#0F6E56", borderColor: "#0F6E56" }
                : { border: "2px solid rgba(15,110,86,0.15)" }
            }
          />
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-medium text-[#1A1A1A] leading-tight">{h.name}</div>
            <div className="text-[8px] text-[#8A8A8A] leading-tight">{h.streak}</div>
          </div>
          {h.done && (
            <div className="bg-[#0F6E56] text-white rounded-[10px] px-[5px] py-[2px] text-[8px] font-semibold">
              +10
            </div>
          )}
        </div>
      ))}
    </>
  );
};

const SCREENS: ScreenDef[] = [
  {
    id: "hub",
    bg: "linear-gradient(160deg, #E8F5F0 0%, #F7F6F2 50%)",
    counter: "1 / 3",
    headline: <HeadlineWithAccent first="Your whole home," accent="one calm hub" />,
    body:
      "Tasks, meals, grocery, habits, calendar and finance — everything your household runs on, in one place.",
    mockup: <HubMock />,
  },
  {
    id: "tasks",
    bg: "linear-gradient(160deg, #EDF3FF 0%, #F7F6F2 50%)",
    counter: "2 / 3",
    headline: <HeadlineWithAccent first="AI that plans" accent="your day for you" />,
    body:
      "Your task list, ranked by urgency, deadlines, and family priorities — automatically, every morning.",
    mockup: <TasksMock />,
  },
  {
    id: "habits",
    bg: "linear-gradient(160deg, #F0F7E8 0%, #F7F6F2 50%)",
    counter: "3 / 3",
    headline: <HeadlineWithAccent first="Build better habits," accent="together" />,
    body:
      "Track streaks, earn points, and keep each other accountable — as a household, not just as individuals.",
    mockup: <HabitsMock />,
  },
];

export const Onboarding = ({ onFinish }: OnboardingProps) => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { markComplete } = useFeatureTourGate();
  const isLast = current === SCREENS.length - 1;
  const screen = SCREENS[current];

  // Touch swipe navigation
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && current < SCREENS.length - 1) setCurrent(current + 1);
    if (dx > 0 && current > 0) setCurrent(current - 1);
  };

  const finish = useCallback(
    async (target: "signup" | "signin" = "signup") => {
      await markComplete();
      if (onFinish) {
        onFinish();
      } else {
        navigate(`/auth?tab=${target}`);
      }
    },
    [markComplete, navigate, onFinish],
  );

  // Lock body scroll while onboarding is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#F7F6F2]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top section */}
      <div
        key={`top-${screen.id}`}
        className="flex-1 flex flex-col items-center justify-center relative px-6 pt-8 pb-6 animate-fade-in"
        style={{ background: screen.bg }}
      >
        <span className="absolute top-[22px] left-5 text-[12px] text-[#8A8A8A]">
          {screen.counter}
        </span>
        <button
          type="button"
          onClick={() => finish("signup")}
          className="absolute top-5 right-5 text-[13px] font-medium text-[#8A8A8A] px-2 py-1"
        >
          Skip
        </button>
        <PhoneMockup>{screen.mockup}</PhoneMockup>
      </div>

      {/* Bottom section */}
      <div
        className="bg-white px-6 pt-5 pb-10"
        style={{ borderTop: "0.5px solid rgba(15,110,86,0.15)" }}
      >
        {/* Dots */}
        <div className="flex items-center gap-[5px] mb-4">
          {SCREENS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to screen ${i + 1}`}
              className="h-[6px] rounded-[3px] transition-all duration-200"
              style={{
                width: i === current ? 20 : 6,
                background: i === current ? "#0F6E56" : "#D3D1C7",
              }}
            />
          ))}
        </div>

        <div key={`copy-${screen.id}`} className="animate-fade-in">
          {screen.headline}
          <p className="text-[13px] leading-[1.55] text-[#8A8A8A] mb-5">{screen.body}</p>
        </div>

        <div className="flex gap-2">
          {current > 0 && (
            <button
              type="button"
              onClick={() => setCurrent(current - 1)}
              aria-label="Back"
              className="w-12 h-12 rounded-[12px] bg-[#F7F6F2] text-[#8A8A8A] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              style={{ border: "0.5px solid rgba(15,110,86,0.15)" }}
            >
              <ArrowLeft className="w-[18px] h-[18px]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? finish("signup") : setCurrent(current + 1))}
            className="flex-1 h-12 rounded-[12px] bg-[#0F6E56] hover:bg-[#085041] text-white text-[15px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{ letterSpacing: "-0.01em" }}
          >
            {isLast ? (onFinish ? "Done" : "Get started") : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;