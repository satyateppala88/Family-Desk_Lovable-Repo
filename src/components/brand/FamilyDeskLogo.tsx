import { cn } from "@/lib/utils";

type Size = "lg" | "sm";

interface FamilyDeskLogoProps {
  size?: Size;
  showTagline?: boolean;
  className?: string;
}

/**
 * FamilyDesk brand lockup — green icon tile + serif wordmark.
 * Use `size="lg"` (22px wordmark) on auth/setup, `size="sm"` (18px) in headers.
 */
export const FamilyDeskLogo = ({
  size = "lg",
  showTagline = true,
  className,
}: FamilyDeskLogoProps) => {
  const wordPx = size === "lg" ? 22 : 18;

  return (
    <div className={cn("flex items-center gap-[10px]", className)}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center bg-fd-green"
        style={{ borderRadius: 11 }}
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="14" rx="3" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="7" y1="10" x2="17" y2="10" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="13.5" x2="13" y2="13.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <div
          className="font-display"
          style={{ fontSize: wordPx, lineHeight: 1, letterSpacing: "-0.02em" }}
        >
          <span className="text-fd-ink">Family</span>
          <span className="text-fd-green">Desk</span>
        </div>
        {showTagline && (
          <span
            className="mt-[3px] text-fd-ink-3"
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Household OS
          </span>
        )}
      </div>
    </div>
  );
};

export default FamilyDeskLogo;