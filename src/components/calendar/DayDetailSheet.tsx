import { format, parseISO } from "date-fns";
import { useMemo } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { formatRecurrenceSummary } from "@/utils/recurrenceUtils";

interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export const DayDetailSheet = ({
  open,
  onOpenChange,
  date,
  events,
  onEventClick,
}: DayDetailSheetProps) => {
  const isMobile = useIsMobile();

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return parseISO(a.start).getTime() - parseISO(b.start).getTime();
    });
  }, [events]);

  const userEvents = sortedEvents.filter((e) => e.calendarId !== "system");
  const systemEvents = sortedEvents.filter((e) => e.calendarId === "system");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[80vh]" : "w-[320px] sm:max-w-[320px]"}
      >
        <SheetHeader>
          <SheetTitle className="text-base">
            {format(date, "EEEE, d MMMM")}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {sortedEvents.length} event{sortedEvents.length !== 1 ? "s" : ""}
          </p>
        </SheetHeader>

        <SheetBody>
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nothing scheduled</p>
          ) : (
            <div className="space-y-2 pb-4">
              {userEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick(event)}
                  className="w-full text-left p-3 rounded-lg hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: event.color + "15",
                    borderLeft: `3px solid ${event.color}`,
                  }}
                >
                  <p className="font-medium text-sm leading-snug">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.allDay
                      ? "All day"
                      : `${format(parseISO(event.start), "h:mm a")}${
                          event.end ? ` – ${format(parseISO(event.end), "h:mm a")}` : ""
                        }`}
                  </p>
                  {event.calendarOwner && (
                    <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {event.calendarOwner}
                    </span>
                  )}
                  {(event as any).recurrence && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      ↺ {formatRecurrenceSummary((event as any).recurrence)}
                    </p>
                  )}
                </button>
              ))}

              {systemEvents.length > 0 && userEvents.length > 0 && (
                <div className="h-px bg-border my-2" />
              )}

              {systemEvents.map((event) => (
                <div
                  key={event.id}
                  className="px-3 py-2 text-xs flex items-center gap-2 text-muted-foreground"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <span>{event.title}</span>
                </div>
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
