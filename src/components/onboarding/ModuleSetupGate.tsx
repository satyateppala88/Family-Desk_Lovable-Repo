import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Draft persistence (in-progress answers across dialog close / module switch)
// ---------------------------------------------------------------------------

const DRAFT_PREFIX = "familydesk:module-setup-draft";

const draftKey = (householdId: string | null | undefined, module: ModuleSetupKey) =>
  `${DRAFT_PREFIX}:${householdId ?? "_"}:${module}`;

/** Safely read a draft from localStorage. */
const readDraft = <T,>(householdId: string | null | undefined, module: ModuleSetupKey): Partial<T> | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(householdId, module));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<T>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/** Safely write a draft to localStorage. */
const writeDraft = (householdId: string | null | undefined, module: ModuleSetupKey, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(householdId, module), JSON.stringify(value));
  } catch {
    /* quota or disabled storage — silently ignore */
  }
};

/** Wipe any saved draft for this household + module. */
export const clearModuleSetupDraft = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(householdId, module));
  } catch {
    /* noop */
  }
};

/**
 * `useState` variant that hydrates from localStorage on mount and mirrors
 * every change back to it. Use inside *SetupForm components so partially
 * answered questionnaires survive dialog close, module switches, and page
 * refresh — until the user successfully saves (which calls
 * `clearModuleSetupDraft`).
 */
