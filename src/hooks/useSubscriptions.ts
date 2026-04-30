import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FinanceSubscription {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "quarterly" | "half_yearly" | "yearly" | "weekly";
  category: string;
  next_due_date: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type SubscriptionInput = Omit<FinanceSubscription, "id" | "household_id" | "created_by" | "created_at" | "updated_at">;

export const SUBSCRIPTION_CATEGORIES = [
  "streaming",
  "music",
  "cloud_storage",
  "insurance",
  "amc",
  "gym_fitness",
  "education",
  "software",
  "newspaper_magazine",
  "telecom",
  "utilities",
  "maintenance",
  "emi",
  "other",
] as const;

export const SUBSCRIPTION_CATEGORY_LABELS: Record<string, string> = {
  streaming: "Streaming",
  music: "Music",
  cloud_storage: "Cloud / Storage",
  insurance: "Insurance",
  amc: "AMC / Maintenance",
  gym_fitness: "Gym & Fitness",
  education: "Education",
  software: "Software / Apps",
  newspaper_magazine: "News & Magazines",
  telecom: "Telecom / Internet",
  utilities: "Utilities",
  maintenance: "Maintenance",
  emi: "EMI / Loan",
  other: "Other",
};

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  yearly: "Yearly",
};

export const useSubscriptions = (householdId: string | null) => {
  return useQuery({
    queryKey: ["finance-subscriptions", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("finance_subscriptions")
        .select("*")
        .eq("household_id", householdId)
        .order("next_due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as FinanceSubscription[];
    },
    enabled: !!householdId,
  });
};

export const useCreateSubscription = (householdId: string | null) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubscriptionInput) => {
      if (!householdId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("finance_subscriptions").insert({
        ...input,
        household_id: householdId,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-subscriptions", householdId] });
      toast.success("Subscription added");
    },
    onError: () => toast.error("Failed to add subscription"),
  });
};

export const useUpdateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FinanceSubscription> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase
        .from("finance_subscriptions")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
      toast.success("Subscription updated");
    },
    onError: () => toast.error("Failed to update"),
  });
};

export const useDeleteSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
      toast.success("Subscription removed");
    },
    onError: () => toast.error("Failed to delete"),
  });
};
