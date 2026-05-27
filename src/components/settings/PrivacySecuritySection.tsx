import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import {
  clearPin,
  getIdleTimeout,
  IdleTimeout,
  isPinEnabled,
  setIdleTimeout,
  setPin,
  verifyPin,
} from "@/lib/financePin";
import { PinKeypad } from "@/components/finance/PinKeypad";
import { toast } from "sonner";

type PinFlow = null | "set" | "change" | "disable";
type SetStep = "new" | "confirm";
type ChangeStep = "current" | "new" | "confirm";

export const PrivacySecuritySection = () => {
  const { isPrivate, togglePrivacy, setPrivacy } = usePrivacyMode();
  const [pinEnabled, setPinEnabled] = useState<boolean>(() => isPinEnabled());
  const [idle, setIdle] = useState<IdleTimeout>(() => getIdleTimeout());
  const [flow, setFlow] = useState<PinFlow>(null);

  // Set / Change flow state
  const [setStep, setSetStep] = useState<SetStep>("new");
  const [changeStep, setChangeStep] = useState<ChangeStep>("current");
  const [firstPin, setFirstPin] = useState<string>("");
  const [resetSignal, setResetSignal] = useState(0);
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!flow) {
      setSetStep("new");
      setChangeStep("current");
      setFirstPin("");
      setErrorMsg(null);
    }
  }, [flow]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
    setResetSignal((n) => n + 1);
  };

  const finishSet = async (pin: string) => {
    try {
      await setPin(pin);
      setPinEnabled(true);
      setFlow(null);
      toast.success("Finance PIN saved", {
        description: "Your new PIN is now active on all your devices.",
      });
    } catch (e) {
      setErrorMsg("Couldn't save PIN. Please try again.");
      triggerShake();
    }
  };

  const handlePinComplete = async (pin: string) => {
    setErrorMsg(null);
    if (flow === "set") {
      if (setStep === "new") {
        setFirstPin(pin);
        setSetStep("confirm");
        setResetSignal((n) => n + 1);
      } else {
        if (pin === firstPin) {
          await finishSet(pin);
        } else {
          setErrorMsg("PINs do not match");
          triggerShake();
          setSetStep("new");
          setFirstPin("");
        }
      }
      return;
    }

    if (flow === "change") {
      if (changeStep === "current") {
        const ok = await verifyPin(pin);
        if (!ok) {
          setErrorMsg("Incorrect PIN");
          triggerShake();
          return;
        }
        setChangeStep("new");
        setResetSignal((n) => n + 1);
      } else if (changeStep === "new") {
        setFirstPin(pin);
        setChangeStep("confirm");
        setResetSignal((n) => n + 1);
      } else {
        if (pin === firstPin) {
          await finishSet(pin);
        } else {
          setErrorMsg("PINs do not match");
          triggerShake();
          setChangeStep("new");
          setFirstPin("");
        }
      }
      return;
    }

    if (flow === "disable") {
      const ok = await verifyPin(pin);
      if (!ok) {
        setErrorMsg("Incorrect PIN");
        triggerShake();
        return;
      }
      try {
        await clearPin();
        setPinEnabled(false);
        setFlow(null);
        toast.success("Finance PIN disabled");
      } catch {
        setErrorMsg("Couldn't disable PIN. Please try again.");
        triggerShake();
      }
    }
  };

  const handlePinToggle = (next: boolean) => {
    if (next) setFlow("set");
    else setFlow("disable");
  };

  const handleIdleChange = (value: string) => {
    const v: IdleTimeout = value === "never" ? "never" : (Number(value) as IdleTimeout);
    setIdle(v);
    setIdleTimeout(v);
  };

  const flowTitle = () => {
    if (flow === "set") return setStep === "new" ? "Set a new 4-digit PIN" : "Confirm your PIN";
    if (flow === "change") {
      if (changeStep === "current") return "Enter your current PIN";
      if (changeStep === "new") return "Enter a new 4-digit PIN";
      return "Confirm your new PIN";
    }
    if (flow === "disable") return "Enter your PIN to disable lock";
    return "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Privacy & Security</CardTitle>
        <CardDescription>Protect financial data on shared devices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Row 1 — Privacy Mode */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Privacy Mode</p>
            <p className="text-xs text-muted-foreground">Blur financial data across the app.</p>
          </div>
          <Switch checked={isPrivate} onCheckedChange={(v) => setPrivacy(!!v)} />
        </div>

        {/* Row 2 — Finance PIN */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Finance PIN Lock</p>
            <p className="text-xs text-muted-foreground">Require a PIN to open the Finance module.</p>
            {pinEnabled && (
              <button
                type="button"
                onClick={() => setFlow("change")}
                className="mt-1 text-xs text-primary underline-offset-4 hover:underline"
              >
                Change PIN
              </button>
            )}
          </div>
          <Switch checked={pinEnabled} onCheckedChange={handlePinToggle} />
        </div>

        {/* Row 3 — Auto-lock */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Auto-lock after</p>
            <p className="text-xs text-muted-foreground">Blur data after inactivity.</p>
          </div>
          <Select value={String(idle)} onValueChange={handleIdleChange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 minute</SelectItem>
              <SelectItem value="2">2 minutes</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={!!flow} onOpenChange={(open) => { if (!open) setFlow(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{flowTitle()}</DialogTitle>
              <DialogDescription>
                Your PIN syncs securely across all your devices.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <PinKeypad onComplete={handlePinComplete} resetSignal={resetSignal} shake={shake} />
              <div className="h-5 mt-3 text-center text-sm text-destructive" aria-live="polite">{errorMsg}</div>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" onClick={() => setFlow(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};