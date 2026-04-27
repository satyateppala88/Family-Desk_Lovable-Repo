/**
 * Time helpers for India Standard Time (Asia/Kolkata, UTC+05:30, no DST).
 *
 * pg_cron on managed Supabase runs in UTC and the cluster timezone cannot be
 * changed. Cron expressions are therefore authored as the IST clock time minus
 * 5h30m. Within edge functions we use these helpers so "today" / "tomorrow"
 * always refer to the IST calendar day rather than the UTC one.
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const istFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Returns "YYYY-MM-DD" for today in Asia/Kolkata. */
export function todayIST(): string {
  return istFormatter.format(new Date());
}

/** Returns "YYYY-MM-DD" for today + N days in Asia/Kolkata. */
export function istDateOffset(days: number): string {
  return istFormatter.format(new Date(Date.now() + days * 86_400_000));
}

/**
 * Returns the UTC `Date` corresponding to the next IST midnight strictly after
 * `from` (defaults to now). Useful for "tomorrow in IST" timestamptz queries.
 */
export function nextISTMidnightUTC(from: Date = new Date()): Date {
  // Shift `from` into IST wall-clock space, advance to the next midnight,
  // then shift back to UTC.
  const istNowMs = from.getTime() + IST_OFFSET_MS;
  const istMidnightMs = Math.floor(istNowMs / 86_400_000) * 86_400_000 + 86_400_000;
  return new Date(istMidnightMs - IST_OFFSET_MS);
}