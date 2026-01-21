import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { HouseholdHabitStats, MemberHabitStats } from "@/types/habits";

export const useHouseholdHabitStats = (householdId: string | null) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date()), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date()), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["household-habit-stats", householdId, today],
    queryFn: async (): Promise<HouseholdHabitStats> => {
      if (!householdId) {
        return {
          totalHabits: 0,
          completedToday: 0,
          plannedToday: 0,
          completionRate: 0,
          longestStreak: 0,
          memberStats: [],
        };
      }

      // Get all household members with profiles
      const { data: members, error: membersError } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId);

      if (membersError) throw membersError;

      const memberIds = members.map((m) => m.user_id);

      // Get profiles for display names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", memberIds);

      // Get all active habits for the household
      const { data: habits, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .eq("household_id", householdId)
        .eq("is_active", true);

      if (habitsError) throw habitsError;

      // Get today's logs
      const { data: todaysLogs, error: logsError } = await supabase
        .from("habit_logs")
        .select("*")
        .in("user_id", memberIds)
        .eq("log_date", today);

      if (logsError) throw logsError;

      // Get streaks
      const { data: streaks, error: streaksError } = await supabase
        .from("habit_streaks")
        .select("*")
        .in("user_id", memberIds);

      if (streaksError) throw streaksError;

      // Get week's logs for weekly rate
      const { data: weekLogs } = await supabase
        .from("habit_logs")
        .select("*")
        .in("user_id", memberIds)
        .gte("log_date", weekStart)
        .lte("log_date", weekEnd);

      // Calculate household stats
      const totalHabits = habits?.length || 0;
      const completedToday =
        todaysLogs?.filter((l) => l.completed).length || 0;

      // Calculate planned today (habits that should be done today)
      const plannedToday =
        habits?.filter((habit) => {
          if (habit.frequency_type === "daily") return true;
          if (habit.frequency_type === "specific_days") {
            const dayOfWeek = new Date().getDay();
            return (habit.frequency_days || []).includes(dayOfWeek);
          }
          return true;
        }).length || 0;

      const completionRate =
        plannedToday > 0
          ? Math.round((completedToday / plannedToday) * 100)
          : 0;

      const longestStreak = Math.max(
        0,
        ...(streaks?.map((s) => s.current_streak) || [0])
      );

      // Calculate per-member stats
      const memberStats: MemberHabitStats[] = memberIds.map((userId) => {
        const profile = profiles?.find((p) => p.id === userId);
        const memberHabits = habits?.filter((h) => h.user_id === userId) || [];
        const memberTodayLogs =
          todaysLogs?.filter((l) => l.user_id === userId) || [];
        const memberStreaks = streaks?.filter((s) => s.user_id === userId) || [];
        const memberWeekLogs =
          weekLogs?.filter((l) => l.user_id === userId) || [];

        const memberPlannedToday = memberHabits.filter((habit) => {
          if (habit.frequency_type === "daily") return true;
          if (habit.frequency_type === "specific_days") {
            const dayOfWeek = new Date().getDay();
            return (habit.frequency_days || []).includes(dayOfWeek);
          }
          return true;
        }).length;

        const memberCompletedToday = memberTodayLogs.filter(
          (l) => l.completed
        ).length;

        const bestStreak = Math.max(
          0,
          ...memberStreaks.map((s) => s.current_streak)
        );

        // Weekly rate: completed / (habits * 7)
        const weeklyCompleted = memberWeekLogs.filter((l) => l.completed).length;
        const weeklyPlanned = memberHabits.length * 7;
        const weeklyRate =
          weeklyPlanned > 0
            ? Math.round((weeklyCompleted / weeklyPlanned) * 100)
            : 0;

        return {
          userId,
          displayName: profile?.display_name || "Member",
          avatarUrl: profile?.avatar_url,
          completedToday: memberCompletedToday,
          plannedToday: memberPlannedToday,
          currentStreak: bestStreak,
          weeklyRate,
        };
      });

      return {
        totalHabits,
        completedToday,
        plannedToday,
        completionRate,
        longestStreak,
        memberStats,
      };
    },
    enabled: !!householdId,
  });
};
