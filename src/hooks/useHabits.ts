import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Habit, HabitLog, HabitStreak, HabitWithStreak, HabitAssignmentType, HabitFrequencyType } from "@/types/habits";
import { format, subDays } from "date-fns";

// Scoring constants
const POINTS_PER_COMPLETION = 10;
const STREAK_BONUS_3_DAYS = 5;
const STREAK_BONUS_7_DAYS = 15;
const STREAK_BONUS_30_DAYS = 50;
const ALL_HABITS_BONUS = 20;

interface CreateHabitData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  assignment_type: HabitAssignmentType;
  assigned_members?: string[];
  frequency_type: HabitFrequencyType;
  frequency_days: number[];
  target_value?: number;
  target_unit?: string;
  reminder_time?: string;
}

export const useHabits = (householdId: string | null, userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch all active habits for the household
  const { data: habits, isLoading } = useQuery({
    queryKey: ["habits", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data: habitsData, error } = await supabase
        .from("habits")
        .select("*")
        .eq("household_id", householdId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return habitsData as Habit[];
    },
    enabled: !!householdId,
  });

  // Fetch habit assignees for multiple-assignment habits
  const { data: habitAssignees } = useQuery({
    queryKey: ["habit-assignees", householdId],
    queryFn: async () => {
      if (!householdId || !habits) return [];

      const habitIds = habits
        .filter((h) => h.assignment_type === "multiple")
        .map((h) => h.id);

      if (habitIds.length === 0) return [];

      const { data, error } = await supabase
        .from("habit_assignees")
        .select("*")
        .in("habit_id", habitIds);

      if (error) throw error;
      return data;
    },
    enabled: !!householdId && !!habits,
  });

  const { data: todaysLogs } = useQuery({
    queryKey: ["habit-logs-today", householdId, targetUserId, today],
    queryFn: async () => {
      if (!householdId || !targetUserId) return [];

      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("log_date", today);

      if (error) throw error;
      return data as HabitLog[];
    },
    enabled: !!householdId && !!targetUserId,
  });

  const { data: streaks } = useQuery({
    queryKey: ["habit-streaks", householdId, targetUserId],
    queryFn: async () => {
      if (!householdId || !targetUserId) return [];

      const { data, error } = await supabase
        .from("habit_streaks")
        .select("*")
        .eq("user_id", targetUserId);

      if (error) throw error;
      return data as HabitStreak[];
    },
    enabled: !!householdId && !!targetUserId,
  });

  // Filter habits for current user based on assignment type
  const myHabits = (habits || []).filter((habit) => {
    if (habit.assignment_type === "personal") {
      return habit.user_id === targetUserId;
    }
    if (habit.assignment_type === "household") {
      return true; // All household members see household habits
    }
    if (habit.assignment_type === "multiple") {
      // Check if current user is in the assignees list
      const assignees = habitAssignees?.filter((a) => a.habit_id === habit.id) || [];
      return assignees.some((a) => a.user_id === targetUserId);
    }
    return false;
  });

  // Combine habits with their streaks and today's logs
  const habitsWithStreaks: HabitWithStreak[] = myHabits.map((habit) => ({
    ...habit,
    streak: streaks?.find((s) => s.habit_id === habit.id),
    todayLog: todaysLogs?.find((l) => l.habit_id === habit.id),
    assignees: habitAssignees?.filter((a) => a.habit_id === habit.id),
  }));

  // Filter habits that are due today based on frequency
  const todaysHabits = habitsWithStreaks.filter((habit) => {
    const todayDayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...

    if (habit.frequency_type === "daily") return true;

    if (habit.frequency_type === "specific_days") {
      return habit.frequency_days.includes(todayDayOfWeek);
    }

    if (habit.frequency_type === "weekly") {
      // If user configured specific days, respect them;
      // otherwise default to Monday.
      if (habit.frequency_days && habit.frequency_days.length > 0) {
        return habit.frequency_days.includes(todayDayOfWeek);
      }
      return todayDayOfWeek === 1;
    }

    return true;
  });

  const createHabit = useMutation({
    mutationFn: async (habitData: CreateHabitData) => {
      if (!householdId || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("habits")
        .insert({
          household_id: householdId,
          user_id: user.id,
          name: habitData.name,
          description: habitData.description,
          icon: habitData.icon || "check",
          color: habitData.color || "#47CC7B",
          frequency_type: habitData.frequency_type || "daily",
          frequency_days: habitData.frequency_days || [],
          reminder_time: habitData.reminder_time,
          target_value: habitData.target_value,
          target_unit: habitData.target_unit,
          assignment_type: habitData.assignment_type || "personal",
        })
        .select()
        .single();

      if (error) throw error;

      // If multiple assignment, create assignees
      if (habitData.assignment_type === "multiple" && habitData.assigned_members?.length) {
        const assigneesData = habitData.assigned_members.map((userId) => ({
          habit_id: data.id,
          user_id: userId,
        }));

        const { error: assigneesError } = await supabase
          .from("habit_assignees")
          .insert(assigneesData);

        if (assigneesError) throw assigneesError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", householdId] });
      queryClient.invalidateQueries({ queryKey: ["habit-assignees", householdId] });
      toast({
        title: "Habit created",
        description: "Your new habit has been added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logHabit = useMutation({
    mutationFn: async ({
      habitId,
      completed,
      actualValue,
      notes,
    }: {
      habitId: string;
      completed: boolean;
      actualValue?: number;
      notes?: string;
    }) => {
      if (!user?.id || !householdId) throw new Error("Not authenticated");

      // Upsert the log
      const { data, error } = await supabase
        .from("habit_logs")
        .upsert(
          {
            habit_id: habitId,
            user_id: user.id,
            log_date: today,
            completed,
            actual_value: actualValue,
            notes,
            logged_at: new Date().toISOString(),
          },
          {
            onConflict: "habit_id,log_date,user_id",
          }
        )
        .select()
        .single();

      if (error) throw error;

      // Update streak and score
      const streakResult = await updateStreak(habitId, user.id, completed);
      if (completed) {
        await updateScore(householdId, user.id, streakResult.newStreak);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-logs-today"] });
      queryClient.invalidateQueries({ queryKey: ["habit-streaks"] });
      queryClient.invalidateQueries({ queryKey: ["household-habit-stats"] });
      queryClient.invalidateQueries({ queryKey: ["habit-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["habit-scores"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStreak = async (
    habitId: string,
    userId: string,
    completed: boolean
  ): Promise<{ newStreak: number }> => {
    const { data: existingStreak } = await supabase
      .from("habit_streaks")
      .select("*")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .single();

    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    let newStreak = 0;

    if (completed) {
      if (existingStreak) {
        const lastDate = existingStreak.last_completed_date;

        if (lastDate === yesterday) {
          newStreak = existingStreak.current_streak + 1;
        } else if (lastDate === today) {
          newStreak = existingStreak.current_streak;
        } else {
          newStreak = 1;
        }

        await supabase
          .from("habit_streaks")
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, existingStreak.longest_streak),
            last_completed_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingStreak.id);
      } else {
        newStreak = 1;
        await supabase.from("habit_streaks").insert({
          habit_id: habitId,
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_completed_date: today,
        });
      }
    }

    return { newStreak };
  };

  const updateScore = async (
    householdId: string,
    userId: string,
    currentStreak: number
  ) => {
    // Calculate score
    let dailyScore = POINTS_PER_COMPLETION;
    let streakBonus = 0;

    // Add streak bonuses
    if (currentStreak >= 30) {
      streakBonus = STREAK_BONUS_30_DAYS;
    } else if (currentStreak >= 7) {
      streakBonus = STREAK_BONUS_7_DAYS;
    } else if (currentStreak >= 3) {
      streakBonus = STREAK_BONUS_3_DAYS;
    }

    // Check if all habits completed today for bonus
    const { count: completedTodayCount } = await supabase
      .from("habit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("log_date", today)
      .eq("completed", true);

    const totalToday = todaysHabits.length;
    const completedToday = completedTodayCount ?? 0;
    if (completedToday >= totalToday && totalToday > 0) {
      dailyScore += ALL_HABITS_BONUS;
    }

    const totalScore = dailyScore + streakBonus;

    // Upsert score for today
    const { data: existingScore } = await supabase
      .from("habit_scores")
      .select("*")
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .eq("score_date", today)
      .single();

    if (existingScore) {
      await supabase
        .from("habit_scores")
        .update({
          daily_score: existingScore.daily_score + dailyScore,
          streak_bonus: existingScore.streak_bonus + streakBonus,
          total_score: existingScore.total_score + totalScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingScore.id);
    } else {
      await supabase.from("habit_scores").insert({
        household_id: householdId,
        user_id: userId,
        score_date: today,
        daily_score: dailyScore,
        streak_bonus: streakBonus,
        total_score: totalScore,
      });
    }
  };

  const deleteHabit = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", habitId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", householdId] });
      toast({
        title: "Habit deleted",
        description: "The habit has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    habits: habitsWithStreaks,
    allHabits: habits || [],
    todaysHabits,
    isLoading,
    createHabit,
    logHabit,
    deleteHabit,
  };
};
