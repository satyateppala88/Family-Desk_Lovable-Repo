import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Challenge, ChallengeParticipant, ChallengeLog, ChallengeWithDetails } from "@/types/habits";
import type { ChallengeTemplate } from "@/data/challengeCatalog";
import { STALE } from "@/lib/query-constants";

/** Idempotently create a personal habit linked to a challenge for the current user. */
async function ensureChallengeHabit(args: {
  challengeId: string;
  householdId: string;
  userId: string;
  name: string;
}) {
  const { data: existing } = await supabase
    .from("habits")
    .select("id")
    .eq("challenge_id", args.challengeId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: habit, error } = await supabase
    .from("habits")
    .insert({
      household_id: args.householdId,
      user_id: args.userId,
      name: args.name,
      assignment_type: "personal",
      frequency_type: "daily",
      frequency_days: [],
      is_active: true,
      challenge_id: args.challengeId,
    } as any)
    .select("id")
    .single();
  if (error) throw error;

  await supabase
    .from("habit_assignees")
    .insert({ habit_id: habit.id, user_id: args.userId });

  return habit.id as string;
}

export const useChallenges = (householdId: string | null) => {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const invalidateHabitQueries = () => {
    qc.invalidateQueries({ queryKey: ["challenges", householdId] });
    qc.invalidateQueries({ queryKey: ["habits", householdId] });
    qc.invalidateQueries({ queryKey: ["habit-logs-today"] });
    qc.invalidateQueries({ queryKey: ["household-habit-stats"] });
    qc.invalidateQueries({ queryKey: ["habit-leaderboard"] });
    qc.invalidateQueries({ queryKey: ["habit-scores"] });
  };

  const challengesQuery = useQuery({
    queryKey: ["challenges", householdId],
    staleTime: STALE.MEDIUM,
    queryFn: async (): Promise<ChallengeWithDetails[]> => {
      if (!householdId) return [];
      const { data: challenges, error } = await supabase
        .from("household_challenges")
        .select("*")
        .eq("household_id", householdId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!challenges || challenges.length === 0) return [];

      const ids = challenges.map((c) => c.id);
      const [{ data: parts }, { data: logs }] = await Promise.all([
        supabase.from("challenge_participants").select("*").in("challenge_id", ids),
        supabase.from("challenge_logs").select("*").in("challenge_id", ids).eq("log_date", today),
      ]);

      return (challenges as Challenge[]).map((c) => ({
        ...c,
        participants: ((parts || []) as ChallengeParticipant[]).filter((p) => p.challenge_id === c.id),
        todayLogs: ((logs || []) as ChallengeLog[]).filter((l) => l.challenge_id === c.id),
      }));
    },
    enabled: !!householdId,
  });

  const startChallenge = useMutation({
    mutationFn: async (args: { template: ChallengeTemplate; durationDays: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !householdId) throw new Error("Not signed in");
      const start = new Date();
      const end = addDays(start, args.durationDays - 1);
      const { data: ch, error } = await supabase
        .from("household_challenges")
        .insert({
          household_id: householdId,
          template_id: args.template.id,
          name: args.template.name,
          emoji: args.template.emoji,
          description: args.template.description,
          duration_days: args.durationDays,
          start_date: format(start, "yyyy-MM-dd"),
          end_date: format(end, "yyyy-MM-dd"),
          started_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("challenge_participants").insert({ challenge_id: ch.id, user_id: user.id });
      await ensureChallengeHabit({
        challengeId: ch.id,
        householdId,
        userId: user.id,
        name: args.template.name,
      });
      return ch;
    },
    onSuccess: () => {
      toast.success("Challenge started! 🎉");
      invalidateHabitQueries();
    },
    onError: (e: any) => toast.error(e.message || "Could not start challenge"),
  });

  const joinChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !householdId) throw new Error("Not signed in");
      const { error } = await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: user.id });
      if (error && !error.message.includes("duplicate")) throw error;
      const { data: ch } = await supabase
        .from("household_challenges")
        .select("name")
        .eq("id", challengeId)
        .maybeSingle();
      if (ch?.name) {
        await ensureChallengeHabit({
          challengeId,
          householdId,
          userId: user.id,
          name: ch.name,
        });
      }
    },
    onSuccess: () => {
      toast.success("You're in! 💪");
      invalidateHabitQueries();
    },
    onError: (e: any) => toast.error(e.message || "Could not join challenge"),
  });

  const markDone = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("challenge_logs").insert({
        challenge_id: challengeId,
        user_id: user.id,
        log_date: today,
      });
      if (error && !error.message.includes("duplicate")) throw error;
      // Mirror completion onto the linked personal habit, if any.
      const { data: linkedHabit } = await supabase
        .from("habits")
        .select("id")
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (linkedHabit?.id) {
        const { data: existingLog } = await supabase
          .from("habit_logs")
          .select("id, completed")
          .eq("habit_id", linkedHabit.id)
          .eq("user_id", user.id)
          .eq("log_date", today)
          .maybeSingle();
        if (existingLog?.id) {
          if (!existingLog.completed) {
            await supabase
              .from("habit_logs")
              .update({ completed: true, logged_at: new Date().toISOString() })
              .eq("id", existingLog.id);
          }
        } else {
          await supabase.from("habit_logs").insert({
            habit_id: linkedHabit.id,
            user_id: user.id,
            log_date: today,
            completed: true,
          });
        }
      }
    },
    onSuccess: () => {
      invalidateHabitQueries();
    },
    onError: (e: any) => toast.error(e.message || "Could not mark done"),
  });

  const abandonChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from("household_challenges")
        .update({ status: "abandoned" })
        .eq("id", challengeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast("Challenge ended");
      qc.invalidateQueries({ queryKey: ["challenges", householdId] });
    },
  });

  const inviteMembers = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase.functions.invoke("notify-challenge-invite", {
        body: { challengeId },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Invitations sent"),
    onError: (e: any) => toast.error(e.message || "Could not send invites"),
  });

  return {
    challenges: challengesQuery.data || [],
    isLoading: challengesQuery.isLoading,
    startChallenge,
    joinChallenge,
    markDone,
    abandonChallenge,
    inviteMembers,
  };
};

export const challengeDayInfo = (c: { start_date: string; end_date: string; duration_days: number }) => {
  const today = new Date();
  const start = new Date(c.start_date + "T00:00:00");
  const end = new Date(c.end_date + "T00:00:00");
  const dayNumber = Math.max(1, differenceInCalendarDays(today, start) + 1);
  const daysRemaining = Math.max(0, differenceInCalendarDays(end, today));
  return { dayNumber: Math.min(dayNumber, c.duration_days), daysRemaining };
};