import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
      const { error } = await supabase.from("finance_user_cards").insert({
        household_id: householdId!,
        card_catalog_id: data.card_catalog_id,
        nickname: data.nickname || null,
        added_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-cards", householdId] });
      toast.success("Card added to your wallet");
    },
    onError: () => toast.error("Failed to add card"),
  });
}

export function useRemoveUserCard(householdId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_user_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-cards", householdId] });
      toast.success("Card removed");
    },
    onError: () => toast.error("Failed to remove card"),
  });
}
