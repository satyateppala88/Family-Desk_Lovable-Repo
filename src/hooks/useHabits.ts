import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Habit, HabitLog, HabitStreak, HabitWithStreak } from "@/types/habits";
import { format, isToday, subDays, startOfDay, parseISO } from "date-fns";

export const useHabits = (householdId: string | null, userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: habits, isLoading } = useQuery({
    queryKey: ["habits", householdId, targetUserId],
    queryFn: async () => {
      if (!householdId || !targetUserId) return [];

      const { data: habitsData, error } = await supabase
        .from("habits")
        .select("*")
        .eq("household_id", householdId)
        .eq("user_id", targetUserId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return habitsData as Habit[];
    },
    enabled: !!householdId && !!targetUserId,
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

  // Combine habits with their streaks and today's logs
  const habitsWithStreaks: HabitWithStreak[] = (habits || []).map((habit) => ({
    ...habit,
    streak: streaks?.find((s) => s.habit_id === habit.id),
    todayLog: todaysLogs?.find((l) => l.habit_id === habit.id),
  }));

  // Filter habits that are due today based on frequency
  const todaysHabits = habitsWithStreaks.filter((habit) => {
    if (habit.frequency_type === "daily") return true;
    if (habit.frequency_type === "weekly") {
      // Check if any day this week
      return true;
    }
    if (habit.frequency_type === "specific_days") {
      const dayOfWeek = new Date().getDay();
      return habit.frequency_days.includes(dayOfWeek);
    }
    return true;
  });

  const createHabit = useMutation({
    mutationFn: async (habitData: Partial<Habit>) => {
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
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", householdId] });
      toast({
        title: "Habit created",
        description: "Your new habit has been added.",
      });
    },
    onError: (error: any) => {
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
      if (!user?.id) throw new Error("Not authenticated");

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
            onConflict: "habit_id,log_date",
          }
        )
        .select()
        .single();

      if (error) throw error;

      // Update streak
      await updateStreak(habitId, user.id, completed);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-logs-today"] });
      queryClient.invalidateQueries({ queryKey: ["habit-streaks"] });
      queryClient.invalidateQueries({ queryKey: ["household-habit-stats"] });
    },
    onError: (error: any) => {
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
  ) => {
    // Get existing streak
    const { data: existingStreak } = await supabase
      .from("habit_streaks")
      .select("*")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .single();

    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    if (completed) {
      if (existingStreak) {
        const lastDate = existingStreak.last_completed_date;
        let newStreak = 1;

        if (lastDate === yesterday) {
          newStreak = existingStreak.current_streak + 1;
        } else if (lastDate === today) {
          newStreak = existingStreak.current_streak;
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
        await supabase.from("habit_streaks").insert({
          habit_id: habitId,
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_completed_date: today,
        });
      }
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    habits: habitsWithStreaks,
    todaysHabits,
    isLoading,
    createHabit,
    logHabit,
    deleteHabit,
  };
};
