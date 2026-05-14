import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "./useHousehold";

interface CreateManualEventInput {
  title: string;
  description?: string | null;
  date: Date;
  time?: string | null; // "HH:mm" or null
  allDay: boolean;
  repeatType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  memberIds?: string[];
}

function deriveTimes(date: Date, time: string | null | undefined, allDay: boolean) {
  const day = format(date, "yyyy-MM-dd");
  const isAllDay = allDay || !time;
  if (isAllDay) {
    const start = new Date(`${day}T00:00:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { startAt: start.toISOString(), endAt: end.toISOString(), isAllDay: true };
  }
  const start = new Date(`${day}T${time}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString(), isAllDay: false };
}

export const useCreateManualEvent = () => {
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateManualEventInput) => {
      if (!householdId) throw new Error("No household selected");
      if (!user) throw new Error("Not signed in");

      const { startAt, endAt, isAllDay } = deriveTimes(input.date, input.time, input.allDay);

      const { data, error } = await (supabase as any)
        .from("manual_calendar_events")
        .insert({
          household_id: householdId,
          created_by: user.id,
          title: input.title,
          description: input.description ?? null,
          start_at: startAt,
          end_at: endAt,
          all_day: isAllDay,
          repeat_type: input.repeatType ?? 'none',
          member_ids: input.memberIds ?? [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events-today"] });
    },
  });
};

interface UpdateManualEventInput extends CreateManualEventInput {
  id: string;
}

export const useUpdateManualEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateManualEventInput) => {
      const { startAt, endAt, isAllDay } = deriveTimes(input.date, input.time, input.allDay);
      const { data, error } = await (supabase as any)
        .from("manual_calendar_events")
        .update({
          title: input.title,
          description: input.description ?? null,
          start_at: startAt,
          end_at: endAt,
          all_day: isAllDay,
          repeat_type: input.repeatType ?? 'none',
          ...(input.memberIds ? { member_ids: input.memberIds } : {}),
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events-today"] });
    },
  });
};

export const useDeleteManualEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("manual_calendar_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events-today"] });
    },
  });
};