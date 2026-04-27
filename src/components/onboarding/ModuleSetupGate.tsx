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
import { Loader2, AlertCircle, RotateCcw, CheckCircle2, History } from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Also clear the persisted "touched" set so the next visit starts fresh.
  clearTouched(householdId, module);
  // And the persisted "active question" pointer.
  clearActiveQuestion(householdId, module);
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

// ---------------------------------------------------------------------------
// Touched-question persistence
// ---------------------------------------------------------------------------
//
// Tracks which question keys the user has explicitly touched in this
// questionnaire. The set is persisted alongside the draft answers so that
// after a refresh / reopen, the progress indicator restores to the exact
// same "X of N answered" state the user last saw — instead of either
// jumping back to 0 or counting prefilled defaults as answered.

const TOUCHED_PREFIX = "familydesk:module-setup-touched";
const touchedKey = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
) => `${TOUCHED_PREFIX}:${householdId ?? "_"}:${module}`;

const readTouched = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(touchedKey(householdId, module));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const writeTouched = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
  keys: string[],
) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(touchedKey(householdId, module), JSON.stringify(keys));
  } catch {
    /* noop */
  }
};

function clearTouched(
  householdId: string | null | undefined,
  module: ModuleSetupKey,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(touchedKey(householdId, module));
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// Active-question (last-focused step) persistence
// ---------------------------------------------------------------------------
//
// We persist the *key* of the last auto-focused question (not the numeric
// index) so it survives applicability changes — if the previously active
// question is filtered out next time, we transparently fall back to the
// nearest still-applicable step.

const ACTIVE_PREFIX = "familydesk:module-setup-active";
const activeKeyStorageKey = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
) => `${ACTIVE_PREFIX}:${householdId ?? "_"}:${module}`;

const readActiveQuestion = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(activeKeyStorageKey(householdId, module));
  } catch {
    return null;
  }
};

const writeActiveQuestion = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
  key: string,
) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(activeKeyStorageKey(householdId, module), key);
  } catch {
    /* noop */
  }
};

function clearActiveQuestion(
  householdId: string | null | undefined,
  module: ModuleSetupKey,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(activeKeyStorageKey(householdId, module));
  } catch {
    /* noop */
  }
}

/**
 * Returns a stable, persisted set of touched question keys plus a `mark`
 * helper to record that a question was answered. Forms call `mark("diet")`
 * inside their onValueChange handlers so progress reflects user activity,
 * not prefilled defaults — and survives refresh / reopen.
 *
 * `applicableKeys` lets the caller scope the returned `count` to only the
 * questions that are currently applicable for this module — supporting
 * dynamic per-module totals where some questions can be skipped based on
 * earlier answers.
 */
