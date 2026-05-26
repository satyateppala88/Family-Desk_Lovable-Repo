import { Eye } from "lucide-react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

export const PrivacyBanner = () => {
  const { isPrivate, togglePrivacy } = usePrivacyMode();
  if (!isPrivate) return null;
  return (
    <button
      type="button"
      onClick={togglePrivacy}
      className="w-full flex items-center justify-center gap-2 text-xs font-medium text-white"
      style={{ background: "#2C2C2A", height: 32 }}
      aria-label="Privacy mode is on. Tap to reveal financial data."
    >
      <Eye className="h-3.5 w-3.5" />
      <span>Privacy mode on · Tap to reveal</span>
    </button>
  );
};