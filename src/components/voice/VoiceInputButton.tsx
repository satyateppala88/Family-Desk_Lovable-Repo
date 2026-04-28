import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";
import { usePermissionPrimer } from "@/hooks/usePermissionPrimer";
import { PermissionPrimerDialog } from "@/components/permissions/PermissionPrimerDialog";
import { usePermissionRetry } from "@/hooks/usePermissionRetry";
import { toast as sonnerToast } from "sonner";

const isNative = (): boolean =>
  typeof window !== "undefined" &&
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();

const openOSSettings = async () => {
  if (isNative()) {
    try {
      const moduleName = "@capacitor/app";
      const mod: unknown = await import(/* @vite-ignore */ moduleName);
      const App = (mod as { App?: { openSettings?: () => Promise<void> } }).App;
      if (App?.openSettings) {
        await App.openSettings();
        return;
      }
    } catch {
      /* fall through */
    }
  }
  sonnerToast.info(
    "Tap the lock icon (🔒) next to the address bar → Site settings → allow Microphone.",
    { duration: 7000 }
  );
};

interface VoiceInputButtonProps {
  /** Called with each finalized transcript chunk. */
  onTranscript: (text: string) => void;
  /** Notifies parent that the user *started by voice* (used to enable spoken replies). */
  onVoiceStart?: () => void;
  language?: string;
  continuous?: boolean;
  size?: "sm" | "icon" | "default";
  className?: string;
  disabled?: boolean;
  /** Visual style: "ghost" (inside text inputs) or "outline" (standalone). */
  variant?: "ghost" | "outline";
  title?: string;
}

export const VoiceInputButton = ({
  onTranscript,
  onVoiceStart,
  language = "en-IN",
  continuous = false,
  size = "icon",
  className,
  disabled,
  variant = "ghost",
  title = "Speak",
}: VoiceInputButtonProps) => {
  const { toast } = useToast();
  const { ensurePermission, primerProps } = usePermissionPrimer();
  const { needsRetry, isOSBlocked, tryAgain } = usePermissionRetry("microphone");
  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    onResult: onTranscript,
    language,
    continuous,
  });

  if (!isSupported) return null;

  const handleClick = async () => {
    if (isListening) {
      stop();
      return;
    }

    // If the user previously denied/dismissed, run the explicit retry path
    // so they get clear "Try again" UX (toast w/ Open Settings on blocked,
    // re-show soft primer when only locally suppressed).
    let granted: boolean;
    if (isOSBlocked) {
      sonnerToast.error("Microphone is blocked. Re-enable it in settings to use voice input.", {
        action: { label: "Open settings", onClick: () => void openOSSettings() },
        duration: 7000,
      });
      return;
    } else if (needsRetry) {
      granted = await tryAgain(ensurePermission, "voice-input-retry");
    } else {
      granted = await ensurePermission("microphone", "voice-input");
    }
    if (!granted) return;

    onVoiceStart?.();
    try {
      start();
    } catch (err: any) {
      toast({
        title: "Microphone unavailable",
        description: err?.message || "Please check microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const showRetryAffordance = needsRetry;
  const buttonTitle = isListening
    ? "Stop listening"
    : isOSBlocked
    ? "Microphone blocked — tap to fix"
    : showRetryAffordance
    ? "Try microphone again"
    : title;

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        size={size}
        variant={isListening ? "destructive" : showRetryAffordance ? "outline" : variant}
        title={buttonTitle}
        aria-label={buttonTitle}
        className={cn(
          "shrink-0",
          isListening && "ring-2 ring-destructive/30",
          showRetryAffordance && "ring-1 ring-amber-500/40",
          className
        )}
      >
        {showRetryAffordance ? (
          <MicOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
        )}
      </Button>
      <PermissionPrimerDialog {...primerProps} />
    </>
  );
};
