import { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
  /** Tailwind background class for the device wallpaper inside the frame */
  surfaceClassName?: string;
}

/**
 * Lightweight phone-shaped bezel that scales to its container.
 * Internal canvas is fixed at 320×640 (mobile-ish aspect) — children render
 * inside that virtual viewport. The frame uses a CSS scale via aspect ratio
 * + max-width so it always fits the parent.
 */
export const PhoneFrame = ({ children, surfaceClassName = "bg-background" }: PhoneFrameProps) => {
  return (
    <div className="relative mx-auto" style={{ width: "min(280px, 78vw)" }}>
      {/* Outer bezel */}
      <div
        className="relative rounded-[2.25rem] bg-foreground/85 p-[6px] shadow-[0_24px_70px_-20px_hsl(var(--foreground)/0.35)]"
      >
        {/* Screen */}
        <div
          className={`relative overflow-hidden rounded-[1.85rem] ${surfaceClassName}`}
          style={{ aspectRatio: "9/19.5" }}
        >
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
            <div className="mt-1 h-4 w-20 rounded-b-2xl bg-foreground/85" />
          </div>
          {/* Status bar spacer */}
          <div className="h-6" />
          <div className="absolute inset-0 pt-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};