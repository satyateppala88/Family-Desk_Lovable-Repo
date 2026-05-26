import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addMonths, parse } from "date-fns";

/**
 * Module-wide selected month for the Finance pages.
 *
 * Source of truth (resolved on every read, in this order):
 *   1. URL `?m=YYYY-MM` if present and well-formed (lets users deep-link/share).
 *   2. localStorage (persists the user's choice across pages, refreshes,
 *      sessions). This is the key to "the chosen month follows me".
 *   3. Current month (fallback for first-time users).
 *
 * Calling `setMonth` updates BOTH localStorage and the URL, then broadcasts a
 * synchronous in-tab event so every other component using this hook re-renders
 * immediately. The `storage` event keeps multiple tabs in sync.
 */

const STORAGE_KEY = "familydesk:finance:selected-month";
const CHANGE_EVENT = "familydesk:finance-month-change";

const isValidMonth = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}$/.test(v);

const readStored = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isValidMonth(v) ? v : null;
  } catch {
    return null;
  }
};

const writeStored = (v: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* quota / disabled storage — non-fatal */
  }
};

export function useSelectedMonth() {
  const [params, setParams] = useSearchParams();
  const urlMonth = params.get("m");
  const currentMonth = format(new Date(), "yyyy-MM");

  // Re-render trigger when localStorage changes from another component / tab.
  // We don't actually use the value — the hook re-resolves the month on
  // every render from URL → storage → currentMonth.
  const [, bump] = useState(0);
  useEffect(() => {
    const onChange = () => bump((n) => n + 1);
    window.addEventListener(CHANGE_EVENT, onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const month = isValidMonth(urlMonth)
    ? urlMonth
    : readStored() ?? currentMonth;

  const setMonth = useCallback(
    (next: string) => {
      if (!isValidMonth(next)) return;
      writeStored(next);
      // Notify same-tab listeners synchronously (storage event doesn't fire
      // in the originating tab).
      try {
        window.dispatchEvent(new Event(CHANGE_EVENT));
      } catch {
        /* noop */
      }
      const newParams = new URLSearchParams(params);
      // Always reflect the choice in the URL — it's harmless when it equals
      // the current month, and it makes the active month visible & shareable.
      newParams.set("m", next);
      setParams(newParams, { replace: true });
    },
    [params, setParams],
  );

  const shift = useCallback(
    (delta: number) => {
      const d = parse(month + "-01", "yyyy-MM-dd", new Date());
      setMonth(format(addMonths(d, delta), "yyyy-MM"));
    },
    [month, setMonth],
  );

  const isCurrent = month === currentMonth;
  const date = parse(month + "-01", "yyyy-MM-dd", new Date());
  const label = format(date, "MMMM yyyy");

  return { month, setMonth, shift, isCurrent, label, currentMonth, date };
}

/** Returns "YYYY-MM" for `delta` months relative to today. */
export function monthOffset(delta: number): string {
  return format(addMonths(new Date(), delta), "yyyy-MM");
}
