/**
 * Shared recurrence types used by Calendar events, Tasks, Habits, and
 * Subscriptions. Persisted as jsonb in each module's `recurrence` column.
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type RecurrenceDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export const RECURRENCE_DAYS: RecurrenceDay[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

export const DAY_LABELS: Record<RecurrenceDay, string> = {
  sun: 'Su',
  mon: 'Mo',
  tue: 'Tu',
  wed: 'We',
  thu: 'Th',
  fri: 'Fr',
  sat: 'Sa',
};

export const DAY_LONG: Record<RecurrenceDay, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

export interface RecurrenceEnd {
  type: 'never' | 'after' | 'on_date';
  /** Used when type === 'after' */
  occurrences?: number;
  /** ISO yyyy-MM-dd. Used when type === 'on_date' */
  date?: string;
}

export interface RecurrenceSpec {
  frequency: RecurrenceFrequency;
  /** Every N units. Default 1. */
  interval: number;
  /** Selected weekdays for daily/weekly. */
  days?: RecurrenceDay[];
  /** For monthly "on day X" variant. */
  day_of_month?: number;
  /** For monthly "on Nth weekday" variant (1..5; 5 = last). */
  week_of_month?: number;
  end: RecurrenceEnd;
}

export const dayFromDateIndex = (idx: number): RecurrenceDay =>
  RECURRENCE_DAYS[((idx % 7) + 7) % 7];

export const dayToDateIndex = (day: RecurrenceDay): number =>
  RECURRENCE_DAYS.indexOf(day);