import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Challenge, ChallengeParticipant, ChallengeLog, ChallengeWithDetails } from "@/types/habits";
import type { ChallengeTemplate } from "@/data/challengeCatalog";

export const useChallenges = (householdId: string | null) => {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const challengesQuery = useQuery({
    queryKey: ["challenges", householdId],
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
      return ch;
    },
    onSuccess: () => {
      toast.success("Challenge started! 🎉");
      qc.invalidateQueries({ queryKey: ["challenges", householdId] });
    },
    onError: (e: any) => toast.error(e.message || "Could not start challenge"),
  });

  const joinChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: user.id });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("You're in! 💪");
      qc.invalidateQueries({ queryKey: ["challenges", householdId] });
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges", householdId] });
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