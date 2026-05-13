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
}

export const useCreateManualEvent = () => {
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateManualEventInput) => {
      if (!householdId) throw new Error("No household selected");
      if (!user) throw new Error("Not signed in");

      const day = format(input.date, "yyyy-MM-dd");
      let startAt: string;
      let endAt: string;

      if (input.allDay || !input.time) {
        // Treat as midnight-to-next-midnight in local time
        const start = new Date(`${day}T00:00:00`);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        startAt = start.toISOString();
        endAt = end.toISOString();
      } else {
        const start = new Date(`${day}T${input.time}:00`);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1h
        startAt = start.toISOString();
        endAt = end.toISOString();
      }

      const { data, error } = await (supabase as any)
        .from("manual_calendar_events")
        .insert({
          household_id: householdId,
          created_by: user.id,
          title: input.title,
          description: input.description ?? null,
          start_at: startAt,
          end_at: endAt,
          all_day: input.allDay,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-events"] });
    },
  });
};