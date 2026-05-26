import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-fd-green-light text-fd-green-dark",
        secondary: "border-transparent bg-fd-green-light text-fd-green-dark",
        destructive: "border-transparent bg-fd-coral-light text-fd-coral",
        success: "border-transparent bg-fd-green-light text-fd-green-dark",
        warning: "border-transparent bg-fd-amber-light text-[#633806]",
        amber: "border-transparent bg-fd-amber-light text-[#633806]",
        coral: "border-transparent bg-fd-coral-light text-fd-coral",
        info: "border-transparent bg-fd-blue-light text-fd-blue",
        blue: "border-transparent bg-fd-blue-light text-fd-blue",
        neutral: "border-transparent bg-[#F1EFE8] text-[#5F5E5A]",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