const useDraftState = <T extends object>(
  householdId: string | null | undefined,
  module: ModuleSetupKey,
  initial: T,
): [T, (next: T) => void] => {
  const [data, setData] = useState<T>(() => {
    const draft = readDraft<T>(householdId, module);
    return draft ? { ...initial, ...draft } : initial;
  });
  // Persist on every change. We deliberately re-write on every render where
  // `data` changes — the writes are tiny and synchronous.
  useEffect(() => {
    writeDraft(householdId, module, data);
  }, [householdId, module, data]);
  return [data, setData];
};

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
  // Form's "save" handler is registered via context so we can render the
  // footer OUTSIDE the scrollable form body.
  const saveRef = useRef<(() => void) | null>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const isSaving = isUpdating || isMarking;
  // Form-reported progress (total questions / answered count).
  const [progress, setProgress] = useState<{ total: number; answered: number }>({ total: 0, answered: 0 });
  const pct = progress.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;
  // Ref to the scrollable form container so child <Question> components can
  // scroll themselves into view when they become the active step.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const setProgressStable = useCallback(
    (p: { total: number; answered: number }) =>
      setProgress((prev) =>
        prev.total === p.total && prev.answered === p.answered ? prev : p,
      ),
    [],
  );
  const ctxValue = useMemo(
    () => ({ saveRef, skipRef, setProgress: setProgressStable, scrollContainerRef }),
    [setProgressStable],
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (dismissible) onOpenChange?.(next); }}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => { if (!dismissible || isSaving) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!dismissible || isSaving) e.preventDefault(); }}
        aria-busy={isSaving}
      >
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        {progress.total > 0 && (
          <div
            className="-mt-1"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup completion"
          >
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
              <span>Answered {progress.answered} of {progress.total}</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
        <FormActionContext.Provider value={ctxValue}>
          <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 scroll-smooth">
            <ModuleSetupForm
              module={module}
              householdId={householdId}
              preferences={preferences}
              onSubmit={async (updates) => {
                try {
                  await updatePreferences(updates);
                  await markComplete();
                // Successful save → wipe the in-progress draft.
                clearModuleSetupDraft(householdId, module);
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
              isSaving={isSaving}
            />
          </div>
        </FormActionContext.Provider>
        <DialogFooter className="flex-row justify-between sm:justify-between border-t border-border -mx-6 px-6 pt-3 mt-0 shrink-0">
          <Button
            variant="ghost"
            onClick={() => { if (!isSaving) skipRef.current?.(); }}
            disabled={isSaving}
            aria-disabled={isSaving}
          >
            Skip for now
          </Button>
          <Button
            onClick={() => { if (!isSaving) saveRef.current?.(); }}
            disabled={isSaving}
            aria-disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              "Save & continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Context that lets each *SetupForm register its current save/skip handlers
// with the parent dialog so the footer can sit OUTSIDE the scroll container.
const FormActionContext = createContext<{
  saveRef: React.MutableRefObject<(() => void) | null>;
  skipRef: React.MutableRefObject<(() => void) | null>;
  setProgress: (p: { total: number; answered: number }) => void;
  scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
} | null>(null);

/**
 * Each *SetupForm calls this with its current answered/total counts so the
 * dialog can render a step-progress indicator above the scroll area.
 */
const useReportProgress = (answered: number, total: number) => {
  const ctx = useContext(FormActionContext);
  useEffect(() => {
    ctx?.setProgress({ answered, total });
  }, [ctx, answered, total]);
};

/**
 * Wraps a single question inside a setup form. When `activeIndex` matches
 * this question's `index`, the wrapper scrolls itself into view inside the
 * dialog's scrollable container. Used to auto-advance the user to the next
 * question after they make a selection.
 */
const Question = ({
  index,
  activeIndex,
  children,
}: {
  index: number;
  activeIndex: number | null;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const ctx = useContext(FormActionContext);
  useEffect(() => {
    if (activeIndex !== index) return;
    const el = ref.current;
    const container = ctx?.scrollContainerRef.current;
    if (!el || !container) return;
    // Scroll within the dialog's container only — don't move the page.
    const elTop = el.offsetTop - container.offsetTop;
    const top = Math.max(0, elTop - 8);
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top, behavior: "smooth" });
    } else {
      // Fallback for environments without scrollTo (older browsers, jsdom).
      container.scrollTop = top;
    }
  }, [activeIndex, index, ctx]);
  return <div ref={ref}>{children}</div>;
};

/**
 * Helper hook for forms: keeps track of the most recently answered question
 * and exposes a setter that bumps `activeIndex` to the next question (or
 * stays on the last one).
 */
const useQuestionFocus = (totalQuestions: number) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const advanceFrom = (i: number) => {
    setActiveIndex(Math.min(i + 1, totalQuestions - 1));
  };
  return { activeIndex, advanceFrom };
};

// ---------------------------------------------------------------------------
// Per-module forms
// ---------------------------------------------------------------------------

interface FormProps {
  module: ModuleSetupKey;
  preferences: any;
  householdId: string | null | undefined;
  onSubmit: (updates: Record<string, unknown>) => Promise<void>;
  onSkip: () => Promise<void>;
  isSaving: boolean;
}

const ModuleSetupForm = ({ module, preferences, householdId, onSubmit, onSkip, isSaving }: FormProps) => {
  switch (module) {
    case "meals_setup":
      return <MealsSetupForm module={module} householdId={householdId} preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
    case "grocery_setup":
      return <GrocerySetupForm module={module} householdId={householdId} preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
    case "finance_setup":
      return <FinanceSetupForm module={module} householdId={householdId} preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
    case "habits_setup":
    case "tasks_setup":
      return <RoutineSetupForm module={module} householdId={householdId} preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
    case "calendar_setup":
      return <CalendarSetupForm module={module} householdId={householdId} preferences={preferences} onSubmit={onSubmit} onSkip={onSkip} isSaving={isSaving} />;
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
}) => {
  const ctx = useContext(FormActionContext);
  // Re-register on every render so the latest closure (with current state)
  // is what the dialog footer invokes.
  if (ctx) {
    ctx.saveRef.current = onSave;
    ctx.skipRef.current = onSkip;
  }
  // Clear refs on unmount so a stale handler can't fire after the dialog
  // swaps to a different module.
  useEffect(() => {
    return () => {
      if (ctx) {
        ctx.saveRef.current = null;
        ctx.skipRef.current = null;
      }
    };
  }, [ctx]);
  // Fallback: if used outside the dialog (e.g. tests), render an inline
  // footer so behaviour is preserved.
  if (!ctx) {
    return (
      <>
        <fieldset
          disabled={isSaving}
          aria-busy={isSaving}
          className="space-y-5 py-4 border-0 p-0 m-0 disabled:opacity-60 disabled:pointer-events-none transition-opacity"
        >
          {children}
        </fieldset>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => { if (!isSaving) onSkip(); }}
            disabled={isSaving}
            aria-disabled={isSaving}
          >
            Skip for now
          </Button>
          <Button
            onClick={() => { if (!isSaving) onSave(); }}
            disabled={isSaving}
            aria-disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              "Save & continue"
            )}
          </Button>
        </DialogFooter>
      </>
    );
  }
  return (
    <fieldset
      disabled={isSaving}
      aria-busy={isSaving}
      className="space-y-5 py-4 border-0 p-0 m-0 disabled:opacity-60 disabled:pointer-events-none transition-opacity"
    >
      {children}
    </fieldset>
  );
};

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

