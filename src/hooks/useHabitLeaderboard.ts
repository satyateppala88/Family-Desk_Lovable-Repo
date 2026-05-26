import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, format } from "date-fns";
import { LeaderboardEntry } from "@/types/habits";
import { STALE } from "@/lib/query-constants";

export const useHabitLeaderboard = (householdId: string | null) => {
  const today = new Date();
  const weekStart = format(startOfWeek(today), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["habit-leaderboard", householdId, weekStart],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!householdId) return [];

      // Fetch household members with profiles
      const { data: members, error: membersError } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const userIds = members.map((m) => m.user_id);

      // Fetch profiles for member names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      // Fetch weekly scores
      const { data: weeklyScores } = await supabase
        .from("habit_scores")
        .select("user_id, daily_score, streak_bonus, total_score")
        .eq("household_id", householdId)
        .gte("score_date", weekStart)
        .lte("score_date", weekEnd);

      // Fetch monthly scores
      const { data: monthlyScores } = await supabase
        .from("habit_scores")
        .select("user_id, daily_score, streak_bonus, total_score")
        .eq("household_id", householdId)
        .gte("score_date", monthStart)
        .lte("score_date", monthEnd);

      // Aggregate scores by user
      const weeklyTotals = new Map<string, { score: number; streakBonus: number }>();
      const monthlyTotals = new Map<string, number>();

      (weeklyScores || []).forEach((s) => {
        const current = weeklyTotals.get(s.user_id) || { score: 0, streakBonus: 0 };
        weeklyTotals.set(s.user_id, {
          score: current.score + s.total_score,
          streakBonus: current.streakBonus + s.streak_bonus,
        });
      });

      (monthlyScores || []).forEach((s) => {
        const current = monthlyTotals.get(s.user_id) || 0;
        monthlyTotals.set(s.user_id, current + s.total_score);
      });

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = userIds.map((userId) => {
        const profile = profileMap.get(userId);
        const weekly = weeklyTotals.get(userId) || { score: 0, streakBonus: 0 };
        const monthly = monthlyTotals.get(userId) || 0;

        return {
          userId,
          displayName: profile?.display_name || "Member",
          avatarUrl: profile?.avatar_url || null,
          weeklyScore: weekly.score,
          monthlyScore: monthly,
          rank: 0, // Will be set after sorting
          previousRank: null, // TODO: Could track previous week's rank
          streakBonus: weekly.streakBonus,
        };
      });

      // Sort by weekly score and assign ranks
      entries.sort((a, b) => b.weeklyScore - a.weeklyScore);
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return entries;
    },
    enabled: !!householdId,
    staleTime: STALE.MEDIUM,
  });
};
