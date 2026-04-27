import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import { useModuleSetup } from "@/hooks/useModuleSetup";
import { MODULE_SETUP_META, type ModuleSetupKey } from "@/lib/moduleSetup";
import { toast } from "sonner";

interface ModuleSetupGateProps {
  module: ModuleSetupKey;
  children: ReactNode;
}

/**
 * Wraps a module page. When the per-module first-run setup hasn't been
 * completed, renders a non-dismissible dialog asking for that module's
 * inputs. Saves to household_preferences and marks the setup complete.
 */
export const ModuleSetupGate = ({ module, children }: ModuleSetupGateProps) => {
  const { needsSetup, markComplete, isMarking } = useModuleSetup(module);
  const { householdId } = useHousehold();
  const { preferences, updatePreferences, isUpdating } = useHouseholdPreferences(householdId);
  const meta = MODULE_SETUP_META[module];

  if (!needsSetup) return <>{children}</>;

  return (
    <>
      {children}
      <ModuleSetupDialog module={module} open={true} dismissible={false} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Standalone dialog (used both by the gate and by "trigger on enable" flows)
// ---------------------------------------------------------------------------

interface ModuleSetupDialogProps {
  module: ModuleSetupKey;
  open: boolean;
  dismissible?: boolean;
  /** Fired after Save & continue completes successfully. */
  onComplete?: () => void;
  /** Fired after Skip for now completes. */
  onSkip?: () => void;
  /** Allows external control of the open state when `dismissible` is true. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Stand-alone version of the per-module setup dialog. Use this when you
 * want to trigger the flow immediately on a user action (e.g. just
 * enabled a product from Settings) instead of gating a page render.
 */
export const ModuleSetupDialog = ({
  module,
  open,
  dismissible = true,
  onComplete,
  onSkip,
  onOpenChange,
}: ModuleSetupDialogProps) => {
  const { markComplete, isMarking } = useModuleSetup(module);
  const { householdId } = useHousehold();
  const { preferences, updatePreferences, isUpdating } = useHouseholdPreferences(householdId);
  const meta = MODULE_SETUP_META[module];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (dismissible) onOpenChange?.(next); }}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => { if (!dismissible) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!dismissible) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <ModuleSetupForm
            module={module}
            preferences={preferences}
            onSubmit={async (updates) => {
              try {
                await updatePreferences(updates);
                await markComplete();
                toast.success("Setup saved");
                onComplete?.();
              } catch (err: any) {
                toast.error(err.message ?? "Failed to save setup");
              }
            }}
            onSkip={async () => {
              // Skip does NOT mark complete when dismissible (so the gate
              // can re-prompt on first visit). When non-dismissible (legacy
              // gate), keep the prior behavior to avoid trapping users.
              try {
                if (!dismissible) await markComplete();
                onSkip?.();
              } catch (err: any) {
                toast.error(err.message ?? "Failed");
              }
            }}
            isSaving={isUpdating || isMarking}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Per-module forms
// ---------------------------------------------------------------------------

interface FormProps {
  module: ModuleSetupKey;
  preferences: any;
  onSubmit: (updates: Record<string, unknown>) => Promise<void>;
  onSkip: () => Promise<void>;
  isSaving: boolean;
}

const ModuleSetupForm = ({ module, preferences, onSubmit, onSkip, isSaving }: FormProps) => {
  switch (module) {
    case "meals_setup":
      return <MealsSetupForm preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
    case "grocery_setup":
      return <GrocerySetupForm preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
    case "finance_setup":
      return <FinanceSetupForm preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
    case "habits_setup":
    case "tasks_setup":
      return <RoutineSetupForm preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
    case "calendar_setup":
      return <CalendarSetupForm preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
  }
};

const FormShell = ({
  children,
  onSave,
  onSkip,
  isSaving,
}: {
  children: ReactNode;
  onSave: () => void;
  onSkip: () => void;
  isSaving: boolean;
}) => (
  <>
    <div className="space-y-5 py-4">{children}</div>
    <DialogFooter className="flex-row justify-between sm:justify-between sticky bottom-0 bg-background border-t border-border -mx-6 px-6 py-3 mt-2">
      <Button variant="ghost" onClick={onSkip} disabled={isSaving}>
        Skip for now
      </Button>
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save & continue"}
      </Button>
    </DialogFooter>
  </>
);

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

// ---- Meals --------------------------------------------------------------
const MealsSetupForm = ({ preferences, onSubmit, onSkip, isSaving }: Omit<FormProps, "module">) => {
  const [data, setData] = useState({
    diet_type: preferences?.diet_type ?? "vegetarian",
    spice_level: preferences?.spice_level ?? "medium",
    food_allergies: (preferences?.food_allergies ?? []) as string[],
    regional_cuisines: (preferences?.regional_cuisines ?? []) as string[],
    weekday_cooking_time: preferences?.weekday_cooking_time ?? "30_to_60",
  });
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <div>
        <Label>Diet type</Label>
        <RadioGroup value={data.diet_type} onValueChange={(v) => setData({ ...data, diet_type: v })} className="mt-2">
          {["vegetarian", "non_vegetarian", "eggetarian", "vegan", "jain"].map((t) => (
            <div key={t} className="flex items-center space-x-2">
              <RadioGroupItem value={t} id={`diet-${t}`} />
              <Label htmlFor={`diet-${t}`} className="capitalize">{t.replace("_", " ")}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label>Spice level</Label>
        <RadioGroup value={data.spice_level} onValueChange={(v) => setData({ ...data, spice_level: v })} className="mt-2">
          {["mild", "medium", "spicy", "very_spicy"].map((t) => (
            <div key={t} className="flex items-center space-x-2">
              <RadioGroupItem value={t} id={`spice-${t}`} />
              <Label htmlFor={`spice-${t}`} className="capitalize">{t.replace("_", " ")}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label>Weekday cooking time</Label>
        <RadioGroup value={data.weekday_cooking_time} onValueChange={(v) => setData({ ...data, weekday_cooking_time: v })} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="less_than_30" id="t1" /><Label htmlFor="t1">Under 30 min</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="30_to_60" id="t2" /><Label htmlFor="t2">30–60 min</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="more_than_60" id="t3" /><Label htmlFor="t3">More than 60 min</Label></div>
        </RadioGroup>
      </div>
      <div>
        <Label>Food allergies</Label>
        <div className="space-y-2 mt-2">
          {["None", "Dairy", "Nuts", "Gluten", "Seafood", "Eggs", "Soy"].map((a) => {
            const isNone = a === "None";
            const noneSelected = data.food_allergies.includes("None");
            const checked = data.food_allergies.includes(a);
            return (
              <div key={a} className="flex items-center space-x-2">
                <Checkbox
                  checked={checked}
                  disabled={!isNone && noneSelected}
                  onCheckedChange={() => {
                    if (isNone) setData({ ...data, food_allergies: checked ? [] : ["None"] });
                    else setData({ ...data, food_allergies: toggle(data.food_allergies.filter((x) => x !== "None"), a) });
                  }}
                />
                <Label className={!isNone && noneSelected ? "text-muted-foreground" : ""}>{a}</Label>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Favourite regional cuisines</Label>
        <div className="space-y-2 mt-2">
          {["North Indian", "South Indian", "East Indian", "West Indian", "International"].map((c) => (
            <div key={c} className="flex items-center space-x-2">
              <Checkbox checked={data.regional_cuisines.includes(c)} onCheckedChange={() => setData({ ...data, regional_cuisines: toggle(data.regional_cuisines, c) })} />
              <Label>{c}</Label>
            </div>
          ))}
        </div>
      </div>
    </FormShell>
  );
};

// ---- Grocery ------------------------------------------------------------
const GrocerySetupForm = ({ preferences, onSubmit, onSkip, isSaving }: Omit<FormProps, "module">) => {
  const [data, setData] = useState({
    pantry_size: preferences?.pantry_size ?? "medium",
    shopping_frequency: preferences?.shopping_frequency ?? "weekly",
    organic_preference: preferences?.organic_preference ?? "sometimes",
  });
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <div>
        <Label>Pantry size</Label>
        <RadioGroup value={data.pantry_size} onValueChange={(v) => setData({ ...data, pantry_size: v })} className="mt-2">
          {["small", "medium", "large"].map((s) => (
            <div key={s} className="flex items-center space-x-2"><RadioGroupItem value={s} id={`p-${s}`} /><Label htmlFor={`p-${s}`} className="capitalize">{s}</Label></div>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label>Shopping frequency</Label>
        <RadioGroup value={data.shopping_frequency} onValueChange={(v) => setData({ ...data, shopping_frequency: v })} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="daily" id="sf1" /><Label htmlFor="sf1">Daily</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="weekly" id="sf2" /><Label htmlFor="sf2">Weekly</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="biweekly" id="sf3" /><Label htmlFor="sf3">Every 2 weeks</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="monthly" id="sf4" /><Label htmlFor="sf4">Monthly</Label></div>
        </RadioGroup>
      </div>
      <div>
        <Label>Organic preference</Label>
        <RadioGroup value={data.organic_preference} onValueChange={(v) => setData({ ...data, organic_preference: v })} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="always" id="o1" /><Label htmlFor="o1">Always</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="sometimes" id="o2" /><Label htmlFor="o2">Sometimes</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="never" id="o3" /><Label htmlFor="o3">Never</Label></div>
        </RadioGroup>
      </div>
    </FormShell>
  );
};

// ---- Finance ------------------------------------------------------------
const FinanceSetupForm = ({ preferences, onSubmit, onSkip, isSaving }: Omit<FormProps, "module">) => {
  const [data, setData] = useState({
    monthly_grocery_budget: preferences?.monthly_grocery_budget ?? "5000_to_10000",
    budget_consciousness: preferences?.budget_consciousness ?? "somewhat",
  });
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <div>
        <Label>Monthly grocery budget (₹)</Label>
        <RadioGroup value={data.monthly_grocery_budget} onValueChange={(v) => setData({ ...data, monthly_grocery_budget: v })} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="under_5000" id="b1" /><Label htmlFor="b1">Under 5,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="5000_to_10000" id="b2" /><Label htmlFor="b2">5,000 – 10,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="10000_to_20000" id="b3" /><Label htmlFor="b3">10,000 – 20,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="over_20000" id="b4" /><Label htmlFor="b4">Over 20,000</Label></div>
        </RadioGroup>
      </div>
      <div>
        <Label>How strict should we be on budget?</Label>
        <RadioGroup value={data.budget_consciousness} onValueChange={(v) => setData({ ...data, budget_consciousness: v })} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="very" id="bc1" /><Label htmlFor="bc1">Very — keep us on track</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="somewhat" id="bc2" /><Label htmlFor="bc2">Somewhat</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="not_really" id="bc3" /><Label htmlFor="bc3">Not really</Label></div>
        </RadioGroup>
      </div>
    </FormShell>
  );
};

// ---- Routine (Habits / Tasks) ------------------------------------------
const RoutineSetupForm = ({ preferences, onSubmit, onSkip, isSaving }: Omit<FormProps, "module">) => {
  const [data, setData] = useState({
    preferred_task_time: preferences?.preferred_task_time ?? "evening",
    household_concerns: (preferences?.household_concerns ?? []) as string[],
  });
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <div>
        <Label>Preferred time of day</Label>
        <RadioGroup value={data.preferred_task_time} onValueChange={(v) => setData({ ...data, preferred_task_time: v })} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="morning" id="r1" /><Label htmlFor="r1">Morning</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="afternoon" id="r2" /><Label htmlFor="r2">Afternoon</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="evening" id="r3" /><Label htmlFor="r3">Evening</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="night" id="r4" /><Label htmlFor="r4">Night</Label></div>
        </RadioGroup>
      </div>
      <div>
        <Label>What matters most to you?</Label>
        <div className="space-y-2 mt-2">
          {["Health & fitness", "Family time", "Productivity", "Learning", "Mindfulness"].map((c) => (
            <div key={c} className="flex items-center space-x-2">
              <Checkbox checked={data.household_concerns.includes(c)} onCheckedChange={() => setData({ ...data, household_concerns: toggle(data.household_concerns, c) })} />
              <Label>{c}</Label>
            </div>
          ))}
        </div>
      </div>
    </FormShell>
  );
};

// ---- Calendar -----------------------------------------------------------
const CalendarSetupForm = ({ preferences, onSubmit, onSkip, isSaving }: Omit<FormProps, "module">) => {
  const [data, setData] = useState({
    work_schedule: preferences?.work_schedule ?? "both_working",
    festival_importance: preferences?.festival_importance ?? "somewhat",
  });
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <div>
        <Label>Household work schedule</Label>
        <RadioGroup value={data.work_schedule} onValueChange={(v) => setData({ ...data, work_schedule: v })} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="both_working" id="w1" /><Label htmlFor="w1">Both/all adults working</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="one_working" id="w2" /><Label htmlFor="w2">One adult working</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="flexible" id="w3" /><Label htmlFor="w3">Flexible / WFH</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="retired" id="w4" /><Label htmlFor="w4">Retired</Label></div>
        </RadioGroup>
      </div>
      <div>
        <Label>How important are festivals?</Label>
        <RadioGroup value={data.festival_importance} onValueChange={(v) => setData({ ...data, festival_importance: v })} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="very" id="f1" /><Label htmlFor="f1">Very important</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="somewhat" id="f2" /><Label htmlFor="f2">Somewhat</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="not_really" id="f3" /><Label htmlFor="f3">Not really</Label></div>
        </RadioGroup>
      </div>
    </FormShell>
  );
};
