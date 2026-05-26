import { useCallback, useEffect, useState } from "react";
import { FamilyDeskLogo } from "@/components/brand/FamilyDeskLogo";
import { PinKeypad } from "./PinKeypad";
import { isPinEnabled, isUnlocked, markUnlocked, verifyPin } from "@/lib/financePin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const FinancePinGate = ({ children }: { children: React.ReactNode }) => {
  const enabled = isPinEnabled();
  const [unlocked, setUnlocked] = useState<boolean>(() => !enabled || isUnlocked());
  const [error, setError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [shake, setShake] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Re-evaluate whenever the route children change (e.g. after idle auto-lock)
  useEffect(() => {
    const tick = () => setUnlocked(!isPinEnabled() || isUnlocked());
    tick();
    const onVis = () => tick();
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("familydesk:finance-locked", tick);
    return () => {
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("familydesk:finance-locked", tick);
    };
  }, []);

  const onComplete = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) {
      markUnlocked();
      setError(null);
      setUnlocked(true);
    } else {
      setError("Incorrect PIN");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setResetSignal((n) => n + 1);
    }
  }, []);

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <FamilyDeskLogo size="lg" showTagline={false} />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Enter PIN to access Finance</h1>
      <p className="text-sm text-muted-foreground mb-8">Your financial data is locked on this device.</p>
      <PinKeypad onComplete={onComplete} resetSignal={resetSignal} shake={shake} />
      <div className="h-6 mt-4 text-sm text-destructive" aria-live="polite">{error}</div>
      <button
        type="button"
        onClick={() => setForgotOpen(true)}
        className="mt-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Forgot PIN?
      </button>
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your PIN</DialogTitle>
            <DialogDescription>
              To reset your PIN, go to Settings → Privacy & Security on a trusted device where you're signed in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setForgotOpen(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};