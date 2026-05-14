import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import {
  DAY_LONG,
  RecurrenceDay,
  RecurrenceSpec,
  dayFromDateIndex,
  dayToDateIndex,
} from '@/types/recurrence';

const SAFETY_LIMIT = 2000;

const sortDays = (days: RecurrenceDay[]) =>
  [...days].sort((a, b) => dayToDateIndex(a) - dayToDateIndex(b));

/** Returns occurrences of `spec` starting from `baseDate` that fall within [windowStart, windowEnd]. */
export function expandOccurrences(
  baseDate: Date,
  spec: RecurrenceSpec | null | undefined,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  if (!spec) return [];
  const base = startOfDay(baseDate);
  const wStart = startOfDay(windowStart);
  const wEnd = startOfDay(windowEnd);
  const interval = Math.max(1, spec.interval || 1);
  const out: Date[] = [];

  const endDate =
    spec.end.type === 'on_date' && spec.end.date
      ? startOfDay(parseISO(spec.end.date))
      : null;
  const maxOccurrences =
    spec.end.type === 'after' && spec.end.occurrences
      ? Math.max(1, spec.end.occurrences)
      : null;

  let count = 0;
  let safety = 0;

  const push = (d: Date): boolean => {
    if (isBefore(d, base)) return true;
    if (endDate && isAfter(d, endDate)) return false;
    count += 1;
    if (!isBefore(d, wStart) && !isAfter(d, wEnd)) {
      out.push(d);
    }
    if (maxOccurrences && count >= maxOccurrences) return false;
    if (isAfter(d, wEnd)) return false;
    return true;
  };

  if (spec.frequency === 'daily') {
    const days = spec.days && spec.days.length > 0 ? sortDays(spec.days) : null;
    let cursor = new Date(base);
    while (safety++ < SAFETY_LIMIT) {
      if (!days || days.includes(dayFromDateIndex(cursor.getDay()))) {
        if (!push(cursor)) break;
      }
      cursor = addDays(cursor, interval);
      if (isAfter(cursor, wEnd) && (!endDate || isAfter(cursor, endDate))) break;
    }
  } else if (spec.frequency === 'weekly') {
    const days =
      spec.days && spec.days.length > 0
        ? sortDays(spec.days)
        : [dayFromDateIndex(base.getDay())];
    // Walk week-by-week starting at the Sunday of base's week.
    const weekStart = addDays(base, -base.getDay());
    let week = new Date(weekStart);
    while (safety++ < SAFETY_LIMIT) {
      let stop = false;
      for (const d of days) {
        const candidate = addDays(week, dayToDateIndex(d));
        if (isBefore(candidate, base)) continue;
        if (!push(candidate)) {
          stop = true;
          break;
        }
      }
      if (stop) break;
      week = addWeeks(week, interval);
      if (isAfter(week, wEnd) && (!endDate || isAfter(week, endDate))) break;
    }
  } else if (spec.frequency === 'monthly') {
    let cursor = new Date(base);
    while (safety++ < SAFETY_LIMIT) {
      if (!push(cursor)) break;
      cursor = addMonths(cursor, interval);
      if (isAfter(cursor, wEnd) && (!endDate || isAfter(cursor, endDate))) break;
    }
  } else if (spec.frequency === 'yearly') {
    let cursor = new Date(base);
    while (safety++ < SAFETY_LIMIT) {
      if (!push(cursor)) break;
      cursor = addYears(cursor, interval);
      if (isAfter(cursor, wEnd) && (!endDate || isAfter(cursor, endDate))) break;
    }
  }

  return out;
}

/** True if `date` is an occurrence of `spec` starting at `baseDate`. */
export function isOccurrence(
  date: Date,
  baseDate: Date,
  spec: RecurrenceSpec | null | undefined,
): boolean {
  if (!spec) return false;
  const list = expandOccurrences(
    baseDate,
    spec,
    addDays(date, -1),
    addDays(date, 1),
  );
  return list.some((d) => isSameDay(d, date));
}

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const joinList = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

const describeEnd = (spec: RecurrenceSpec): string => {
  switch (spec.end.type) {
    case 'after':
      return `After ${spec.end.occurrences ?? 0} occurrences`;
    case 'on_date':
      return spec.end.date
        ? `Ends ${format(parseISO(spec.end.date), 'd MMM yyyy')}`
        : 'No end date';
    case 'never':
    default:
      return 'No end date';
  }
};

/** "Every Tuesday and Thursday · Ends 31 Dec 2026" */
export function formatRecurrenceSummary(
  spec: RecurrenceSpec | null | undefined,
): string {
  if (!spec) return '';
  const interval = Math.max(1, spec.interval || 1);
  let head = '';

  if (spec.frequency === 'daily') {
    if (spec.days && spec.days.length > 0 && spec.days.length < 7) {
      const named = sortDays(spec.days).map((d) => DAY_LONG[d]);
      head = `Every ${joinList(named)}`;
    } else {
      head = interval === 1 ? 'Every day' : `Every ${interval} days`;
    }
  } else if (spec.frequency === 'weekly') {
    const days =
      spec.days && spec.days.length > 0
        ? sortDays(spec.days).map((d) => DAY_LONG[d])
        : [];
    const weekPart = interval === 1 ? 'Every' : `Every ${interval} weeks on`;
    head = days.length > 0 ? `${weekPart} ${joinList(days)}` : 'Weekly';
  } else if (spec.frequency === 'monthly') {
    if (spec.day_of_month) {
      head = `Monthly on the ${ord(spec.day_of_month)}`;
    } else if (spec.week_of_month) {
      head = `Monthly on the ${ord(spec.week_of_month)} weekday`;
    } else {
      head = interval === 1 ? 'Monthly' : `Every ${interval} months`;
    }
  } else if (spec.frequency === 'yearly') {
    head = interval === 1 ? 'Yearly' : `Every ${interval} years`;
  }

  return `${head} · ${describeEnd(spec)}`;
}