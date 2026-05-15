import { useState } from "react";
import { Sparkles, X, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpcomingFestival } from "@/hooks/useUpcomingFestival";
import { matchFestivalChecklist } from "@/data/festivalChecklists";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, isToday, isTomorrow, parseISO } from "date-fns";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useNavigate } from "react-router-dom";

// Once a user dismisses an event nudge or festival banner, keep it dismissed
// for 30 days. The previous 3-day window made the same reminder reappear
// repeatedly for the same upcoming event.
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const isDismissed = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true; // legacy "1" value -> hide
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
};

const setDismissedKey = (key: string) => {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {}
};

// Permanent per-event dismissal for the calendar event nudge banner.
// Once a user closes a specific event nudge it never reappears.
const eventNudgeKey = (idOrDate: string) =>
  `familydesk:event-nudge-dismissed:${idOrDate}`;
const isEventNudgeDismissed = (key: string) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};
const markEventNudgeDismissed = (key: string) => {
  try {
    localStorage.setItem(key, "true");
  } catch {}
};

export const FestivalBanner = () => {
  const { data: festival } = useUpcomingFestival();
  const { householdId } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: weekEvents } = useCalendarEvents(new Date(), "week");
  const [busy, setBusy] = useState(false);
  const [dismissTick, setDismissTick] = useState(0); // bump to re-eval dismissals

  // Festival branch (takes precedence)
  if (festival) {
    const dismissKey = `festival-banner-dismissed-${festival.id}`;
    const checklist = matchFestivalChecklist(festival.name);
    if (checklist && !isDismissed(dismissKey)) {
      const dismiss = () => {
        setDismissedKey(dismissKey);
        setDismissTick((n) => n + 1);
      };

      const handleAdd = async () => {
    if (!householdId || !user) return;
    setBusy(true);
    try {
      const dueDate = format(addDays(new Date(festival.event_date), -1), "yyyy-MM-dd");
      const rows = checklist.map((title) => ({
        household_id: householdId,
        created_by: user.id,
        title,
        status: "pending",
        due_date: dueDate,
      }));
      const { error } = await (supabase as any).from("tasks").insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["tasks", householdId] });
      toast({
        title: `Added ${rows.length} tasks`,
        description: `Open Taskmaster to see your ${festival.name} prep list.`,
      });
      dismiss();
    } catch (err: any) {
      toast({ title: "Couldn't add checklist", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
      };

      const dayWord = festival.daysAway === 1 ? "day" : "days";
      const inText = festival.daysAway === 0
    ? "is today"
    : `is in ${festival.daysAway} ${dayWord}`;

      return (
    <Card className="mb-4 border-orange-200 bg-orange-50/50">
      <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-start gap-3 flex-1">
          <div className="rounded-full bg-orange-100 p-2 mt-0.5">
            <Sparkles className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-sm flex-1">
            <span className="font-medium">{festival.name}</span> {inText} — want to add a preparation checklist to Tasks?
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button size="sm" onClick={handleAdd} disabled={busy} className="flex-1 sm:flex-initial">
            {busy ? "Adding…" : "Add checklist"}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
      );
    }
  }

  // Calendar event branch — today or tomorrow
  const upcoming = (weekEvents || []).find((e: any) => {
    const d = e.start_date || e.start_time || e.start;
    if (!d) return false;
    try {
      const dt = typeof d === "string" ? parseISO(d) : new Date(d);
      return isToday(dt) || isTomorrow(dt);
    } catch {
      return false;
    }
  });

  if (upcoming) {
    const rawDate =
      (upcoming as any).start_date ||
      (upcoming as any).start_time ||
      (upcoming as any).start ||
      "";
    const eventId =
      (upcoming as any).id || (upcoming as any).event_id || rawDate;
    const dismissKey = eventNudgeKey(String(eventId));
    if (!isEventNudgeDismissed(dismissKey)) {
      const d = (upcoming as any).start_date || (upcoming as any).start_time || (upcoming as any).start;
      const dt = typeof d === "string" ? parseISO(d) : new Date(d);
      const when = isToday(dt) ? "today" : "tomorrow";
      const title = (upcoming as any).title || (upcoming as any).summary || "Event";
      const dismiss = () => {
        markEventNudgeDismissed(dismissKey);
        setDismissTick((n) => n + 1);
      };
      return (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-start gap-3 flex-1">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <CalendarIcon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm flex-1">
                <span className="font-medium">{title}</span> {when} — open calendar?
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button size="sm" onClick={() => navigate("/calendar")} className="flex-1 sm:flex-initial">
                View
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  return null;
};