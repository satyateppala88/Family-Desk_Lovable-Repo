import React from "react";
import { cn } from "@/lib/utils";
import { Plus, LucideIcon } from "lucide-react";

interface QuickActionItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

interface QuickActionButtonProps {
  items: QuickActionItem[];
  className?: string;
}

/**
 * A floating action button (FAB) that expands into a quick action menu.
 * Use for primary creation actions across modules.
 */
export const QuickActionButton = ({ items, className }: QuickActionButtonProps) => {
  const [open, setOpen] = React.useState(false);

  if (items.length === 0) return null;

  // Single action — just show a FAB
  if (items.length === 1) {
    const item = items[0];
    const Icon = item.icon || Plus;
    return (
      <button
        onClick={item.onClick}
        className={cn(
          "fixed bottom-24 right-6 sm:bottom-6 sm:right-24 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-5 py-3.5 text-sm font-medium transition-all hover:shadow-xl hover:scale-105 active:scale-95",
          className
        )}
        aria-label={item.label}
      >
        <Icon className="w-5 h-5" />
        <span className="hidden sm:inline">{item.label}</span>
      </button>
    );
  }

  // Multiple actions — expand on click
  return (
    <div className={cn("fixed bottom-24 right-6 sm:bottom-6 sm:right-24 z-40 flex flex-col-reverse items-end gap-2", className)}>
      {open && (
        <div className="flex flex-col-reverse gap-2 animate-fade-up">
          {items.map((item, i) => {
            const Icon = item.icon || Plus;
            return (
              <button
                key={i}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className="flex items-center gap-2 rounded-full bg-card border border-border text-foreground shadow-md px-4 py-2.5 text-sm font-medium transition-all hover:shadow-lg hover:bg-accent whitespace-nowrap"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
        />
      )}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg h-14 w-14 transition-all hover:shadow-xl",
          open && "rotate-45"
        )}
        aria-label="Quick actions"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
