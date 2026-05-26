import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

/**
 * Subscribe to all finance tables for the given household so any member's
 * insert/update/delete is reflected on every other member's screen within ~1s.
 */
export const useFinanceRealtime = (householdId: string | null) => {
  const filter = householdId ? `household_id=eq.${householdId}` : undefined;
  useRealtimeSubscription([
    {
      table: "finance_transactions",
      filter,
      enabled: !!householdId,
      queryKeys: [
        ["finance-transactions", householdId],
        ["finance-monthly-summary", householdId],

        ["finance-snapshot", householdId],
      ],
    },
    {
      table: "finance_budgets",
      filter,
      enabled: !!householdId,
      queryKeys: [["finance-budgets", householdId]],
    },
    {
      table: "finance_savings_goals",
      filter,
      enabled: !!householdId,
      queryKeys: [["finance-savings-goals", householdId]],
    },
    {
      table: "finance_subscriptions",
      filter,
      enabled: !!householdId,
      queryKeys: [["finance-subscriptions", householdId]],
    },
    {
      table: "finance_user_cards",
      filter,
      enabled: !!householdId,
      queryKeys: [["user-cards", householdId]],
    },
  ], householdId);
};