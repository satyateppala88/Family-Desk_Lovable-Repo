import { useEffect } from "react";
import logoImg from "@/assets/familydesk-icon.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/30">
      <div className="animate-fade-in flex flex-col items-center gap-4">
        <img
          src={logoImg}
          alt="Family Desk"
          className="h-28 w-28 object-contain drop-shadow-xl"
        />
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-heading">
          Family Desk
        </h1>
        <div className="mt-6 h-1 w-12 rounded-full bg-primary/40 animate-pulse" />
      </div>
    </div>
  );
};
