import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Delete } from "lucide-react";

interface PinKeypadProps {
  length?: number;
  /** Fired when the user has entered `length` digits */
  onComplete: (pin: string) => void;
  /** Reset the entered digits (e.g. after a wrong attempt). Set then unset. */
  resetSignal?: number;
  /** Shake the boxes (e.g. wrong PIN) */
  shake?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const PinKeypad = ({
  length = 4,
  onComplete,
  resetSignal,
  shake,
  autoFocus = true,
  disabled = false,
}: PinKeypadProps) => {
  const [digits, setDigits] = useState<string>("");
  const completedRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDigits("");
    completedRef.current = null;
  }, [resetSignal]);

  useEffect(() => {
    if (digits.length === length && completedRef.current !== digits) {
      completedRef.current = digits;
      onCompleteRef.current(digits);
    }
  }, [digits, length]);

  useEffect(() => {
    if (!autoFocus) return;
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) {
        setDigits((d) => (d.length < length ? d + e.key : d));
      } else if (e.key === "Backspace") {
        setDigits((d) => d.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoFocus, disabled, length]);

  const press = (d: string) => {
    if (disabled) return;
    setDigits((curr) => (curr.length < length ? curr + d : curr));
  };
  const backspace = () => {
    if (disabled) return;
    setDigits((curr) => curr.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      <div
        className={cn("flex gap-3", shake && "animate-shake")}
        aria-label="PIN entry"
      >
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-14 w-12 rounded-xl border-2 flex items-center justify-center text-2xl font-semibold",
              digits[i] ? "border-primary bg-primary/5 text-primary" : "border-border bg-background text-muted-foreground",
            )}
          >
            {digits[i] ? "•" : ""}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            disabled={disabled}
            className="h-14 rounded-xl bg-secondary text-foreground text-xl font-medium hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => press("0")}
          disabled={disabled}
          className="h-14 rounded-xl bg-secondary text-foreground text-xl font-medium hover:bg-secondary/80 disabled:opacity-40 transition-colors"
        >
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          disabled={disabled}
          className="h-14 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors flex items-center justify-center"
          aria-label="Delete last digit"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};