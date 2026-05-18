import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { RecurrenceSpec } from "@/types/recurrence";

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
  recurrence?: RecurrenceSpec | null;
}

export type SubscriptionInput = Omit<FinanceSubscription, "id" | "household_id" | "created_by" | "created_at" | "updated_at" | "recurrence"> & {
  recurrence?: RecurrenceSpec | null;
};

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
      return data as unknown as FinanceSubscription[];
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
      const { recurrence, ...rest } = input;
      const { data, error } = await supabase.from("finance_subscriptions").insert({
        ...rest,
        recurrence: (recurrence ?? null) as any,
        household_id: householdId,
        created_by: user.id,
      }).select().single();
      if (error) throw error;
      return data as unknown as FinanceSubscription;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["finance-subscriptions", householdId] });
      const optimistic: FinanceSubscription = {
        id: `optimistic-${Date.now()}`,
        household_id: householdId!,
        created_by: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...input,
      } as FinanceSubscription;
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      qc.getQueriesData<FinanceSubscription[]>({ queryKey: ["finance-subscriptions", householdId] })
        .forEach(([key, prev]) => {
          snapshots.push([key, prev]);
          if (Array.isArray(prev)) qc.setQueryData(key, [optimistic, ...prev]);
        });
      return { snapshots, optimisticId: optimistic.id };
    },
    onError: (error, _v, ctx: any) => {
      ctx?.snapshots?.forEach(([key, prev]: any) => qc.setQueryData(key, prev));
      toast.error("Could not add subscription", {
        description: (error as Error)?.message,
      });
    },
    onSuccess: (row, _v, ctx: any) => {
      if (!row) return;
      qc.getQueriesData<FinanceSubscription[]>({ queryKey: ["finance-subscriptions", householdId] })
        .forEach(([key, list]) => {
          if (!Array.isArray(list)) return;
          qc.setQueryData(key, list.map((s) => (s.id === ctx?.optimisticId ? row : s)));
        });
      qc.invalidateQueries({ queryKey: ["finance-subscriptions", householdId] });
      toast.success("Subscription added");
    },
  });
};

export const useUpdateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FinanceSubscription> & { id: string }) => {
      const { id, recurrence, ...rest } = input;
      const { data, error } = await supabase
        .from("finance_subscriptions")
        .update({ ...rest, ...(recurrence !== undefined ? { recurrence: recurrence as any } : {}), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FinanceSubscription;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["finance-subscriptions"] });
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      qc.getQueriesData<FinanceSubscription[]>({ queryKey: ["finance-subscriptions"] })
        .forEach(([key, list]) => {
          snapshots.push([key, list]);
          if (Array.isArray(list)) {
            qc.setQueryData(key, list.map((s) => (s.id === vars.id ? { ...s, ...vars } as FinanceSubscription : s)));
          }
        });
      toast.success("Subscription updated");
      return { snapshots };
    },
    onError: (_e, _v, ctx: any) => {
      ctx?.snapshots?.forEach(([key, prev]: any) => qc.setQueryData(key, prev));
      toast.error("Failed to update");
    },
    onSuccess: (row) => {
      if (row) {
        qc.getQueriesData<FinanceSubscription[]>({ queryKey: ["finance-subscriptions"] })
          .forEach(([key, list]) => {
            if (!Array.isArray(list)) return;
            qc.setQueryData(key, list.map((s) => (s.id === row.id ? row : s)));
          });
      }
      qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
    },
  });
};

export const useDeleteSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["finance-subscriptions"] });
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      qc.getQueriesData<FinanceSubscription[]>({ queryKey: ["finance-subscriptions"] })
        .forEach(([key, list]) => {
          snapshots.push([key, list]);
          if (Array.isArray(list)) qc.setQueryData(key, list.filter((s) => s.id !== id));
        });
      toast.success("Subscription removed");
      return { snapshots };
    },
    onError: (_e, _v, ctx: any) => {
      ctx?.snapshots?.forEach(([key, prev]: any) => qc.setQueryData(key, prev));
      toast.error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
    },
  });
};
