import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "./useHousehold";
import type { RecurrenceSpec } from "@/types/recurrence";

interface CreateManualEventInput {
  title: string;
  description?: string | null;
  date: Date;
  time?: string | null; // "HH:mm" or null
  allDay: boolean;
  recurrence?: RecurrenceSpec | null;
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

/** Map shared recurrence spec → legacy repeat_type for backwards compatibility. */
function deriveRepeatType(rec: RecurrenceSpec | null | undefined): string {
  if (!rec) return 'none';
  return rec.frequency;
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

      const { data, error } = await supabase
        .from("manual_calendar_events")
        .insert({
          household_id: householdId,
          created_by: user.id,
          title: input.title,
          description: input.description ?? null,
          start_at: startAt,
          end_at: endAt,
          all_day: isAllDay,
          repeat_type: deriveRepeatType(input.recurrence),
          recurrence: (input.recurrence ?? null) as any,
          member_ids: input.memberIds ?? [],
        } as any)
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
      const { data, error } = await supabase
        .from("manual_calendar_events")
        .update({
          title: input.title,
          description: input.description ?? null,
          start_at: startAt,
          end_at: endAt,
          all_day: isAllDay,
          repeat_type: deriveRepeatType(input.recurrence),
          recurrence: (input.recurrence ?? null) as any,
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
      const { error } = await supabase
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

export type RecurringEditScope = "this" | "future" | "all";

interface UpdateRecurringEventInput extends CreateManualEventInput {
  id: string;
  scope: RecurringEditScope;
  /** yyyy-MM-dd of the tapped occurrence */
  occurrenceDate: string;
}

/** Subtract one day from a yyyy-MM-dd string. */
function prevDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return format(d, "yyyy-MM-dd");
}

export const useUpdateRecurringEvent = () => {
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateRecurringEventInput) => {
      if (!householdId) throw new Error("No household selected");
      if (!user) throw new Error("Not signed in");

      const { startAt, endAt, isAllDay } = deriveTimes(input.date, input.time, input.allDay);

      if (input.scope === "all") {
        const { data, error } = await supabase
          .from("manual_calendar_events")
          .update({
            title: input.title,
            description: input.description ?? null,
            start_at: startAt,
            end_at: endAt,
            all_day: isAllDay,
            repeat_type: deriveRepeatType(input.recurrence),
            recurrence: (input.recurrence ?? null) as any,
            ...(input.memberIds ? { member_ids: input.memberIds } : {}),
          })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      if (input.scope === "this") {
        // 1) Append the occurrence date to the parent's exception_dates.
        const { data: parent, error: parentErr } = await supabase
          .from("manual_calendar_events")
          .select("exception_dates")
          .eq("id", input.id)
          .single();
        if (parentErr) throw parentErr;
        const nextExceptions = Array.from(
          new Set([...(parent?.exception_dates ?? []), input.occurrenceDate]),
        );
        const { error: updErr } = await supabase
          .from("manual_calendar_events")
          .update({ exception_dates: nextExceptions })
          .eq("id", input.id);
        if (updErr) throw updErr;

        // 2) Insert a single-occurrence override child.
        const { data, error } = await supabase
          .from("manual_calendar_events")
          .insert({
            household_id: householdId,
            created_by: user.id,
            title: input.title,
            description: input.description ?? null,
            start_at: startAt,
            end_at: endAt,
            all_day: isAllDay,
            repeat_type: "none",
            recurrence: null,
            member_ids: input.memberIds ?? [],
            parent_event_id: input.id,
          } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // scope === "future"
      // 1) End the parent the day before this occurrence.
      const { data: parent, error: parentErr } = await supabase
        .from("manual_calendar_events")
        .select("recurrence")
        .eq("id", input.id)
        .single();
      if (parentErr) throw parentErr;
      const existingRec = (parent?.recurrence ?? null) as unknown as RecurrenceSpec | null;
      if (existingRec) {
        const updatedRec: RecurrenceSpec = {
          ...existingRec,
          end: { type: "on_date", date: prevDay(input.occurrenceDate) },
        };
        const { error: updErr } = await supabase
          .from("manual_calendar_events")
          .update({ recurrence: updatedRec as any })
          .eq("id", input.id);
        if (updErr) throw updErr;
      }

      // 2) Insert a new recurring event starting at this occurrence.
      const { data, error } = await supabase
        .from("manual_calendar_events")
        .insert({
          household_id: householdId,
          created_by: user.id,
          title: input.title,
          description: input.description ?? null,
          start_at: startAt,
          end_at: endAt,
          all_day: isAllDay,
          repeat_type: deriveRepeatType(input.recurrence),
          recurrence: (input.recurrence ?? null) as any,
          member_ids: input.memberIds ?? [],
        } as any)
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