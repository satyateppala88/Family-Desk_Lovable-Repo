import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * StatusChip — a single, normalized chip primitive used across the app
 * for status pills, count badges, filter tags, and inline labels.
 *
 * Heights are fixed per size so chips line up consistently across modules:
 *   sm = 20px, md = 24px, lg = 28px.
 *
 * Prefer this over ad-hoc <Badge> / <span> chip styling.
 */
const statusChipVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap leading-none border transition-colors",
  {
    variants: {
      tone: {
        neutral: "bg-muted/60 text-muted-foreground border-border/60",
        brand: "bg-primary/10 text-primary border-primary/20",
        success: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]",
        warning: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.25)]",
        danger: "bg-destructive/10 text-destructive border-destructive/25",
        info: "bg-[#E6F1FB] text-[#185FA5] border-[#185FA5]/20",
        outline: "bg-transparent text-foreground border-border",
      },
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-2.5 text-[12px]",
        lg: "h-7 px-3 text-[13px]",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  },
);

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusChipVariants> {
  icon?: React.ReactNode;
  asChild?: boolean;
}

export const StatusChip = React.forwardRef<HTMLSpanElement, StatusChipProps>(
  ({ className, tone, size, icon, children, ...props }, ref) => (
    <span ref={ref} className={cn(statusChipVariants({ tone, size }), className)} {...props}>
      {icon ? <span className="inline-flex shrink-0 items-center">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  ),
);
StatusChip.displayName = "StatusChip";

export { statusChipVariants };