import { ReactNode } from "react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { formatINR, formatINRCompact } from "@/lib/formatINR";
import { cn } from "@/lib/utils";

interface PrivateValueProps {
  value: number | string;
  /** Prefix shown before the masked or revealed value (default "₹"). Set to "" to suppress. */
  prefix?: string;
  /** Mask string when private (default "••••") */
  mask?: string;
  /** Use compact INR formatting (e.g. ₹1.25L) when value is a number */
  compact?: boolean;
  /** Show INR symbol when value is a number (defaults: true if prefix not provided) */
  showSymbol?: boolean;
  className?: string;
  /** Custom renderer for the visible state; receives the formatted string */
  children?: (formatted: string) => ReactNode;
}

/** Renders a financial figure, replaced with a mask when Privacy Mode is on. */
export const PrivateValue = ({
  value,
  prefix = "₹",
  mask = "••••",
  compact = false,
  showSymbol,
  className,
  children,
}: PrivateValueProps) => {
  const { isPrivate } = usePrivacyMode();

  // Money values (number-typed) render in DM Serif Display italic by default.
  const moneyClass = typeof value === "number" ? "fd-display" : undefined;

  if (isPrivate) {
    const masked = prefix ? `${prefix} ${mask}` : mask;
    return <span className={cn(moneyClass, className)} aria-label="hidden">{masked}</span>;
  }

  let formatted: string;
  if (typeof value === "number") {
    // When prefix is provided we let formatINR include its own ₹ unless explicitly suppressed.
    const useSymbol = showSymbol ?? (prefix === "₹");
    formatted = compact ? formatINRCompact(value) : formatINR(value, useSymbol);
  } else {
    formatted = prefix && prefix !== "₹" ? `${prefix}${value}` : String(value);
  }

  if (children) return <span className={cn(moneyClass, className)}>{children(formatted)}</span>;
  return <span className={cn(moneyClass, className)}>{formatted}</span>;
};

/** Renders sensitive free-text (e.g. transaction descriptions, goal names). */
export const PrivateText = ({
  value,
  mask = "••••",
  className,
}: {
  value: string | null | undefined;
  mask?: string;
  className?: string;
}) => {
  const { isPrivate } = usePrivacyMode();
  if (isPrivate) return <span className={className} aria-label="hidden">{mask}</span>;
  return <span className={className}>{value ?? ""}</span>;
};