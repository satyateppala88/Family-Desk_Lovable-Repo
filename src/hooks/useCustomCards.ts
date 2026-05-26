import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CardBenefit, MilestoneBenefit } from "@/data/creditCardCatalog";
import { STALE } from "@/lib/query-constants";

export interface CustomCard {
  id: string;
  household_id: string;
  name: string;
  bank: string;
  network: string;
  annual_fee: number;
  color: string;
  benefits: CardBenefit[];
  milestones: MilestoneBenefit[];
  perks: string[];
  source: string | null;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export function useCustomCards(householdId: string | undefined) {
  return useQuery({
    queryKey: ["custom-cards", householdId],
    enabled: !!householdId,
    staleTime: STALE.LONG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_custom_cards")
        .select("*")
        .eq("household_id", householdId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown) as CustomCard[];
    },
  });
}

export function useAddCustomCard(householdId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (card: Omit<CustomCard, "id" | "household_id" | "added_by" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("finance_custom_cards")
        .insert({
          household_id: householdId!,
          added_by: user!.id,
          name: card.name,
          bank: card.bank,
          network: card.network,
          annual_fee: card.annual_fee,
          color: card.color,
          benefits: card.benefits as any,
          milestones: card.milestones as any,
          perks: card.perks as any,
          source: card.source,
        })
        .select()
        .single();
      if (error) throw error;
      return (data as unknown) as CustomCard;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-cards", householdId] });
      toast.success("Card added to your wallet");
    },
    onError: () => toast.error("Failed to add card"),
  });
}

export function useRemoveCustomCard(householdId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_custom_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-cards", householdId] });
      toast.success("Card removed");
    },
    onError: () => toast.error("Failed to remove card"),
  });
}