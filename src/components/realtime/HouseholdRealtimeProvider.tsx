import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";

/**
 * One persistent Postgres-changes subscription per logged-in household.
 *
 * Mounted once at the app shell so every household member receives live
 * updates from every shared module — even if they are not currently on
 * that module's page. Per-page `useRealtimeSubscription` calls remain as
 * fast-path fallbacks; this provider is the safety net.
 */

const isDev =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;

/**
 * Map of shared tables → React Query keys to invalidate when any row changes
 * for the current household. Keys use the same shapes the hooks use.
 */
function buildKeyMap(householdId: string): Record<string, (string | undefined)[][]> {
  return {
    // Taskmaster
    tasks: [
      ["tasks", householdId],
      ["taskmaster-tasks", householdId],
      ["daily-plan", householdId],
      ["dashboard-stats", householdId],
    ],
    task_assignees: [
      ["tasks", householdId],
      ["taskmaster-tasks", householdId],
    ],
    task_comments: [["taskmaster-tasks", householdId]],
    projects: [["projects", householdId]],
    daily_plans: [["daily-plan", householdId]],
    daily_plan_items: [["daily-plan", householdId]],

    // Meals & grocery
    meal_plans: [["meal-plans", householdId], ["dashboard-stats", householdId]],
    meal_plan_items: [["meal-plans", householdId]],
    shopping_lists: [["shopping-lists", householdId]],
    shopping_list_items: [["shopping-lists", householdId]],
    pantry_items: [
      ["pantry-items", householdId],
      ["pantry-stats", householdId],
      ["dashboard-stats", householdId],
    ],

    // Finance
    finance_accounts: [["finance-accounts", householdId]],
    finance_transactions: [
      ["finance-transactions", householdId],
      ["finance-monthly-summary", householdId],
      ["finance-dashboard", householdId],
      ["finance-snapshot", householdId],
    ],
    finance_budgets: [["finance-budgets", householdId]],
    finance_savings_goals: [["finance-savings-goals", householdId]],
    finance_subscriptions: [["finance-subscriptions", householdId]],
    finance_user_cards: [["user-cards", householdId]],
    finance_custom_cards: [["custom-cards", householdId]],
    finance_custom_categories: [["finance-custom-categories", householdId]],
    finance_monthly_snapshots: [["finance-snapshot", householdId]],

    // Habits
    habits: [["habits", householdId], ["habit-assignees", householdId]],
    habit_assignees: [["habit-assignees", householdId], ["habits", householdId]],
    habit_logs: [
      ["habit-logs-today"],
      ["household-habit-stats"],
      ["habit-leaderboard"],
      ["habit-scores"],
    ],
    habit_streaks: [["habit-streaks"]],
    habit_scores: [["habit-leaderboard"], ["habit-scores"]],
    household_habit_goals: [["household-habit-goals", householdId]],

    // Household
    household_members: [
      ["household-members", householdId],
      ["household-member-emails", householdId],
      ["household", undefined],
    ],
    household_family_members: [["household-family-members", householdId]],
    household_enabled_products: [
      ["enabled-products", householdId],
      ["onboarding-progress", householdId],
    ],

    // AI
    ai_suggestions: [["ai-suggestions", householdId]],

    // Calendar
    calendar_settings: [["calendar-settings", householdId]],
  };
}

export const HouseholdRealtimeProvider = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !householdId) return;

    const keyMap = buildKeyMap(householdId);
    const tables = Object.keys(keyMap);
    const filter = `household_id=eq.${householdId}`;
    const channelName = `household-${householdId}`;

    let channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel = channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table, filter },
        () => {
          for (const key of keyMap[table]) {
            // Use prefix-based invalidation so all variants (filters, paginations) update.
            queryClient.invalidateQueries({ queryKey: key.filter(Boolean) as any });
          }
        }
      );
    });

    channel.subscribe((status, err) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.debug(`[realtime] ${channelName} → ${status}`, err ?? "");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        // eslint-disable-next-line no-console
        console.warn(`[realtime] ${channelName} ${status}`, err ?? "");
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, householdId, queryClient]);

  return null;
};
