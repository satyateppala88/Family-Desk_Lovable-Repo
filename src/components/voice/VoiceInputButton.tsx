import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";

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
  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    onResult: onTranscript,
    language,
    continuous,
  });

  if (!isSupported) return null;

  const handleClick = () => {
    if (isListening) {
      stop();
    } else {
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
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      size={size}
      variant={isListening ? "destructive" : variant}
      title={isListening ? "Stop listening" : title}
      aria-label={isListening ? "Stop listening" : title}
      className={cn(
        "shrink-0",
        isListening && "ring-2 ring-destructive/30",
        className
      )}
    >
      <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
    </Button>
  );
};
