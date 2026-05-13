import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const currentPeriod = () => format(new Date(), "yyyy-MM");

export const useStreakFreeze = () => {
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["streak-freeze-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, streak_freezes_remaining, streak_freeze_period, last_freeze_used_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Lazy monthly replenish
  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    const period = currentPeriod();
    if (p.streak_freeze_period !== period) {
      supabase
        .from("profiles")
        .update({ streak_freezes_remaining: 1, streak_freeze_period: period })
        .eq("id", p.id)
        .then(() => qc.invalidateQueries({ queryKey: ["streak-freeze-profile"] }));
    }
  }, [profileQuery.data, qc]);

  const remaining = profileQuery.data?.streak_freezes_remaining ?? 0;

  const applyFreeze = useMutation({
    mutationFn: async (habitIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (remaining <= 0) throw new Error("No freezes left this month");
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

      // insert synthetic logs (ignore duplicates)
      for (const hid of habitIds) {
        await supabase.from("habit_logs").insert({
          habit_id: hid,
          user_id: user.id,
          log_date: yesterday,
          completed: true,
          is_freeze: true,
          notes: "Streak freeze used",
        });
        await supabase
          .from("habit_streaks")
          .update({ last_completed_date: yesterday, updated_at: new Date().toISOString() })
          .eq("habit_id", hid)
          .eq("user_id", user.id);
      }

      await supabase
        .from("profiles")
        .update({
          streak_freezes_remaining: remaining - 1,
          last_freeze_used_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    },
    onSuccess: () => {
      toast.success("❄️ Streak protected");
      qc.invalidateQueries({ queryKey: ["streak-freeze-profile"] });
      qc.invalidateQueries({ queryKey: ["habit-streaks"] });
      qc.invalidateQueries({ queryKey: ["habit-logs-today"] });
    },
    onError: (e: any) => toast.error(e.message || "Could not use freeze"),
  });

  return { remaining, applyFreeze };
};