import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { setHasSeenIntro } from "@/lib/launchStorage";
import { Home, Users, ShieldCheck } from "lucide-react";

const screens = [
  {
    icon: Home,
    title: "Family life, organized in one place",
    body: "Manage tasks, meals, groceries, calendar, habits, and finances together.",
  },
  {
    icon: Users,
    title: "Built for your household",
    body: "Keep everyone aligned with simple shared tools and a calm, focused experience.",
  },
  {
    icon: ShieldCheck,
    title: "Private, simple, and ready to use",
    body: "Create your account, set up your household, and start with the modules you need.",
  },
];

export const OnboardingIntro = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const isLast = current === screens.length - 1;

  const finish = (tab: "signup" | "signin") => {
    setHasSeenIntro();
    navigate(`/auth?tab=${tab}`);
  };

  const skip = () => finish("signup");

  const screen = screens[current];
  const Icon = screen.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Skip */}
      <div className="flex justify-end p-4">
        {!isLast && (
          <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
            Skip
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground leading-tight max-w-xs">
          {screen.title}
        </h2>
        <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
          {screen.body}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="px-8 pb-10 flex flex-col items-center gap-4">
        {/* Dots */}
        <div className="flex gap-2 mb-2">
          {screens.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {isLast ? (
          <>
            <Button className="w-full max-w-xs h-12 text-base" onClick={() => finish("signup")}>
              Get started
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground text-sm"
              onClick={() => finish("signin")}
            >
              I already have an account
            </Button>
          </>
        ) : (
          <Button className="w-full max-w-xs h-12 text-base" onClick={() => setCurrent(current + 1)}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
};
