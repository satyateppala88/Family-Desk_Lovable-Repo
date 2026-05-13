import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
    loading?: boolean;
    loadingLabel?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  /** Optional encouraging sub-text shown below the description */
  encouragement?: string;
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  encouragement,
}: EmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4 animate-fade-in", className)}>
    <div className="rounded-2xl bg-muted p-4 mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-xs mb-1">{description}</p>
    )}
    {encouragement && (
      <p className="text-xs text-muted-foreground/70 max-w-xs mb-4 italic">{encouragement}</p>
    )}
    {!encouragement && description && <div className="mb-4" />}
    {(action || secondaryAction) && (
      <div className="flex flex-wrap gap-2 justify-center">
        {secondaryAction && (
          <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {action && (
          <Button
            variant={action.variant || "default"}
            size="sm"
            onClick={action.onClick}
            disabled={action.loading}
          >
            {action.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {action.loadingLabel || "Working…"}
              </>
            ) : (
              action.label
            )}
          </Button>
        )}
      </div>
    )}
  </div>
);
