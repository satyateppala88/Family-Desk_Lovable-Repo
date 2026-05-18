/**
 * Format a remaining-days count as the largest sensible unit.
 * - >= 365 days  → years (1 decimal, trimmed)
 * - >= 30 days   → months (1 decimal, trimmed)
 * - 1-29 days    → days
 * - 0            → "Due today"
 * - < 0          → "Overdue"
 */
export function formatTimeLeft(daysLeft: number | null): string {
  if (daysLeft === null || daysLeft === undefined) return "";
  if (daysLeft < 0) return "Overdue";
  if (daysLeft === 0) return "Due today";

  const fmt = (n: number, unit: "year" | "month" | "day") => {
    const rounded = Math.round(n * 10) / 10;
    const str = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
    const plural = rounded === 1 ? unit : `${unit}s`;
    return `${str} ${plural} left`;
  };

  if (daysLeft >= 365) return fmt(daysLeft / 365, "year");
  if (daysLeft >= 30) return fmt(daysLeft / 30, "month");
  return fmt(daysLeft, "day");
}