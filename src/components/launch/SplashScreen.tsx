import { useEffect } from "react";
import { FamilyDeskLogo } from "@/components/brand/FamilyDeskLogo";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-fd-surface">
      <div className="animate-fade-in flex flex-col items-center gap-6">
        <FamilyDeskLogo size="lg" />
        <div className="h-1 w-12 rounded-full bg-fd-green/40 animate-pulse" />
      </div>
    </div>
  );
};
