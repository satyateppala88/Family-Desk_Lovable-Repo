import { useSearchParams } from "react-router-dom";
import { format, addMonths, parse } from "date-fns";

/**
 * Reads/writes the selected finance month as `?m=YYYY-MM` in the URL.
 * Defaults to current month. Used across Finance pages so the user's
 * month context (e.g. "viewing June 2026") persists when navigating.
 */
export function useSelectedMonth() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("m");
  const isValid = raw && /^\d{4}-\d{2}$/.test(raw);
  const currentMonth = format(new Date(), "yyyy-MM");
  const month = isValid ? raw! : currentMonth;

  const setMonth = (next: string) => {
    const newParams = new URLSearchParams(params);
    if (next === currentMonth) newParams.delete("m");
    else newParams.set("m", next);
    setParams(newParams, { replace: true });
  };

  const shift = (delta: number) => {
    const d = parse(month + "-01", "yyyy-MM-dd", new Date());
    setMonth(format(addMonths(d, delta), "yyyy-MM"));
  };

  const isCurrent = month === currentMonth;
  const date = parse(month + "-01", "yyyy-MM-dd", new Date());
  const label = format(date, "MMMM yyyy");

  return { month, setMonth, shift, isCurrent, label, currentMonth, date };
}

/** Returns "YYYY-MM" for `delta` months relative to today. */
export function monthOffset(delta: number): string {
  return format(addMonths(new Date(), delta), "yyyy-MM");
}