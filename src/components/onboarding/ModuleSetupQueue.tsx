import { useMemo, useState, useEffect } from "react";
import { ModuleSetupDialog } from "./ModuleSetupGate";
import { MODULE_SETUP_KEYS, type ModuleSetupKey } from "@/lib/moduleSetup";
import type { ProductName } from "@/hooks/useEnabledProducts";
import { useModuleSetup } from "@/hooks/useModuleSetup";

interface ModuleSetupQueueProps {
  /** Modules to walk the user through, in order. */
  products: ProductName[];
  /** Fired once all dialogs have been completed/skipped. */
  onAllDone: () => void;
}

/**
 * Drives the user through per-module first-enable setup dialogs one at a
 * time. Each dialog is dismissible; Skip simply advances to the next module
 * (the ModuleSetupGate on first visit acts as the safety net).
 */
export const ModuleSetupQueue = ({ products, onAllDone }: ModuleSetupQueueProps) => {
  const queue = useMemo<ModuleSetupKey[]>(
    () => products.map((p) => MODULE_SETUP_KEYS[p]).filter(Boolean),
    [products],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (queue.length === 0) onAllDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  // Hooks must run unconditionally — pick a stable key even when the
  // queue is empty (the dialog itself is gated by `done` below).
  const done = queue.length === 0 || index >= queue.length;
  const current = (done ? queue[0] : queue[index]) as ModuleSetupKey | undefined;
  const { markComplete } = useModuleSetup((current ?? "meals_setup") as ModuleSetupKey);

  if (done || !current) return null;

  const advance = () => {
    if (index + 1 >= queue.length) onAllDone();
    else setIndex(index + 1);
  };

  return (
    <ModuleSetupDialog
      key={current}
      module={current}
      open={true}
      dismissible={true}
      onComplete={advance}
      onSkip={advance}
      onOpenChange={(o) => {
        if (o) return;
        // X / Esc / outside-click dismisses the ENTIRE flow — not just
        // the current step. Mark the current module complete first so
        // it doesn't reappear on next visit, then end the queue.
        markComplete().catch(() => {/* non-fatal */});
        onAllDone();
      }}
    />
  );
};
