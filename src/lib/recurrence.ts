import type { TaskmasterTask } from "@/types/taskmaster";

export type RecurrenceType =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface RecurrencePattern {
  type: RecurrenceType;
  config?: {
    weekday?: number; // 0–6 (Sun–Sat) for weekly
    day?: number | "last"; // 1–31 or "last" for monthly/quarterly
  };
}

const lastDayOfMonth = (year: number, monthIdx: number) =>
  new Date(year, monthIdx + 1, 0).getDate();

const setMonthlyDay = (d: Date, day: number | "last") => {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (day === "last") {
    return new Date(y, m, lastDayOfMonth(y, m));
  }
  const clamped = Math.min(day, lastDayOfMonth(y, m));
  return new Date(y, m, clamped);
};

/**
 * Returns the next occurrence strictly AFTER `fromDate` (or today if null).
 */
export const nextOccurrence = (
  pattern: RecurrencePattern,
  fromDate?: Date | null
): Date => {
  const base = fromDate ? new Date(fromDate) : new Date();
  base.setHours(9, 0, 0, 0);

  switch (pattern.type) {
    case "daily": {
      const d = new Date(base);
      d.setDate(d.getDate() + 1);
      return d;
    }
    case "weekly": {
      const target = pattern.config?.weekday ?? base.getDay();
      const d = new Date(base);
      d.setDate(d.getDate() + 1);
      while (d.getDay() !== target) d.setDate(d.getDate() + 1);
      return d;
    }
    case "monthly": {
      const day = pattern.config?.day ?? base.getDate();
      const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      return setMonthlyDay(next, day);
    }
    case "quarterly": {
      const day = pattern.config?.day ?? base.getDate();
      const next = new Date(base.getFullYear(), base.getMonth() + 3, 1);
      return setMonthlyDay(next, day);
    }
    case "yearly": {
      const d = new Date(base);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
  }
};

const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const describeRecurrence = (
  pattern: RecurrencePattern | null | undefined
): string => {
  if (!pattern) return "";
  switch (pattern.type) {
    case "daily":
      return "Repeats daily";
    case "weekly": {
      const wd = pattern.config?.weekday;
      return wd != null
        ? `Repeats weekly on ${WEEKDAY_NAMES[wd]}`
        : "Repeats weekly";
    }
    case "monthly": {
      const day = pattern.config?.day;
      if (day === "last") return "Repeats monthly on the last day";
      if (day != null) return `Repeats monthly on the ${ord(day)}`;
      return "Repeats monthly";
    }
    case "quarterly": {
      const day = pattern.config?.day;
      if (day === "last") return "Repeats quarterly on the last day";
      if (day != null) return `Repeats quarterly on the ${ord(day)}`;
      return "Repeats quarterly";
    }
    case "yearly":
      return "Repeats yearly";
  }
};

/**
 * Returns a partial task representing the next occurrence of a completed
 * recurring task. Caller is responsible for inserting it and copying assignees.
 */
export const cloneTaskAsNextOccurrence = (
  task: Pick<
    TaskmasterTask,
    | "household_id"
    | "title"
    | "description"
    | "task_category"
    | "priority_level"
    | "project_id"
    | "due_date"
    | "created_by"
  > & { recurring?: boolean | null; recurring_pattern?: unknown }
): Record<string, unknown> | null => {
  const pattern = task.recurring_pattern as RecurrencePattern | null;
  if (!task.recurring || !pattern) return null;
  const prevDue = task.due_date ? new Date(task.due_date) : null;
  const next = nextOccurrence(pattern, prevDue);
  return {
    household_id: task.household_id,
    title: task.title,
    description: task.description,
    task_category: task.task_category,
    priority_level: task.priority_level,
    project_id: task.project_id,
    task_status: "backlog",
    due_date: next.toISOString(),
    recurring: true,
    recurring_pattern: pattern,
    created_by: task.created_by,
  };
};