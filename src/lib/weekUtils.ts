import { startOfWeek, endOfWeek, addDays, format, isSameDay, parseISO } from "date-fns";

export type WeekStartDay = "sunday" | "monday";

export const getWeekStartDate = (date: Date, weekStartDay: WeekStartDay): Date => {
  const startDay = weekStartDay === "monday" ? 1 : 0;
  return startOfWeek(date, { weekStartsOn: startDay });
};

export const getWeekEndDate = (date: Date, weekStartDay: WeekStartDay): Date => {
  const startDay = weekStartDay === "monday" ? 1 : 0;
  return endOfWeek(date, { weekStartsOn: startDay });
};

export const getWeekDays = (weekStart: Date): Date[] => {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
};

export const getRemainingDaysOfWeek = (weekStartDay: WeekStartDay): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const weekStart = getWeekStartDate(today, weekStartDay);
  const days = getWeekDays(weekStart);
  
  let remainingDays = 0;
  for (const day of days) {
    const normalizedDay = new Date(day);
    normalizedDay.setHours(0, 0, 0, 0); // Normalize each day
    
    if (normalizedDay >= today) {
      remainingDays++;
    }
  }
  
  return remainingDays;
};

export const getDayName = (date: Date): string => {
  return format(date, "EEEE");
};

export const getShortDayName = (date: Date): string => {
  return format(date, "EEE");
};

export const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
};

export const getDayOfWeekNumber = (date: Date, weekStartDay: WeekStartDay): number => {
  const weekStart = getWeekStartDate(date, weekStartDay);
  const days = getWeekDays(weekStart);
  return days.findIndex(day => isSameDay(day, date));
};
