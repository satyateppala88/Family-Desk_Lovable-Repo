import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** When true (default), title/X header is shown. */
  showHeader?: boolean;
}

/**
 * BottomSheet
 * - Mobile: slides up from the bottom with drag handle, sticky header & footer.
 * - Desktop (lg+): renders as a centered Dialog.
 *
 * Built on Radix Dialog so focus trap, escape handling and body scroll lock
 * come for free. Renders via portal at document.body.
 */
export const BottomSheet = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  showHeader = true,
}: BottomSheetProps) => {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            // Base positioning
            "fixed z-50 bg-background flex flex-col focus:outline-none",
            // Mobile: bottom sheet
            "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t border-border shadow-xl",
            // Mobile animation: slide up
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "data-[state=open]:duration-300 data-[state=closed]:duration-200",
            // Desktop: centered dialog
            "lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2",
            "lg:w-full lg:max-w-lg lg:max-h-[85dvh] lg:rounded-2xl lg:border",
            "lg:data-[state=open]:slide-in-from-bottom-0 lg:data-[state=closed]:slide-out-to-bottom-0",
            "lg:data-[state=open]:zoom-in-95 lg:data-[state=closed]:zoom-out-95",
            className
          )}
        >
          {/* Drag handle (mobile only) */}
          <div className="lg:hidden flex justify-center pt-2 pb-1 shrink-0">
            <div className="h-1 w-9 rounded-full bg-[hsl(var(--ink-3))]" />
          </div>

          {showHeader && (
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 h-14 bg-background border-b border-border shrink-0">
              <div className="min-w-0 flex-1">
                {title && (
                  <DialogPrimitive.Title className="text-base font-semibold leading-tight tracking-tight truncate">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-xs text-muted-foreground truncate">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close
                className="rounded-full p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {!showHeader && title && (
              <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            )}
            {children}
          </div>

          {footer && (
            <div
              className="sticky bottom-0 z-10 bg-background border-t border-border px-4 pt-4 shrink-0"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default BottomSheet;