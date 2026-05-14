import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export type ModuleNudgeKey =
  | "tasks"
  | "meals"
  | "grocery"
  | "habits"
  | "finance"
  | "calendar";

interface ModuleNudgeBannerProps {
  moduleKey: ModuleNudgeKey;
  text: string;
}

const storageKey = (userId: string, moduleKey: ModuleNudgeKey) =>
  `fd_module_nudge_dismissed:${userId}:${moduleKey}`;

export const ModuleNudgeBanner = ({ moduleKey, text }: ModuleNudgeBannerProps) => {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const dismissed = localStorage.getItem(storageKey(user.id, moduleKey));
      setHidden(dismissed === "1");
    } catch {
      setHidden(false);
    }
  }, [user?.id, moduleKey]);

  if (!user?.id || hidden) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey(user.id, moduleKey), "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <div
      role="note"
      className="relative mb-4 flex items-start gap-3 rounded-lg p-3 pr-10 animate-fade-in"
      style={{
        backgroundColor: "#E8F5F1",
        borderLeft: "3px solid #0F6E56",
      }}
    >
      <p className="text-sm text-foreground/90 leading-snug flex-1">{text}</p>
      <button
        type="button"
        aria-label="Dismiss tip"
        onClick={handleDismiss}
        className="absolute top-2 right-2 rounded-md p-1 text-foreground/60 hover:text-foreground hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};