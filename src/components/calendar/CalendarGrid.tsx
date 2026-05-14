import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export const CalendarGrid = ({
  currentDate,
  events,
  onEventClick,
  onDateClick,
}: CalendarGridProps) => {
  const isMobile = useIsMobile();
  
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    
    events.forEach((event) => {
      const dateKey = format(parseISO(event.start), "yyyy-MM-dd");
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });

    return map;
  }, [events]);

  const weekDays = isMobile ? ["S", "M", "T", "W", "T", "F", "S"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Mobile: Agenda-style view for today and upcoming days with events
  if (isMobile) {
    const daysWithEvents = days
      .filter((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayEvents = eventsByDate.get(dateKey) || [];
        return dayEvents.length > 0 || isToday(day);
      })
      .slice(0, 14); // Show up to 14 days with events

    return (
      <div className="flex-1 flex flex-col space-y-2">
        {/* Compact calendar strip for mobile */}
        <div className="grid grid-cols-7 gap-1 p-2 bg-muted/30 rounded-lg">
          {weekDays.map((day, idx) => (
            <div key={idx} className="text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {days.slice(0, 35).map((day, index) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate.get(dateKey) || [];
            const hasEvents = dayEvents.length > 0;
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={index}
                onClick={() => onDateClick(day)}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-full text-xs cursor-pointer transition-colors min-h-[32px]",
                  isToday(day) && "bg-primary text-primary-foreground font-bold",
                  !isToday(day) && hasEvents && "bg-accent font-medium",
                  !isCurrentMonth && "text-muted-foreground opacity-50",
                  !isToday(day) && !hasEvents && "hover:bg-muted"
                )}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>

        {/* Agenda list for days with events */}
        <div className="space-y-3 px-1">
          {daysWithEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No upcoming events</p>
            </div>
          ) : (
            daysWithEvents.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateKey) || [];

              return (
                <div key={dateKey} className="space-y-2">
                  <div
                    onClick={() => onDateClick(day)}
                    className={cn(
                      "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer",
                      isToday(day) ? "bg-primary/10" : "bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 flex flex-col items-center justify-center rounded-lg",
                        isToday(day) && "bg-primary text-primary-foreground"
                      )}
                    >
                      <span className="text-xs font-medium">{format(day, "EEE")}</span>
                      <span className="text-lg font-bold leading-none">{format(day, "d")}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{format(day, "MMMM d, yyyy")}</span>
                      {dayEvents.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Events for this day */}
                  {dayEvents.filter((e) => e.calendarId !== "system").map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className="ml-4 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity min-h-[48px] flex items-center"
                      style={{
                        backgroundColor: event.color + "15",
                        borderLeft: `4px solid ${event.color}`,
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{event.title}</p>
                        {!event.allDay && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(parseISO(event.start), "h:mm a")}
                            {event.end && ` - ${format(parseISO(event.end), "h:mm a")}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {dayEvents.filter((e) => e.calendarId === "system").map((event) => (
                    <div
                      key={event.id}
                      className="ml-4 px-3 py-1.5 text-xs flex items-center gap-2 text-muted-foreground"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <span>{event.title}</span>
                    </div>
                  ))}

                  {dayEvents.length === 0 && isToday(day) && (
                    <div className="ml-4 p-3 text-sm text-muted-foreground">
                      No events today
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Desktop: Traditional grid view
  return (
    <div className="flex-1 flex flex-col">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={index}
              onClick={() => onDateClick(day)}
              className={cn(
                "min-h-[100px] border-b border-r p-1.5 cursor-pointer hover:bg-muted/50 transition-colors",
                !isCurrentMonth && "bg-muted/30",
                index % 7 === 0 && "border-l"
              )}
            >
              {/* Date number */}
              <div className="flex items-center gap-1 mb-1">
                <div
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm",
                    isToday(day) && "bg-primary text-primary-foreground font-bold",
                    !isCurrentMonth && "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
                <TooltipProvider delayDuration={100}>
                  <div className="flex items-center gap-0.5">
                    {dayEvents.filter((e) => e.calendarId === "system").slice(0, 3).map((sysEv) => (
                      <Tooltip key={sysEv.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: sysEv.color }}
                            aria-label={sysEv.title}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{sysEv.title}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </div>

              {/* Events */}
              <div className="space-y-1 overflow-hidden">
                {dayEvents.filter((e) => e.calendarId !== "system").slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="text-xs px-1.5 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: event.color + "20",
                      borderLeft: `3px solid ${event.color}`,
                    }}
                  >
                    {!event.allDay && (
                      <span className="font-medium mr-1">
                        {format(parseISO(event.start), "h:mm")}
                      </span>
                    )}
                    {event.title}
                  </div>
                ))}
                {dayEvents.filter((e) => e.calendarId !== "system").length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayEvents.filter((e) => e.calendarId !== "system").length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
