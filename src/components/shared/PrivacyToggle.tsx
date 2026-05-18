import { Eye, EyeOff } from "lucide-react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { cn } from "@/lib/utils";

interface PrivacyToggleProps {
  className?: string;
}

export const PrivacyToggle = ({ className }: PrivacyToggleProps) => {
  const { isPrivate, togglePrivacy } = usePrivacyMode();
  const Icon = isPrivate ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={togglePrivacy}
      className={cn(
        "flex items-center justify-center rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className,
      )}
      style={{ minHeight: "var(--touch-target)", minWidth: "var(--touch-target)" }}
      aria-pressed={isPrivate}
      aria-label={isPrivate ? "Show financial data" : "Hide financial data"}
      title={isPrivate ? "Show financial data" : "Hide financial data"}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
};