/** Count "answered" questions: a non-empty string or non-empty array. */
const countAnswered = (values: unknown[]) =>
  values.reduce<number>((n, v) => {
    if (Array.isArray(v)) return n + (v.length > 0 ? 1 : 0);
    if (typeof v === "string") return n + (v.trim().length > 0 ? 1 : 0);
    return n + (v != null ? 1 : 0);
  }, 0);

// ---- Meals --------------------------------------------------------------
const MealsSetupForm = ({ module, householdId, preferences, onSubmit, onSkip, isSaving }: FormProps) => {
  const [data, setData] = useDraftState(householdId, module, {
    diet_type: preferences?.diet_type ?? "vegetarian",
    spice_level: preferences?.spice_level ?? "medium",
    food_allergies: (preferences?.food_allergies ?? []) as string[],
    regional_cuisines: (preferences?.regional_cuisines ?? []) as string[],
    weekday_cooking_time: preferences?.weekday_cooking_time ?? "30_to_60",
  });
  useReportProgress(
    countAnswered([data.diet_type, data.spice_level, data.weekday_cooking_time, data.food_allergies, data.regional_cuisines]),
    5,
  );
  const { activeIndex, advanceFrom } = useQuestionFocus(5);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={0} activeIndex={activeIndex}>
        <Label>Diet type</Label>
        <RadioGroup value={data.diet_type} onValueChange={(v) => { setData({ ...data, diet_type: v }); advanceFrom(0); }} className="mt-2">
          {["vegetarian", "non_vegetarian", "eggetarian", "vegan", "jain"].map((t) => (
            <div key={t} className="flex items-center space-x-2">
              <RadioGroupItem value={t} id={`diet-${t}`} />
              <Label htmlFor={`diet-${t}`} className="capitalize">{t.replace("_", " ")}</Label>
            </div>
          ))}
        </RadioGroup>
      </Question>
      <Question index={1} activeIndex={activeIndex}>
        <Label>Spice level</Label>
        <RadioGroup value={data.spice_level} onValueChange={(v) => { setData({ ...data, spice_level: v }); advanceFrom(1); }} className="mt-2">
          {["mild", "medium", "spicy", "very_spicy"].map((t) => (
            <div key={t} className="flex items-center space-x-2">
              <RadioGroupItem value={t} id={`spice-${t}`} />
              <Label htmlFor={`spice-${t}`} className="capitalize">{t.replace("_", " ")}</Label>
            </div>
          ))}
        </RadioGroup>
      </Question>
      <Question index={2} activeIndex={activeIndex}>
        <Label>Weekday cooking time</Label>
        <RadioGroup value={data.weekday_cooking_time} onValueChange={(v) => { setData({ ...data, weekday_cooking_time: v }); advanceFrom(2); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="less_than_30" id="t1" /><Label htmlFor="t1">Under 30 min</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="30_to_60" id="t2" /><Label htmlFor="t2">30–60 min</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="more_than_60" id="t3" /><Label htmlFor="t3">More than 60 min</Label></div>
        </RadioGroup>
      </Question>
      <Question index={3} activeIndex={activeIndex}>
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
      </Question>
      <Question index={4} activeIndex={activeIndex}>
        <Label>Favourite regional cuisines</Label>
        <div className="space-y-2 mt-2">
          {["North Indian", "South Indian", "East Indian", "West Indian", "International"].map((c) => (
            <div key={c} className="flex items-center space-x-2">
              <Checkbox checked={data.regional_cuisines.includes(c)} onCheckedChange={() => setData({ ...data, regional_cuisines: toggle(data.regional_cuisines, c) })} />
              <Label>{c}</Label>
            </div>
          ))}
        </div>
      </Question>
    </FormShell>
  );
};

// ---- Grocery ------------------------------------------------------------
const GrocerySetupForm = ({ module, householdId, preferences, onSubmit, onSkip, isSaving }: FormProps) => {
  const [data, setData] = useDraftState(householdId, module, {
    pantry_size: preferences?.pantry_size ?? "medium",
    shopping_frequency: preferences?.shopping_frequency ?? "weekly",
    organic_preference: preferences?.organic_preference ?? "sometimes",
  });
  useReportProgress(
    countAnswered([data.pantry_size, data.shopping_frequency, data.organic_preference]),
    3,
  );
  const { activeIndex, advanceFrom } = useQuestionFocus(3);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={0} activeIndex={activeIndex}>
        <Label>Pantry size</Label>
        <RadioGroup value={data.pantry_size} onValueChange={(v) => { setData({ ...data, pantry_size: v }); advanceFrom(0); }} className="mt-2">
          {["small", "medium", "large"].map((s) => (
            <div key={s} className="flex items-center space-x-2"><RadioGroupItem value={s} id={`p-${s}`} /><Label htmlFor={`p-${s}`} className="capitalize">{s}</Label></div>
          ))}
        </RadioGroup>
      </Question>
      <Question index={1} activeIndex={activeIndex}>
        <Label>Shopping frequency</Label>
        <RadioGroup value={data.shopping_frequency} onValueChange={(v) => { setData({ ...data, shopping_frequency: v }); advanceFrom(1); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="daily" id="sf1" /><Label htmlFor="sf1">Daily</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="weekly" id="sf2" /><Label htmlFor="sf2">Weekly</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="biweekly" id="sf3" /><Label htmlFor="sf3">Every 2 weeks</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="monthly" id="sf4" /><Label htmlFor="sf4">Monthly</Label></div>
        </RadioGroup>
      </Question>
      <Question index={2} activeIndex={activeIndex}>
        <Label>Organic preference</Label>
        <RadioGroup value={data.organic_preference} onValueChange={(v) => { setData({ ...data, organic_preference: v }); advanceFrom(2); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="always" id="o1" /><Label htmlFor="o1">Always</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="sometimes" id="o2" /><Label htmlFor="o2">Sometimes</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="never" id="o3" /><Label htmlFor="o3">Never</Label></div>
        </RadioGroup>
      </Question>
    </FormShell>
  );
};

// ---- Finance ------------------------------------------------------------
const FinanceSetupForm = ({ module, householdId, preferences, onSubmit, onSkip, isSaving }: FormProps) => {
  const [data, setData] = useDraftState(householdId, module, {
    monthly_grocery_budget: preferences?.monthly_grocery_budget ?? "5000_to_10000",
    budget_consciousness: preferences?.budget_consciousness ?? "somewhat",
  });
  useReportProgress(
    countAnswered([data.monthly_grocery_budget, data.budget_consciousness]),
    2,
  );
  const { activeIndex, advanceFrom } = useQuestionFocus(2);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={0} activeIndex={activeIndex}>
        <Label>Monthly grocery budget (₹)</Label>
        <RadioGroup value={data.monthly_grocery_budget} onValueChange={(v) => { setData({ ...data, monthly_grocery_budget: v }); advanceFrom(0); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="under_5000" id="b1" /><Label htmlFor="b1">Under 5,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="5000_to_10000" id="b2" /><Label htmlFor="b2">5,000 – 10,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="10000_to_20000" id="b3" /><Label htmlFor="b3">10,000 – 20,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="over_20000" id="b4" /><Label htmlFor="b4">Over 20,000</Label></div>
        </RadioGroup>
      </Question>
      <Question index={1} activeIndex={activeIndex}>
        <Label>How strict should we be on budget?</Label>
        <RadioGroup value={data.budget_consciousness} onValueChange={(v) => { setData({ ...data, budget_consciousness: v }); advanceFrom(1); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="very" id="bc1" /><Label htmlFor="bc1">Very — keep us on track</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="somewhat" id="bc2" /><Label htmlFor="bc2">Somewhat</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="not_really" id="bc3" /><Label htmlFor="bc3">Not really</Label></div>
        </RadioGroup>
      </Question>
    </FormShell>
  );
};

// ---- Routine (Habits / Tasks) ------------------------------------------
const RoutineSetupForm = ({ module, householdId, preferences, onSubmit, onSkip, isSaving }: FormProps) => {
  const [data, setData] = useDraftState(householdId, module, {
    preferred_task_time: preferences?.preferred_task_time ?? "evening",
    household_concerns: (preferences?.household_concerns ?? []) as string[],
  });
  useReportProgress(
    countAnswered([data.preferred_task_time, data.household_concerns]),
    2,
  );
  const { activeIndex, advanceFrom } = useQuestionFocus(2);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={0} activeIndex={activeIndex}>
        <Label>Preferred time of day</Label>
        <RadioGroup value={data.preferred_task_time} onValueChange={(v) => { setData({ ...data, preferred_task_time: v }); advanceFrom(0); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="morning" id="r1" /><Label htmlFor="r1">Morning</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="afternoon" id="r2" /><Label htmlFor="r2">Afternoon</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="evening" id="r3" /><Label htmlFor="r3">Evening</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="night" id="r4" /><Label htmlFor="r4">Night</Label></div>
        </RadioGroup>
      </Question>
      <Question index={1} activeIndex={activeIndex}>
        <Label>What matters most to you?</Label>
        <div className="space-y-2 mt-2">
          {["Health & fitness", "Family time", "Productivity", "Learning", "Mindfulness"].map((c) => (
            <div key={c} className="flex items-center space-x-2">
              <Checkbox checked={data.household_concerns.includes(c)} onCheckedChange={() => setData({ ...data, household_concerns: toggle(data.household_concerns, c) })} />
              <Label>{c}</Label>
            </div>
          ))}
        </div>
      </Question>
    </FormShell>
  );
};

// ---- Calendar -----------------------------------------------------------
const CalendarSetupForm = ({ module, householdId, preferences, onSubmit, onSkip, isSaving }: FormProps) => {
  const [data, setData] = useDraftState(householdId, module, {
    work_schedule: preferences?.work_schedule ?? "both_working",
    festival_importance: preferences?.festival_importance ?? "somewhat",
  });
  useReportProgress(
    countAnswered([data.work_schedule, data.festival_importance]),
    2,
  );
  const { activeIndex, advanceFrom } = useQuestionFocus(2);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={0} activeIndex={activeIndex}>
        <Label>Household work schedule</Label>
        <RadioGroup value={data.work_schedule} onValueChange={(v) => { setData({ ...data, work_schedule: v }); advanceFrom(0); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="both_working" id="w1" /><Label htmlFor="w1">Both/all adults working</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="one_working" id="w2" /><Label htmlFor="w2">One adult working</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="flexible" id="w3" /><Label htmlFor="w3">Flexible / WFH</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="retired" id="w4" /><Label htmlFor="w4">Retired</Label></div>
        </RadioGroup>
      </Question>
      <Question index={1} activeIndex={activeIndex}>
        <Label>How important are festivals?</Label>
        <RadioGroup value={data.festival_importance} onValueChange={(v) => { setData({ ...data, festival_importance: v }); advanceFrom(1); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="very" id="f1" /><Label htmlFor="f1">Very important</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="somewhat" id="f2" /><Label htmlFor="f2">Somewhat</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="not_really" id="f3" /><Label htmlFor="f3">Not really</Label></div>
        </RadioGroup>
      </Question>
    </FormShell>
  );
};
