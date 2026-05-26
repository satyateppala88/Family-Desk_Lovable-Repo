import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { STALE } from "@/lib/query-constants";

export interface UserCard {
  id: string;
  household_id: string;
  card_catalog_id: string;
  nickname: string | null;
  is_active: boolean;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export function useUserCards(householdId: string | undefined) {
  return useQuery({
    queryKey: ["user-cards", householdId],
    enabled: !!householdId,
    staleTime: STALE.MEDIUM,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_user_cards")
        .select("*")
        .eq("household_id", householdId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserCard[];
    },
  });
}

export function useAddUserCard(householdId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { card_catalog_id: string; nickname?: string }) => {
      const { data: row, error } = await supabase.from("finance_user_cards").insert({
        household_id: householdId!,
        card_catalog_id: data.card_catalog_id,
        nickname: data.nickname || null,
        added_by: user!.id,
      }).select().single();
      if (error) throw error;
      return row as UserCard;
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["user-cards", householdId] });
      const optimistic: UserCard = {
        id: `optimistic-${Date.now()}`,
        household_id: householdId!,
        card_catalog_id: data.card_catalog_id,
        nickname: data.nickname || null,
        is_active: true,
        added_by: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      qc.getQueriesData<UserCard[]>({ queryKey: ["user-cards", householdId] })
        .forEach(([key, prev]) => {
          snapshots.push([key, prev]);
          if (Array.isArray(prev)) qc.setQueryData(key, [optimistic, ...prev]);
        });
      toast.success("Card added to your wallet");
      return { snapshots, optimisticId: optimistic.id };
    },
    onError: (_e, _v, ctx: any) => {
      ctx?.snapshots?.forEach(([key, prev]: any) => qc.setQueryData(key, prev));
      toast.error("Failed to add card");
    },
    onSuccess: (row, _v, ctx: any) => {
      if (!row) return;
      qc.getQueriesData<UserCard[]>({ queryKey: ["user-cards", householdId] })
        .forEach(([key, list]) => {
          if (!Array.isArray(list)) return;
          qc.setQueryData(key, list.map((c) => (c.id === ctx?.optimisticId ? row : c)));
        });
      qc.invalidateQueries({ queryKey: ["user-cards", householdId] });
    },
  });
}

export function useRemoveUserCard(householdId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_user_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["user-cards", householdId] });
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      qc.getQueriesData<UserCard[]>({ queryKey: ["user-cards", householdId] })
        .forEach(([key, list]) => {
          snapshots.push([key, list]);
          if (Array.isArray(list)) qc.setQueryData(key, list.filter((c) => c.id !== id));
        });
      toast.success("Card removed");
      return { snapshots };
    },
    onError: (_e, _v, ctx: any) => {
      ctx?.snapshots?.forEach(([key, prev]: any) => qc.setQueryData(key, prev));
      toast.error("Failed to remove card");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-cards", householdId] });
    },
  });
}