const useTouchedQuestions = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
  applicableKeys?: readonly string[],
) => {
  const [touched, setTouched] = useState<Set<string>>(
    () => new Set(readTouched(householdId, module)),
  );
  useEffect(() => {
    writeTouched(householdId, module, Array.from(touched));
  }, [householdId, module, touched]);
  const mark = useCallback((key: string) => {
    setTouched((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);
  // When an applicability filter is provided, only count touches against
  // questions that are currently applicable. This keeps "Step X of Y"
  // honest when conditional questions disappear after the user touched them.
  const count = applicableKeys
    ? applicableKeys.reduce((n, k) => (touched.has(k) ? n + 1 : n), 0)
    : touched.size;
  return { mark, count };
};

/**
 * Each *SetupForm declares its questions as `{ key, applicable }` entries.
 * The progress bar's TOTAL comes from the number of applicable entries,
 * the ANSWERED count from how many of those have been touched, and the
 * `<Question index>` ordering uses the applicable subset's positions —
 * so "Step X of Y" stays accurate even when conditional questions are
 * filtered out.
 */
type FormQuestion = { key: string; applicable: boolean };

/**
 * Reduces a form's question definitions into the bookkeeping a form needs
 * to drive a dynamic progress bar:
 *   - `applicableKeys`: ordered list of currently-applicable question keys.
 *   - `total`: number of applicable questions (= progress bar denominator).
 *   - `indexOf(key)`: position within the applicable subset (or -1) — used
 *     by `<Question>` to scroll-into-view + by `advanceFrom` to step
 *     forward by a stable key instead of a hardcoded numeric index.
 */
const useApplicableQuestions = (questions: readonly FormQuestion[]) => {
  return useMemo(() => {
    const applicable = questions.filter((q) => q.applicable);
    const applicableKeys = applicable.map((q) => q.key);
    const positions = new Map(applicableKeys.map((k, i) => [k, i] as const));
    return {
      applicableKeys,
      total: applicable.length,
      indexOf: (key: string) => positions.get(key) ?? -1,
    };
  }, [questions]);
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
  const { markComplete, isMarking, isComplete } = useModuleSetup(module);
  const { householdId } = useHousehold();
  const { preferences, updatePreferences, isUpdating } = useHouseholdPreferences(householdId);
  const meta = MODULE_SETUP_META[module];
  // Form's "save" handler is registered via context so we can render the
  // footer OUTSIDE the scrollable form body.
  const saveRef = useRef<(() => void) | null>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const isSaving = isUpdating || isMarking;
  // Inline save error. We surface this in the dialog body (in addition to
  // the toast) so the user can retry without dismissing anything and
  // without losing their selections — the form's draft state is preserved
  // automatically because we only clear the draft on a successful save.
  const [saveError, setSaveError] = useState<string | null>(null);

  // Synchronous in-flight latch — flips true immediately on click and
  // resets when the save promise settles. We need this *in addition* to
  // `isSaving` (which is driven by react-query state) because there is a
  // microtask gap between the click and the next render where rapid
  // clicks would otherwise all pass the `!isSaving` check and queue
  // multiple identical save requests. Using a ref makes the guard fire
  // synchronously within the same tick.
  const inFlightRef = useRef(false);
  // UI-only retry state so the inline "Try again" button can show its
  // busy label the moment it's clicked — without waiting for the
  // react-query mutation to mark itself as updating on the next render.
  const [isRetrying, setIsRetrying] = useState(false);
  const retryDisabled = isSaving || isRetrying;

  // Single chokepoint for triggering the form's save handler. Both the
  // footer Save button and the inline retry button funnel through here
  // so the same in-flight latch protects both entry points.
  const triggerSave = useCallback(() => {
    if (inFlightRef.current || isSaving) return;
    const fn = saveRef.current;
    if (!fn) return;
    inFlightRef.current = true;
    try {
      fn();
    } finally {
      // The form's onSubmit owns the async lifecycle — we release the
      // latch on the next macrotask so any synchronous follow-up clicks
      // in the same event loop tick are still swallowed, but the latch
      // doesn't outlive a synchronously-thrown error.
      setTimeout(() => { inFlightRef.current = false; }, 0);
    }
  }, [isSaving]);

  // Detect — exactly once, at mount — whether the user is resuming an
  // in-progress questionnaire. We snapshot this so the message doesn't
  // disappear the moment they touch a new question (which would mutate
  // the underlying draft store) and doesn't flicker while typing.
  const [restoredFromDraft] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const draft = readDraft<Record<string, unknown>>(householdId, module);
    const touched = readTouched(householdId, module);
    return (!!draft && Object.keys(draft).length > 0) || touched.length > 0;
  });

  // While saving we must prevent ANY exit path so a partial write can't
  // leave the household in a half-configured state:
  //   • Dialog X button       → disabled via aria-disabled + pointer-events
  //   • Esc / outside click   → already preempted in onEscapeKeyDown / onPointerDownOutside
  //   • Browser back button   → push a history entry on mount, intercept popstate
  //   • Tab close / reload    → beforeunload prompt
  useEffect(() => {
    if (!isSaving) return;
    // Mark a sentinel history entry we can detect & re-push if the user
    // hits the back button mid-save.
    const SENTINEL = { __familydeskSavingGuard: true } as const;
    try { window.history.pushState(SENTINEL, ""); } catch { /* ignore */ }

    const onPop = (_e: PopStateEvent) => {
      // Re-push to keep the user on this page until the save resolves.
      try { window.history.pushState(SENTINEL, ""); } catch { /* ignore */ }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for Chrome to actually show the prompt.
      e.returnValue = "";
      return "";
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isSaving]);
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
        className={cn(
          "sm:max-w-md max-h-[90vh] flex flex-col",
          // Visually + functionally disable the built-in close (X) while
          // a write is in flight. The shared DialogContent always renders
          // a Radix Close button in the top-right; we can't remove it
          // without forking the primitive, so we neutralize it via a
          // descendant selector. `pointer-events-none` blocks clicks,
          // `opacity` shows it as disabled, and `aria-disabled` is also
          // applied below for assistive tech.
          isSaving && "[&>button[aria-label='Close'],&_>_button.absolute.right-4.top-4]:pointer-events-none [&>button[aria-label='Close'],&_>_button.absolute.right-4.top-4]:opacity-40",
        )}
        onPointerDownOutside={(e) => { if (!dismissible || isSaving) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!dismissible || isSaving) e.preventDefault(); }}
        // Capture-phase guard: even if Radix or a future change wires the
        // X to a click handler that bypasses onOpenChange, we still
        // swallow clicks anywhere on the close button while saving.
        onClickCapture={(e) => {
          if (!isSaving) return;
          const target = e.target as HTMLElement | null;
          const closeBtn = target?.closest?.("button");
          if (closeBtn && closeBtn.querySelector('span.sr-only')?.textContent === "Close") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        aria-busy={isSaving}
      >
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        {progress.total > 0 && (
          <div className="-mt-1">
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Setup completion"
              aria-valuetext={`${progress.answered} of ${progress.total} answered, ${pct}% complete`}
              tabIndex={0}
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            {/*
              Status line — explains, in plain language, where the
              currently-shown progress is coming from:
                • "Setup complete" if this module is already marked done
                  (any answers the user changes here will overwrite their
                  saved profile).
                • "Restored your in-progress answers" if a draft was
                  hydrated from a previous visit (so progress > 0 isn't
                  confusing on a fresh dialog open).
              We deliberately render NOTHING for a brand-new questionnaire
              with no draft and no completion — to avoid noise.
            */}
            {isComplete ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Setup complete for this module — any changes you make here will
                  overwrite your saved answers.
                </span>
              </p>
            ) : restoredFromDraft ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <History className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Restored your in-progress answers from your last visit — pick up
                  where you left off.
                </span>
              </p>
            ) : null}
            {/*
              Screen-reader-only live region. We announce progress changes
              here (instead of on the progressbar itself) because aria-live
              on role=progressbar is inconsistently supported across SRs.
              Polite + atomic so each update reads as one phrase without
              interrupting the user's current action.
            */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {`Setup ${pct}% complete. ${progress.answered} of ${progress.total} questions answered.${
                isComplete
                  ? " This module is already set up; changes will overwrite saved answers."
                  : restoredFromDraft
                    ? " In-progress answers restored from your last visit."
                    : ""
              }`}
            </div>
            {progress.answered > 0 && (
              <p className="mt-1.5 text-[11px] text-muted-foreground/80 leading-snug">
                Tip: tap{" "}
                <button
                  type="button"
                  onClick={() => { if (!isSaving) saveRef.current?.(); }}
                  disabled={isSaving}
                  className="font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Save &amp; continue
                </button>{" "}
                anytime — your progress is kept if you switch modules.
              </p>
            )}
          </div>
        )}
        <FormActionContext.Provider value={ctxValue}>
          {saveError && (
            <div
              role="alert"
              aria-live="assertive"
              className="mx-0 mt-1 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug">Couldn’t save your setup</p>
                <p className="text-xs opacity-90 leading-snug break-words">{saveError}</p>
                <p className="mt-1 text-[11px] opacity-80 leading-snug">
                  Your selections are kept — try again when you’re ready.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { if (!isSaving) saveRef.current?.(); }}
                disabled={isSaving}
                aria-disabled={isSaving}
                className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Try again
                  </>
                )}
              </Button>
            </div>
          )}
          <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 scroll-smooth">
            <ModuleSetupForm
              module={module}
              householdId={householdId}
              preferences={preferences}
              onSubmit={async (updates) => {
                try {
                  setSaveError(null);
                  await updatePreferences(updates);
                  await markComplete();
                // Successful save → wipe the in-progress draft.
                clearModuleSetupDraft(householdId, module);
                  toast.success("Setup saved");
                  onComplete?.();
                } catch (err: any) {
                  const msg = err?.message ?? "Failed to save setup";
                  setSaveError(msg);
                  toast.error(msg);
                } finally {
                  // Always release the retry-button busy state, whether
                  // the save succeeded or failed. (`isSaving` from
                  // react-query also flips back here, so the footer
                  // Save button re-enables on the same render.)
                  setIsRetrying(false);
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
    // Inapplicable questions get index === -1 from `indexOf(key)`.
    // The hook order must remain stable across renders, so we keep the
    // useEffect/useContext calls above this guard and bail out here
    // without scheduling any scroll work.
    if (index < 0) return;
    if (activeIndex !== index) return;
    const el = ref.current;
    const container = ctx?.scrollContainerRef.current;
    if (!el || !container) return;
    // Scroll within the dialog's container only — don't move the page.
    //
    // Anti-jitter: only scroll when the target question is NOT already
    // comfortably inside the visible viewport. A small `MARGIN` keeps a
    // little breathing room at the top/bottom edges so we don't bother
    // scrolling for questions that are already in view, and don't
    // re-trigger smooth-scroll animations when the user is mid-interaction.
    const MARGIN = 8;
    const elTop = el.offsetTop - container.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    const fullyVisible = elTop >= viewTop + MARGIN && elBottom <= viewBottom - MARGIN;
    // If the question fits entirely on screen with margin, do nothing —
    // this is the common case after a tap and is the source of jitter.
    if (fullyVisible) return;

    // Otherwise, bring it into view via the shortest move:
    //  - scroll DOWN just enough to reveal it from below, or
    //  - scroll UP just enough to reveal it from above.
    // For tall questions (taller than the viewport), align the top.
    let top: number;
    if (el.offsetHeight + MARGIN * 2 >= container.clientHeight) {
      top = Math.max(0, elTop - MARGIN);
    } else if (elTop < viewTop + MARGIN) {
      top = Math.max(0, elTop - MARGIN);
    } else {
      top = elBottom - container.clientHeight + MARGIN;
    }
    // Avoid scheduling a scroll that wouldn't move the container at all
    // (sub-pixel drift can cause repeated micro-animations).
    if (Math.abs(top - container.scrollTop) < 1) return;

    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top, behavior: "smooth" });
    } else {
      // Fallback for environments without scrollTo (older browsers, jsdom).
      container.scrollTop = top;
    }
  }, [activeIndex, index, ctx]);
  // Inapplicable questions render NOTHING — this removes their inputs
  // from the DOM entirely so they can't receive tab/arrow-key focus and
  // so the auto-scroll logic above never targets a non-rendered node.
  // Keeping this filter centralized in <Question> means every form is
  // consistent without needing per-form `indexOf(key) >= 0` guards.
  if (index < 0) return null;
  return <div ref={ref}>{children}</div>;
};

