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
    <div
      className="relative mx-auto h-full flex items-center justify-center"
      style={{
        // Width is the smaller of: 78% of viewport width, OR what fits the
        // available height given the 9:19.5 aspect ratio. This guarantees
        // the phone never overflows its container vertically — which is
        // what was clipping the "Skip" button at the top and the
        // tour copy at the bottom on small phones (e.g. Galaxy S8+ 360×740).
        width: "min(280px, 78vw, calc((100% - 0px) * 9 / 19.5), calc(var(--phone-mock-max-h, 100%)))",
      }}
    >
      {/* Outer bezel */}
      <div
        className="relative rounded-[2.25rem] bg-foreground/85 p-[6px] shadow-[0_24px_70px_-20px_hsl(var(--foreground)/0.35)] w-full"
      >
        {/* Screen */}
        <div
          className={`relative overflow-hidden rounded-[1.85rem] ${surfaceClassName} w-full`}
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