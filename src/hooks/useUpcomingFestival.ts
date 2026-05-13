import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format } from "date-fns";

export interface UpcomingFestival {
  id: string;
  name: string;
  event_date: string; // YYYY-MM-DD
  daysAway: number;
}

export const useUpcomingFestival = () => {
  return useQuery({
    queryKey: ["upcoming-festival"],
    queryFn: async (): Promise<UpcomingFestival | null> => {
      const today = new Date();
      const startStr = format(today, "yyyy-MM-dd");
      const endStr = format(addDays(today, 14), "yyyy-MM-dd");

      const { data, error } = await (supabase as any)
        .from("system_calendar_events")
        .select("id, name, event_date, kind")
        .eq("kind", "festival")
        .gte("event_date", startStr)
        .lte("event_date", endStr)
        .order("event_date", { ascending: true })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const f = data[0];
      const eventDate = new Date(`${f.event_date}T00:00:00`);
      const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const daysAway = Math.round((eventDate.getTime() - today0.getTime()) / 86400000);
      return { id: f.id, name: f.name, event_date: f.event_date, daysAway };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};