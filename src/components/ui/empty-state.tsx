import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}>
    <div className="rounded-2xl bg-muted p-4 mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
    )}
    {(action || secondaryAction) && (
      <div className="flex flex-wrap gap-2 justify-center">
        {secondaryAction && (
          <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {action && (
          <Button variant={action.variant || "default"} size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    )}
  </div>
);
