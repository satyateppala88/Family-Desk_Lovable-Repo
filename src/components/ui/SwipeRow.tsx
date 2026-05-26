import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDrag } from "@use-gesture/react";
import { cn } from "@/lib/utils";

const isTouchDevice = () => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

export interface SwipeAction {
  key: string;
  label: string;
  icon: ReactNode;
  /** Background color class, e.g. 'bg-[hsl(var(--success))]' */
  bgClass: string;
  /** Text color class, default 'text-white' */
  textClass?: string;
  /** Width in px (default 80) */
  width?: number;
  onAction: () => void;
}

interface SwipeRowProps {
  children: ReactNode;
  /** Actions revealed when user swipes left (shown on the right). */
  actions: SwipeAction[];
  /** Snap threshold in px (default 80). */
  threshold?: number;
  className?: string;
  disabled?: boolean;
  /** Border-radius class to keep on the wrapper (e.g. 'rounded-lg'). */
  radiusClass?: string;
}

/**
 * Swipe-left to reveal action buttons on the right.
 * Uses CSS transform for 60fps. Falls back to plain children on non-touch.
 */
export const SwipeRow = ({
  children,
  actions,
  threshold = 80,
  className,
  disabled = false,
  radiusClass = "rounded-lg",
}: SwipeRowProps) => {
  const [touch, setTouch] = useState(false);
  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setTouch(isTouchDevice()), []);

  const totalWidth = actions.reduce((s, a) => s + (a.width ?? 80), 0);

  const bind = useDrag(
    ({ last, movement: [mx], cancel, axis }) => {
      if (disabled) return;
      // Only act on horizontal swipes
      if (axis === "y") {
        cancel();
        return;
      }
      // Allow left swipe only (negative mx). If row is open, allow right swipe to close.
      const base = open ? -totalWidth : 0;
      const next = Math.min(0, Math.max(-totalWidth - 24, base + mx));
      if (last) {
        const shouldOpen = -next >= threshold;
        setOpen(shouldOpen);
        setDx(shouldOpen ? -totalWidth : 0);
      } else {
        setDx(next);
      }
    },
    {
      axis: "lock",
      filterTaps: true,
      pointer: { touch: true },
      enabled: touch && !disabled,
    }
  );

  const close = () => {
    setOpen(false);
    setDx(0);
  };

  // Close when tapping outside while open
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  if (!touch) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden touch-pan-y", radiusClass, className)}
    >
      {/* Action layer (behind) */}
      <div className="absolute inset-y-0 right-0 flex items-stretch z-0" aria-hidden={!open}>
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => {
              a.onAction();
              close();
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-xs font-medium",
              a.bgClass,
              a.textClass ?? "text-white"
            )}
            style={{ width: a.width ?? 80 }}
          >
            <span className="w-5 h-5 flex items-center justify-center">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Foreground row */}
      <div
        {...bind()}
        className={cn("relative z-10 bg-background", radiusClass)}
        style={{
          transform: `translate3d(${dx}px, 0, 0)`,
          transition: dx === 0 || dx === -totalWidth ? "transform 200ms ease-out" : "none",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface SwipeFillRowProps {
  children: ReactNode;
  /** Pixel threshold to trigger (default 80). */
  threshold?: number;
  /** Tailwind/CSS bg color class for fill, default brand primary. */
  fillClass?: string;
  /** Called once when threshold is crossed on release. */
  onTrigger: () => void;
  /** When true, swipe is disabled (e.g. already done). */
  disabled?: boolean;
  className?: string;
  radiusClass?: string;
}

/**
 * Swipe-right to progressively fill the row background; triggers an action
 * when released past the threshold. Used for habit completion.
 */
export const SwipeFillRow = ({
  children,
  threshold = 80,
  fillClass = "bg-primary",
  onTrigger,
  disabled = false,
  className,
  radiusClass = "rounded-lg",
}: SwipeFillRowProps) => {
  const [touch, setTouch] = useState(false);
  const [dx, setDx] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => setTouch(isTouchDevice()), []);

  const bind = useDrag(
    ({ last, movement: [mx], cancel, axis }) => {
      if (disabled) return;
      if (axis === "y") {
        cancel();
        return;
      }
      const next = Math.max(0, Math.min(threshold * 1.5, mx));
      if (last) {
        if (next >= threshold) {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try { navigator.vibrate(50); } catch { /* noop */ }
          }
          setFlash(true);
          setTimeout(() => setFlash(false), 600);
          onTrigger();
        }
        setDx(0);
      } else {
        setDx(next);
      }
    },
    {
      axis: "lock",
      filterTaps: true,
      pointer: { touch: true },
      enabled: touch && !disabled,
    }
  );

  if (!touch) {
    return <div className={className}>{children}</div>;
  }

  const fillPct = Math.min(100, (dx / threshold) * 100);
  const triggered = dx >= threshold;

  return (
    <div className={cn("relative overflow-hidden", radiusClass, className)}>
      {/* Fill layer */}
      <div
        className={cn("absolute inset-y-0 left-0 transition-opacity", fillClass)}
        style={{
          width: `${fillPct}%`,
          opacity: flash ? 1 : Math.min(0.85, 0.3 + fillPct / 200),
        }}
        aria-hidden
      />
      {triggered && !flash && (
        <div className="absolute inset-y-0 right-3 flex items-center text-white pointer-events-none">
          <span className="text-lg font-bold">✓</span>
        </div>
      )}
      {flash && (
        <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none animate-fade-in">
          <span className="text-2xl font-bold">✓</span>
        </div>
      )}
      <div
        {...bind()}
        className="relative"
        style={{
          transform: `translate3d(${dx}px, 0, 0)`,
          transition: dx === 0 ? "transform 200ms ease-out" : "none",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
};