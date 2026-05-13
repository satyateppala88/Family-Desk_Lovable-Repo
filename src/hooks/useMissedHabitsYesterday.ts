import { useMemo } from "react";
import { format, subDays } from "date-fns";
import type { HabitWithStreak } from "@/types/habits";

export interface MissedHabit {
  id: string;
  name: string;
  currentStreak: number;
}

const wasScheduledOn = (habit: HabitWithStreak, dayOfWeek: number): boolean => {
  if (habit.frequency_type === "daily") return true;
  if (habit.frequency_type === "specific_days") return habit.frequency_days.includes(dayOfWeek);
  if (habit.frequency_type === "weekly") {
    if (habit.frequency_days && habit.frequency_days.length > 0) return habit.frequency_days.includes(dayOfWeek);
    return dayOfWeek === 1;
  }
  return false;
};

export const useMissedHabitsYesterday = (habits: HabitWithStreak[]): MissedHabit[] => {
  return useMemo(() => {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const yDay = subDays(new Date(), 1).getDay();
    return habits
      .filter((h) => {
        if (!h.streak || h.streak.current_streak <= 0) return false;
        if (!wasScheduledOn(h, yDay)) return false;
        const last = h.streak.last_completed_date;
        return !last || last < yesterday;
      })
      .map((h) => ({ id: h.id, name: h.name, currentStreak: h.streak!.current_streak }))
      .sort((a, b) => b.currentStreak - a.currentStreak);
  }, [habits]);
};