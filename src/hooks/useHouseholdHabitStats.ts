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

      // All 6 queries run in parallel — replaces 14 sequential awaits
      const [membersRes, habitsRes, assigneesRes, todayLogsRes, streaksRes, weekLogsRes] =
        await Promise.all([
          supabase.from("household_members").select("user_id").eq("household_id", householdId),
          supabase.from("habits").select("*").eq("household_id", householdId).eq("is_active", true),
          supabase.from("habit_assignees").select("habit_id, user_id"),
          supabase.from("habit_logs").select("habit_id, user_id, completed").eq("log_date", today),
          supabase.from("habit_streaks").select("*"),
          supabase.from("habit_logs").select("habit_id, user_id, completed, log_date").gte("log_date", weekStart).lte("log_date", weekEnd),
        ]);

      const memberIds = (membersRes.data ?? []).map((m: any) => m.user_id);

      // Fetch profiles for all members in one call
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", memberIds);

      const habits = habitsRes.data ?? [];
      const assignees = assigneesRes.data ?? [];
      const todaysLogs = (todayLogsRes.data ?? []).filter((l: any) => memberIds.includes(l.user_id));
      const streaks = (streaksRes.data ?? []).filter((s: any) => memberIds.includes(s.user_id));
      const weekLogs = (weekLogsRes.data ?? []).filter((l: any) => memberIds.includes(l.user_id));

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
        const memberHabits =
          habits?.filter((h) => {
            if (h.assignment_type === "personal") return h.user_id === userId;
            if (h.assignment_type === "household") return true;
            if (h.assignment_type === "multiple") {
              return (assignees || []).some(
                (a) => a.habit_id === h.id && a.user_id === userId
              );
            }
            return h.user_id === userId;
          }) || [];
        const memberHabitIds = new Set(memberHabits.map((h) => h.id));
        const memberTodayLogs =
          todaysLogs?.filter(
            (l) => l.user_id === userId && memberHabitIds.has(l.habit_id)
          ) || [];
        const memberStreaks = streaks?.filter((s) => s.user_id === userId) || [];
        const memberWeekLogs =
          weekLogs?.filter(
            (l) => l.user_id === userId && memberHabitIds.has(l.habit_id)
          ) || [];

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
