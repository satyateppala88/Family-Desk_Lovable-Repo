import { useState, useCallback, ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFeatureTourGate } from "@/hooks/useFeatureTourGate";
import { HubScreen } from "./screens/HubScreen";
import { TasksScreen } from "./screens/TasksScreen";
import { MealsScreen } from "./screens/MealsScreen";
import { GroceryScreen } from "./screens/GroceryScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import { HabitsScreen } from "./screens/HabitsScreen";
import { FinanceAiScreen } from "./screens/FinanceAiScreen";

type ScreenDef = {
  id: string;
  Component: ComponentType<{ active: boolean }>;
  title: string;
  body: string;
};

const screens: ScreenDef[] = [
  {
    id: "hub",
    Component: HubScreen,
    title: "Welcome to FamilyDesk",
    body: "Everything your household runs on, gathered into one calm hub.",
  },
  {
    id: "tasks",
    Component: TasksScreen,
    title: "A daily plan that thinks for you",
    body: "Your AI-ranked Today list mixes deadlines, calendar events, and family priorities.",
  },
  {
    id: "meals",
    Component: MealsScreen,
    title: "Meals planned, not improvised",
    body: "Generate a full week of meals respecting your dietary preferences and pantry.",
  },
  {
    id: "grocery",
    Component: GroceryScreen,
    title: "Pantry that updates itself",
    body: "Items from your meal plan flow straight into your shopping list. Quick-add Indian staples included.",
  },
  {
    id: "calendar",
    Component: CalendarScreen,
    title: "One calendar for the whole family",
    body: "Every Google Calendar in your household, color-coded by member.",
  },
  {
    id: "habits",
    Component: HabitsScreen,
    title: "Build streaks together",
    body: "Personal and household habits with streak bonuses and a friendly Habit Coach.",
  },
  {
    id: "finance",
    Component: FinanceAiScreen,
    title: "Money in plain English",
    body: "Track spending, savings, and subscriptions — and ask the AI assistant anything about your finances.",
  },
];

interface FeatureTourProps {
  /** When provided, called instead of navigating to /auth. Used by the in-app replay. */
  onFinish?: () => void;
}

export const FeatureTour = ({ onFinish }: FeatureTourProps) => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { markComplete } = useFeatureTourGate();

  const isLast = current === screens.length - 1;

  const finish = useCallback(
    async (target: "signup" | "signin" | "back") => {
      await markComplete();
      if (onFinish) {
        onFinish();
      } else if (target === "back") {
        navigate("/");
      } else {
        navigate(`/auth?tab=${target}`);
      }
    },
    [markComplete, navigate, onFinish],
  );

  const next = () => (isLast ? finish("signup") : setCurrent((c) => c + 1));
  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const skip = () => finish(onFinish ? "back" : "signup");

  const screen = screens[current];
  const ScreenComponent = screen.Component;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          {current + 1} / {screens.length}
        </span>
        <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
          {onFinish ? "Close" : "Skip"}
        </Button>
      </div>

      {/* Phone mock */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        <div key={screen.id} className="animate-fade-in w-full">
          <ScreenComponent active />
        </div>
      </div>

      {/* Copy + controls */}
      <div className="px-6 pb-8 pt-2 flex flex-col items-center gap-3 max-w-md mx-auto w-full">
        <div key={`copy-${screen.id}`} className="text-center animate-fade-in">
          <h2 className="text-xl font-bold text-foreground leading-tight">{screen.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
            {screen.body}
          </p>
        </div>

        {/* Dots */}
        <div className="flex gap-1.5">
          {screens.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to screen ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>

        {isLast ? (
          <div className="w-full flex flex-col items-center gap-2 mt-1">
            <Button className="w-full max-w-xs h-12 text-base" onClick={() => finish("signup")}>
              {onFinish ? "Done" : "Get started"}
            </Button>
            {!onFinish && (
              <Button variant="ghost" className="text-muted-foreground text-sm" onClick={() => finish("signin")}>
                I already have an account
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full flex items-center gap-2 mt-1 max-w-xs">
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              disabled={current === 0}
              className="h-12 w-12 shrink-0"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button className="flex-1 h-12 text-base" onClick={next}>
              Continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};