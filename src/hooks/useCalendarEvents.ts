import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "./useHousehold";
import { startOfMonth, endOfMonth, format, addDays, startOfWeek, endOfWeek } from "date-fns";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  calendarName: string;
  calendarOwner: string;
  calendarId: string;
  location?: string;
  description?: string;
}

export const useCalendarEvents = (
  currentDate: Date,
  view: "month" | "week" | "day" = "month"
) => {
  const { householdId } = useHousehold();

  // Calculate date range based on view
  const getDateRange = () => {
    switch (view) {
      case "day":
        return {
          start: format(currentDate, "yyyy-MM-dd"),
          end: format(addDays(currentDate, 1), "yyyy-MM-dd"),
        };
      case "week":
        return {
          start: format(startOfWeek(currentDate), "yyyy-MM-dd"),
          end: format(addDays(endOfWeek(currentDate), 1), "yyyy-MM-dd"),
        };
      case "month":
      default:
        // Include days from adjacent months that appear in the calendar grid
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: format(startOfWeek(monthStart), "yyyy-MM-dd"),
          end: format(addDays(endOfWeek(monthEnd), 1), "yyyy-MM-dd"),
        };
    }
  };

  const { start, end } = getDateRange();

  return useQuery({
    queryKey: ["calendar-events", householdId, start, end],
    queryFn: async () => {
      if (!householdId) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const response = await supabase.functions.invoke("fetch-calendar-events", {
        body: { startDate: start, endDate: end, householdId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return (response.data?.events || []) as CalendarEvent[];
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// Hook for dashboard widget - fetches today's events
export const useTodayEvents = () => {
  const { householdId } = useHousehold();
  const today = new Date();
  const start = format(today, "yyyy-MM-dd");
  const end = format(addDays(today, 1), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["calendar-events-today", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const response = await supabase.functions.invoke("fetch-calendar-events", {
        body: { startDate: start, endDate: end, householdId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return (response.data?.events || []) as CalendarEvent[];
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5,
  });
};