/**
 * Helper hook for forms: keeps track of the most recently auto-focused
 * question and exposes a setter that advances focus to the NEXT applicable
 * question.
 *
 * The active position is persisted per `householdId + module` by question
 * KEY (not numeric index). On mount, the saved key is translated back to
 * its current applicable index via `applicableKeys` — if the previously
 * active question has been filtered out, we fall back to the nearest
 * still-applicable step so users don't land on a missing question.
 *
 * The total is read live from a ref so applicability changes don't push
 * focus past the current end of the list.
 */
const useQuestionFocus = (
  householdId: string | null | undefined,
  module: ModuleSetupKey,
  applicableKeys: readonly string[],
) => {
  const totalQuestions = applicableKeys.length;

  // Hydrate once on mount: translate the persisted key → current index.
  // We intentionally read applicableKeys ONLY in the initializer so that
  // a later applicability change doesn't snap focus around mid-session.
  const [activeIndex, setActiveIndex] = useState<number | null>(() => {
    const savedKey = readActiveQuestion(householdId, module);
    if (!savedKey) return null;
    const idx = applicableKeys.indexOf(savedKey);
    if (idx >= 0) return idx;
    // Saved key is no longer applicable — leave focus unset rather than
    // jumping to an unrelated step.
    return null;
  });

  const totalRef = useRef(totalQuestions);
  totalRef.current = totalQuestions;
  const keysRef = useRef(applicableKeys);
  keysRef.current = applicableKeys;

  const advanceFrom = useCallback(
    (i: number) => {
      const max = Math.max(0, totalRef.current - 1);
      // Defensive: if the caller passes -1 (inapplicable question key), or
      // any out-of-range value, normalize before stepping. `applicableKeys`
      // already excludes inapplicable questions, so adding 1 here is the
      // step within the applicable subset — guaranteed to skip any
      // filtered-out questions.
      const from = Number.isFinite(i) && i >= 0 ? Math.floor(i) : -1;
      const next = Math.min(from + 1, max);
      setActiveIndex(next);
      const nextKey = keysRef.current[next];
      if (nextKey) writeActiveQuestion(householdId, module, nextKey);
    },
    [householdId, module],
  );

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

// ---- Meals --------------------------------------------------------------
const MealsSetupForm = ({ module, householdId, preferences, onSubmit, onSkip, isSaving }: FormProps) => {
  const [data, setData] = useDraftState(householdId, module, {
    diet_type: preferences?.diet_type ?? "vegetarian",
    spice_level: preferences?.spice_level ?? "medium",
    food_allergies: (preferences?.food_allergies ?? []) as string[],
    regional_cuisines: (preferences?.regional_cuisines ?? []) as string[],
    weekday_cooking_time: preferences?.weekday_cooking_time ?? "30_to_60",
  });
  // Declarative per-form question list. Each entry's `applicable` flag
  // can later depend on `data` (e.g. hide allergens when diet is vegan)
  // — totals, progress, focus order all derive from the applicable subset.
  const questions = useMemo<FormQuestion[]>(() => [
    { key: "diet_type", applicable: true },
    { key: "spice_level", applicable: true },
    { key: "weekday_cooking_time", applicable: true },
    { key: "food_allergies", applicable: true },
    { key: "regional_cuisines", applicable: true },
  ], []);
  const { applicableKeys, total, indexOf } = useApplicableQuestions(questions);
  const { mark, count } = useTouchedQuestions(householdId, module, applicableKeys);
  useReportProgress(count, total);
  const { activeIndex, advanceFrom } = useQuestionFocus(householdId, module, applicableKeys);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={indexOf("diet_type")} activeIndex={activeIndex}>
        <Label>Diet type</Label>
        <RadioGroup value={data.diet_type} onValueChange={(v) => { setData({ ...data, diet_type: v }); mark("diet_type"); advanceFrom(indexOf("diet_type")); }} className="mt-2">
          {["vegetarian", "non_vegetarian", "eggetarian", "vegan", "jain"].map((t) => (
            <div key={t} className="flex items-center space-x-2">
              <RadioGroupItem value={t} id={`diet-${t}`} />
              <Label htmlFor={`diet-${t}`} className="capitalize">{t.replace("_", " ")}</Label>
            </div>
          ))}
        </RadioGroup>
      </Question>
      <Question index={indexOf("spice_level")} activeIndex={activeIndex}>
        <Label>Spice level</Label>
        <RadioGroup value={data.spice_level} onValueChange={(v) => { setData({ ...data, spice_level: v }); mark("spice_level"); advanceFrom(indexOf("spice_level")); }} className="mt-2">
          {["mild", "medium", "spicy", "very_spicy"].map((t) => (
            <div key={t} className="flex items-center space-x-2">
              <RadioGroupItem value={t} id={`spice-${t}`} />
              <Label htmlFor={`spice-${t}`} className="capitalize">{t.replace("_", " ")}</Label>
            </div>
          ))}
        </RadioGroup>
      </Question>
      <Question index={indexOf("weekday_cooking_time")} activeIndex={activeIndex}>
        <Label>Weekday cooking time</Label>
        <RadioGroup value={data.weekday_cooking_time} onValueChange={(v) => { setData({ ...data, weekday_cooking_time: v }); mark("weekday_cooking_time"); advanceFrom(indexOf("weekday_cooking_time")); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="less_than_30" id="t1" /><Label htmlFor="t1">Under 30 min</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="30_to_60" id="t2" /><Label htmlFor="t2">30–60 min</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="more_than_60" id="t3" /><Label htmlFor="t3">More than 60 min</Label></div>
        </RadioGroup>
      </Question>
      {indexOf("food_allergies") >= 0 && (
        <Question index={indexOf("food_allergies")} activeIndex={activeIndex}>
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
                      mark("food_allergies");
                    }}
                  />
                  <Label className={!isNone && noneSelected ? "text-muted-foreground" : ""}>{a}</Label>
                </div>
              );
            })}
          </div>
        </Question>
      )}
      {indexOf("regional_cuisines") >= 0 && (
        <Question index={indexOf("regional_cuisines")} activeIndex={activeIndex}>
          <Label>Favourite regional cuisines</Label>
          <div className="space-y-2 mt-2">
            {["North Indian", "South Indian", "East Indian", "West Indian", "International"].map((c) => (
              <div key={c} className="flex items-center space-x-2">
                <Checkbox checked={data.regional_cuisines.includes(c)} onCheckedChange={() => { setData({ ...data, regional_cuisines: toggle(data.regional_cuisines, c) }); mark("regional_cuisines"); }} />
                <Label>{c}</Label>
              </div>
            ))}
          </div>
        </Question>
      )}
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
  const questions = useMemo<FormQuestion[]>(() => [
    { key: "pantry_size", applicable: true },
    { key: "shopping_frequency", applicable: true },
    { key: "organic_preference", applicable: true },
  ], []);
  const { applicableKeys, total, indexOf } = useApplicableQuestions(questions);
  const { mark, count } = useTouchedQuestions(householdId, module, applicableKeys);
  useReportProgress(count, total);
  const { activeIndex, advanceFrom } = useQuestionFocus(householdId, module, applicableKeys);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={indexOf("pantry_size")} activeIndex={activeIndex}>
        <Label>Pantry size</Label>
        <RadioGroup value={data.pantry_size} onValueChange={(v) => { setData({ ...data, pantry_size: v }); mark("pantry_size"); advanceFrom(indexOf("pantry_size")); }} className="mt-2">
          {["small", "medium", "large"].map((s) => (
            <div key={s} className="flex items-center space-x-2"><RadioGroupItem value={s} id={`p-${s}`} /><Label htmlFor={`p-${s}`} className="capitalize">{s}</Label></div>
          ))}
        </RadioGroup>
      </Question>
      <Question index={indexOf("shopping_frequency")} activeIndex={activeIndex}>
        <Label>Shopping frequency</Label>
        <RadioGroup value={data.shopping_frequency} onValueChange={(v) => { setData({ ...data, shopping_frequency: v }); mark("shopping_frequency"); advanceFrom(indexOf("shopping_frequency")); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="daily" id="sf1" /><Label htmlFor="sf1">Daily</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="weekly" id="sf2" /><Label htmlFor="sf2">Weekly</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="biweekly" id="sf3" /><Label htmlFor="sf3">Every 2 weeks</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="monthly" id="sf4" /><Label htmlFor="sf4">Monthly</Label></div>
        </RadioGroup>
      </Question>
      <Question index={indexOf("organic_preference")} activeIndex={activeIndex}>
        <Label>Organic preference</Label>
        <RadioGroup value={data.organic_preference} onValueChange={(v) => { setData({ ...data, organic_preference: v }); mark("organic_preference"); advanceFrom(indexOf("organic_preference")); }} className="mt-2">
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
  const questions = useMemo<FormQuestion[]>(() => [
    { key: "monthly_grocery_budget", applicable: true },
    { key: "budget_consciousness", applicable: true },
  ], []);
  const { applicableKeys, total, indexOf } = useApplicableQuestions(questions);
  const { mark, count } = useTouchedQuestions(householdId, module, applicableKeys);
  useReportProgress(count, total);
  const { activeIndex, advanceFrom } = useQuestionFocus(householdId, module, applicableKeys);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={indexOf("monthly_grocery_budget")} activeIndex={activeIndex}>
        <Label>Monthly grocery budget (₹)</Label>
        <RadioGroup value={data.monthly_grocery_budget} onValueChange={(v) => { setData({ ...data, monthly_grocery_budget: v }); mark("monthly_grocery_budget"); advanceFrom(indexOf("monthly_grocery_budget")); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="under_5000" id="b1" /><Label htmlFor="b1">Under 5,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="5000_to_10000" id="b2" /><Label htmlFor="b2">5,000 – 10,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="10000_to_20000" id="b3" /><Label htmlFor="b3">10,000 – 20,000</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="over_20000" id="b4" /><Label htmlFor="b4">Over 20,000</Label></div>
        </RadioGroup>
      </Question>
      <Question index={indexOf("budget_consciousness")} activeIndex={activeIndex}>
        <Label>How strict should we be on budget?</Label>
        <RadioGroup value={data.budget_consciousness} onValueChange={(v) => { setData({ ...data, budget_consciousness: v }); mark("budget_consciousness"); advanceFrom(indexOf("budget_consciousness")); }} className="mt-2">
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
  const questions = useMemo<FormQuestion[]>(() => [
    { key: "preferred_task_time", applicable: true },
    { key: "household_concerns", applicable: true },
  ], []);
  const { applicableKeys, total, indexOf } = useApplicableQuestions(questions);
  const { mark, count } = useTouchedQuestions(householdId, module, applicableKeys);
  useReportProgress(count, total);
  const { activeIndex, advanceFrom } = useQuestionFocus(householdId, module, applicableKeys);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={indexOf("preferred_task_time")} activeIndex={activeIndex}>
        <Label>Preferred time of day</Label>
        <RadioGroup value={data.preferred_task_time} onValueChange={(v) => { setData({ ...data, preferred_task_time: v }); mark("preferred_task_time"); advanceFrom(indexOf("preferred_task_time")); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="morning" id="r1" /><Label htmlFor="r1">Morning</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="afternoon" id="r2" /><Label htmlFor="r2">Afternoon</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="evening" id="r3" /><Label htmlFor="r3">Evening</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="night" id="r4" /><Label htmlFor="r4">Night</Label></div>
        </RadioGroup>
      </Question>
      <Question index={indexOf("household_concerns")} activeIndex={activeIndex}>
        <Label>What matters most to you?</Label>
        <div className="space-y-2 mt-2">
          {["Health & fitness", "Family time", "Productivity", "Learning", "Mindfulness"].map((c) => (
            <div key={c} className="flex items-center space-x-2">
              <Checkbox checked={data.household_concerns.includes(c)} onCheckedChange={() => { setData({ ...data, household_concerns: toggle(data.household_concerns, c) }); mark("household_concerns"); }} />
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
  const questions = useMemo<FormQuestion[]>(() => [
    { key: "work_schedule", applicable: true },
    { key: "festival_importance", applicable: true },
  ], []);
  const { applicableKeys, total, indexOf } = useApplicableQuestions(questions);
  const { mark, count } = useTouchedQuestions(householdId, module, applicableKeys);
  useReportProgress(count, total);
  const { activeIndex, advanceFrom } = useQuestionFocus(householdId, module, applicableKeys);
  return (
    <FormShell onSave={() => onSubmit(data)} onSkip={onSkip} isSaving={isSaving}>
      <Question index={indexOf("work_schedule")} activeIndex={activeIndex}>
        <Label>Household work schedule</Label>
        <RadioGroup value={data.work_schedule} onValueChange={(v) => { setData({ ...data, work_schedule: v }); mark("work_schedule"); advanceFrom(indexOf("work_schedule")); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="both_working" id="w1" /><Label htmlFor="w1">Both/all adults working</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="one_working" id="w2" /><Label htmlFor="w2">One adult working</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="flexible" id="w3" /><Label htmlFor="w3">Flexible / WFH</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="retired" id="w4" /><Label htmlFor="w4">Retired</Label></div>
        </RadioGroup>
      </Question>
      <Question index={indexOf("festival_importance")} activeIndex={activeIndex}>
        <Label>How important are festivals?</Label>
        <RadioGroup value={data.festival_importance} onValueChange={(v) => { setData({ ...data, festival_importance: v }); mark("festival_importance"); advanceFrom(indexOf("festival_importance")); }} className="mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="very" id="f1" /><Label htmlFor="f1">Very important</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="somewhat" id="f2" /><Label htmlFor="f2">Somewhat</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="not_really" id="f3" /><Label htmlFor="f3">Not really</Label></div>
        </RadioGroup>
      </Question>
    </FormShell>
  );
};
