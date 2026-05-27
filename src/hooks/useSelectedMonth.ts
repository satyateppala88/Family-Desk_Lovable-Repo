import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addMonths, parse } from "date-fns";

/**
 * Module-wide selected month for the Finance pages.
 *
 * Source of truth (in order):
 *   1. URL `?m=YYYY-MM` if present and well-formed — keeps the chosen month
 *      sticky as the user moves between Finance sub-pages (each sub-page
 *      preserves the query string) and supports deep-linking / sharing.
 *   2. Current month (fallback).
 *
 * We intentionally do NOT persist to localStorage: when the user leaves the
 * Finance module and returns later, they should always land on the current
 * month, not on whichever past month they last viewed.
 */

const isValidMonth = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}$/.test(v);

export function useSelectedMonth() {
  const [params, setParams] = useSearchParams();
  const urlMonth = params.get("m");
  const currentMonth = format(new Date(), "yyyy-MM");

  const month = isValidMonth(urlMonth) ? urlMonth : currentMonth;

  const setMonth = useCallback(
    (next: string) => {
      if (!isValidMonth(next)) return;
      const newParams = new URLSearchParams(params);
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
